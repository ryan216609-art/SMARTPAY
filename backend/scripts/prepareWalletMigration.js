
import "dotenv/config";

import pool from "../src/config/database.js";
import { createUserWallet } from "../src/config/walletService.js";

async function prepareMigration() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(`
      SELECT
        w.id AS wallet_id,
        w.user_id,
        w.balance,
        w.blockchain_address,
        w.encrypted_private_key
      FROM wallets w
      ORDER BY w.id
      FOR UPDATE
    `);

    console.log(`Carteiras encontradas: ${result.rows.length}`);

    for (const wallet of result.rows) {
      const amount = Number(wallet.balance);

      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error(
          `Saldo inválido na carteira ${wallet.wallet_id}.`
        );
      }

      let address = wallet.blockchain_address;
      let encryptedPrivateKey = wallet.encrypted_private_key;

      // Cria uma carteira somente se ela ainda não existir.
      if (!address && !encryptedPrivateKey) {
        const newWallet = createUserWallet();

        address = newWallet.address;
        encryptedPrivateKey = newWallet.encryptedPrivateKey;

        await client.query(
          `UPDATE wallets
           SET blockchain_address = $1,
               encrypted_private_key = $2
           WHERE id = $3`,
          [address, encryptedPrivateKey, wallet.wallet_id]
        );
      } else if (!address || !encryptedPrivateKey) {
        throw new Error(
          `Carteira ${wallet.wallet_id} possui dados incompletos.`
        );
      }

      // Cria o registro de migração sem duplicar operações.
      const migration = await client.query(
        `INSERT INTO wallet_blockchain_migrations
          (wallet_id, amount, destination_address, status)
         VALUES ($1, $2, $3, 'PENDING')
         ON CONFLICT (wallet_id) DO NOTHING
         RETURNING id`,
        [wallet.wallet_id, amount, address]
      );

      // Confere se um registro anterior corresponde aos dados atuais.
      const existing = await client.query(
        `SELECT amount, destination_address, status
         FROM wallet_blockchain_migrations
         WHERE wallet_id = $1`,
        [wallet.wallet_id]
      );

      const saved = existing.rows[0];

      if (
        Number(saved.amount) !== amount ||
        saved.destination_address.toLowerCase() !== address.toLowerCase()
      ) {
        throw new Error(
          `Dados divergentes na migração da carteira ${wallet.wallet_id}.`
        );
      }

      console.log(
        `Usuário ${wallet.user_id}: ${amount} SPAY | ${address}`
      );

      if (migration.rowCount === 0) {
        console.log(`Registro de migração já existente: ${saved.status}`);
      } else {
        console.log("Registro de migração preparado.");
      }
    }

    await client.query("COMMIT");

    console.log("\nPreparação concluída com sucesso.");
    console.log("Nenhum token foi transferido.");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erro ao preparar migração:", error.message);

    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

prepareMigration().catch(() => {
  process.exitCode = 1;
});
