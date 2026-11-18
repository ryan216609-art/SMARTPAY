
import "dotenv/config";

import {
  parseUnits,
  keccak256,
  Transaction,
  getAddress,
  Interface
} from "ethers";

import pool from "../src/config/database.js";
import {
  provider,
  signer,
  spayToken
} from "../src/config/blockchain.js";

const CONTRACT_ADDRESS = getAddress(
  process.env.SPAY_CONTRACT_ADDRESS
);

const EXPECTED_CHAIN_ID = 31337n;
const ADVISORY_LOCK_ID = 8675309;

const transferInterface = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)"
]);

async function executeMigration() {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    const lock = await client.query(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [ADVISORY_LOCK_ID]
    );

    lockAcquired = lock.rows[0].acquired;

    if (!lockAcquired) {
      throw new Error("Outra migração já está em execução.");
    }

    const network = await provider.getNetwork();

    if (network.chainId !== EXPECTED_CHAIN_ID) {
      throw new Error("Rede incorreta. Esperada: Hardhat local.");
    }

    const decimals = Number(await spayToken.decimals());
    const symbol = await spayToken.symbol();

    if (symbol !== "SPAY" || decimals !== 18) {
      throw new Error("Contrato ou configuração do token inválidos.");
    }

    console.log("Rede Hardhat validada.");
    console.log("Proprietário:", signer.address);
    console.log("Token:", symbol);

    const result = await client.query(`
      SELECT
        m.id,
        m.wallet_id,
        m.amount,
        m.destination_address,
        m.status,
        m.transaction_hash,
        m.signed_transaction,
        w.blockchain_address,
        w.blockchain_migrated_at
      FROM wallet_blockchain_migrations m
      INNER JOIN wallets w ON w.id = m.wallet_id
      WHERE m.status IN ('PENDING', 'SUBMITTED')
      ORDER BY m.wallet_id
    `);

    console.log("Operações encontradas:", result.rows.length);

    for (const migration of result.rows) {
      console.log(`\nCarteira ${migration.wallet_id}`);
      console.log("Valor:", migration.amount, symbol);

      const destination = getAddress(
        migration.destination_address
      );

      if (
        destination !== getAddress(migration.blockchain_address)
      ) {
        throw new Error("Endereço de destino divergente.");
      }

      if (migration.blockchain_migrated_at) {
        throw new Error(
          "Carteira já marcada como migrada. Confira manualmente."
        );
      }

      const amount = parseUnits(
        String(migration.amount),
        decimals
      );

      let rawTransaction = migration.signed_transaction;
      let transactionHash = migration.transaction_hash;

      if (!rawTransaction) {
        if (migration.status !== "PENDING") {
          throw new Error(
            "Operação SUBMITTED sem transação assinada."
          );
        }

        const ownerBalance = await spayToken.balanceOf(
          signer.address
        );

        if (ownerBalance < amount) {
          throw new Error("Saldo insuficiente na carteira proprietária.");
        }

        const data = spayToken.interface.encodeFunctionData(
          "transfer",
          [destination, amount]
        );

        const populated = await signer.populateTransaction({
          to: CONTRACT_ADDRESS,
          data,
          value: 0n
        });

        rawTransaction = await signer.signTransaction(populated);
        transactionHash = keccak256(rawTransaction);

        const saved = await client.query(
          `UPDATE wallet_blockchain_migrations
           SET signed_transaction = $1,
               transaction_hash = $2,
               nonce = $3,
               chain_id = $4,
               status = 'SUBMITTED',
               updated_at = NOW(),
               error_message = NULL
           WHERE id = $5
             AND status = 'PENDING'
             AND signed_transaction IS NULL`,
          [
            rawTransaction,
            transactionHash,
            populated.nonce,
            Number(network.chainId),
            migration.id
          ]
        );

        if (saved.rowCount !== 1) {
          throw new Error(
            "Não foi possível salvar a transação assinada."
          );
        }

        console.log("Transação assinada e salva no PostgreSQL.");
      }

      // Confere os dados da transação antes de transmiti-la.
      const signed = Transaction.from(rawTransaction);

      if (
        !signed.hash ||
        signed.hash.toLowerCase() !== transactionHash.toLowerCase() ||
        signed.from?.toLowerCase() !== signer.address.toLowerCase() ||
        signed.to?.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase() ||
        signed.chainId !== EXPECTED_CHAIN_ID
      ) {
        throw new Error("Transação assinada inválida ou divergente.");
      }

      const decoded = spayToken.interface.decodeFunctionData(
        "transfer",
        signed.data
      );

      if (
        getAddress(decoded[0]) !== destination ||
        decoded[1] !== amount
      ) {
        throw new Error("Destino ou valor da transação divergente.");
      }

      // Consulta primeiro se a transação já foi confirmada.
      let receipt = await provider.getTransactionReceipt(
        transactionHash
      );

      if (!receipt) {
        try {
          await provider.broadcastTransaction(rawTransaction);
        } catch (error) {
          console.log(
            "Aviso no envio:",
            error.shortMessage || error.message
          );
        }

        receipt = await provider.waitForTransaction(
          transactionHash,
          1,
          30000
        );
      }

      if (!receipt) {
        console.log(
          "Sem confirmação. Operação permanece SUBMITTED."
        );
        continue;
      }

      if (receipt.status !== 1) {
        await client.query(
          `UPDATE wallet_blockchain_migrations
           SET status = 'FAILED',
               error_message = 'Transação revertida na blockchain.',
               updated_at = NOW()
           WHERE id = $1
             AND status = 'SUBMITTED'`,
          [migration.id]
        );

        console.log("Transação revertida.");
        continue;
      }

      // Confirma o evento Transfer específico desta operação.
      const transferEvent = receipt.logs
        .filter(
          (log) =>
            log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
        )
        .map((log) => {
          try {
            return transferInterface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(
          (event) =>
            event &&
            getAddress(event.args.from) === getAddress(signer.address) &&
            getAddress(event.args.to) === destination &&
            event.args.value === amount
        );

      if (!transferEvent) {
        throw new Error(
          "Evento Transfer correspondente não encontrado."
        );
      }

      // Registra a confirmação no PostgreSQL.
      await client.query("BEGIN");

      try {
        const updated = await client.query(
          `UPDATE wallet_blockchain_migrations
           SET status = 'COMPLETED',
               completed_at = NOW(),
               updated_at = NOW(),
               error_message = NULL
           WHERE id = $1
             AND status = 'SUBMITTED'`,
          [migration.id]
        );

        if (updated.rowCount !== 1) {
          throw new Error(
            "Não foi possível atualizar o registro da migração."
          );
        }

        await client.query(
          `UPDATE wallets
           SET blockchain_migrated_at = NOW(),
               blockchain_migration_hash = $1
           WHERE id = $2`,
          [transactionHash, migration.wallet_id]
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }

      console.log("Migração confirmada!");
      console.log("Hash:", transactionHash);
    }

    console.log("\nProcessamento finalizado.");
  } finally {
    if (lockAcquired) {
      await client.query(
        "SELECT pg_advisory_unlock($1)",
        [ADVISORY_LOCK_ID]
      );
    }

    client.release();
    await pool.end();
  }
}

executeMigration().catch((error) => {
  console.error("\nErro na migração:", error.message);
  process.exitCode = 1;
});
