
import {
  Wallet,
  Contract,
  parseUnits,
  formatUnits,
  keccak256,
  Transaction
} from "ethers";

import pool from "../config/database.js";
import {
  provider,
  CONTRACT_ADDRESS,
  SPAY_ABI
} from "../config/blockchain.js";

import { decryptPrivateKey } from "../config/walletService.js";

const tokenInterface = new Contract(
  CONTRACT_ADDRESS,
  SPAY_ABI,
  provider
);

export async function executeBlockchainTransfer({
  transactionId,
  senderWalletId,
  recipientWalletId,
  amount
}) {
    const client = await pool.connect();
  let etapa = "inicialização";

  try {
    const walletsResult = await client.query(
      `SELECT
         id,
         user_id,
         blockchain_address,
         encrypted_private_key
       FROM wallets
       WHERE id IN ($1, $2)
       ORDER BY id`,
      [senderWalletId, recipientWalletId]
    );

    if (walletsResult.rows.length !== 2) {
      throw new Error("Carteiras não encontradas.");
    }

    const senderWallet = walletsResult.rows.find(
      wallet => String(wallet.id) === String(senderWalletId)
    );

    const recipientWallet = walletsResult.rows.find(
      wallet => String(wallet.id) === String(recipientWalletId)
    );

    if (
      !senderWallet?.blockchain_address ||
      !senderWallet?.encrypted_private_key ||
      !recipientWallet?.blockchain_address
    ) {
      throw new Error("Dados blockchain das carteiras incompletos.");
    }

    const privateKey = decryptPrivateKey(
      senderWallet.encrypted_private_key
    );

    const sender = new Wallet(privateKey, provider);

    if (
      sender.address.toLowerCase() !==
      senderWallet.blockchain_address.toLowerCase()
    ) {
      throw new Error("A chave privada não corresponde à carteira cadastrada.");
    }

    const amountUnits = parseUnits(String(amount), 18);

    const blockchainBalance = await tokenInterface.balanceOf(
      sender.address
    );

    if (blockchainBalance < amountUnits) {
      throw new Error("Saldo SPAY insuficiente na blockchain.");
    }

    const gasBalance = await provider.getBalance(sender.address);

    if (gasBalance === 0n) {
      throw new Error("A carteira não possui ETH para pagar o gas.");
    }

    const token = new Contract(
      CONTRACT_ADDRESS,
      SPAY_ABI,
      sender
    );

    const transferData = token.interface.encodeFunctionData(
      "transfer",
      [recipientWallet.blockchain_address, amountUnits]
    );

    const feeData = await provider.getFeeData();

    const nonce = await provider.getTransactionCount(
      sender.address,
      "pending"
    );

    const transactionRequest = {
      to: CONTRACT_ADDRESS,
      data: transferData,
      value: 0n,
      nonce,
      chainId: (await provider.getNetwork()).chainId,
      gasLimit: await token.transfer.estimateGas(
        recipientWallet.blockchain_address,
        amountUnits
      ),
      ...(feeData.maxFeePerGas && feeData.maxPriorityFeePerGas
        ? {
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
          }
        : {
            gasPrice: feeData.gasPrice
          })
    };

    const signedTransaction = await sender.signTransaction(
      transactionRequest
    );

    const transactionHash = keccak256(signedTransaction);

    const parsedTransaction = Transaction.from(signedTransaction);

    if (
      parsedTransaction.from?.toLowerCase() !== sender.address.toLowerCase()
    ) {
      throw new Error("Assinatura da transação inválida.");
    }

    const saveResult = await client.query(
      `UPDATE transactions
       SET signed_transaction = $1,
           blockchain_hash = $2,
           nonce = $3,
           chain_id = $4
       WHERE id = $5
         AND status = 'PENDING'
       RETURNING id`,
      [
        signedTransaction,
        transactionHash,
        nonce,
        Number(transactionRequest.chainId),
        transactionId
      ]
    );

    if (saveResult.rows.length === 0) {
      throw new Error("Não foi possível registrar a transação pendente.");
    }

    const existingTransaction = await provider.getTransactionReceipt(
      transactionHash
    );

    if (!existingTransaction) {
      await provider.broadcastTransaction(signedTransaction);
    }

    const receipt = await provider.waitForTransaction(
      transactionHash,
      1,
      120000
    );

    if (!receipt || receipt.status !== 1) {
      throw new Error("A transferência não foi confirmada pela blockchain.");
    }

    const transferEvent = receipt.logs
      .map(log => {
        try {
          return token.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find(event =>
        event?.name === "Transfer" &&
        event.args.from.toLowerCase() === sender.address.toLowerCase() &&
        event.args.to.toLowerCase() ===
          recipientWallet.blockchain_address.toLowerCase() &&
        event.args.value === amountUnits
      );

    if (!transferEvent) {
      throw new Error("Evento Transfer não encontrado na blockchain.");
    }

    return {
      transactionHash,
      blockNumber: receipt.blockNumber,
      amount: formatUnits(amountUnits, 18),
      senderAddress: sender.address,
      recipientAddress: recipientWallet.blockchain_address
    };

   } catch (error) {
    console.error("[TRANSFERÊNCIA BLOCKCHAIN] Falha na etapa:", etapa);
    console.error("[TRANSFERÊNCIA BLOCKCHAIN] Erro:", error);
    throw error;
  } finally {
    client.release();
  }
}
