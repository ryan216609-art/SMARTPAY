
import { Router } from "express";
import pool from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";
import { executeBlockchainTransfer } from "../services/transferService.js";
const router = Router();

// Todas as rotas deste arquivo exigem autenticação.
router.use(authenticateToken);

// CONSULTAR CARTEIRA E SALDO
router.get("/wallet", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         user_id,
         balance,
         currency,
         created_at
       FROM wallets
       WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Carteira não encontrada."
      });
    }

    return res.json({
      message: "Carteira consultada com sucesso!",
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Erro ao consultar carteira:", error.message);

    return res.status(500).json({
      error: "Não foi possível consultar a carteira."
    });
  }
});

// CONSULTAR HISTÓRICO DE TRANSAÇÕES
router.get("/transactions", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         t.id,
         t.transaction_type,
         t.amount,
         t.status,
         t.blockchain_hash,
         t.created_at,
         sender.name AS sender_name,
         recipient.name AS recipient_name
       FROM transactions t
       LEFT JOIN wallets source_wallet
         ON source_wallet.id = t.from_wallet_id
       LEFT JOIN users sender
         ON sender.id = source_wallet.user_id
       LEFT JOIN wallets destination_wallet
         ON destination_wallet.id = t.to_wallet_id
       LEFT JOIN users recipient
         ON recipient.id = destination_wallet.user_id
       WHERE source_wallet.user_id = $1
          OR destination_wallet.user_id = $1
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    return res.json({
      message: "Histórico consultado com sucesso!",
      total: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error("Erro ao consultar transações:", error.message);

    return res.status(500).json({
      error: "Não foi possível consultar o histórico."
    });
  }
});


 // DEPÓSITO SIMULADO DE SPAY
router.post("/deposits", async (req, res) => {
  const { amount } = req.body;

  // Validar o valor recebido
  if (
    (typeof amount !== "number" && typeof amount !== "string") ||
    !/^\d{1,6}(\.\d{1,2})?$/.test(String(amount)) ||
    Number(amount) <= 0 ||
    Number(amount) > 100000
  ) {
    return res.status(400).json({
      error: "Informe um valor entre 0,01 e 100.000,00 SPAY, com até duas casas decimais."
    });
  }

  let client;
let transactionStarted = false;

try {
  client = await pool.connect();

  await client.query("BEGIN");
  transactionStarted = true;

    // Localizar e bloquear a carteira do usuário
    const walletResult = await client.query(
      `SELECT id, balance, currency
       FROM wallets
       WHERE user_id = $1
       FOR UPDATE`,
      [req.user.id]
    );

    if (walletResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Carteira não encontrada."
      });
    }

    const wallet = walletResult.rows[0];

    // Creditar o valor na carteira
    const updatedWallet = await client.query(
      `UPDATE wallets
       SET balance = balance + $1
       WHERE id = $2
       RETURNING id, user_id, balance, currency`,
      [String(amount), wallet.id]
    );

    // Registrar o depósito no histórico
    const transactionResult = await client.query(
      `INSERT INTO transactions (
         to_wallet_id,
         amount,
         transaction_type,
         status
       )
       VALUES ($1, $2, 'DEPOSIT', 'COMPLETED')
       RETURNING id, amount, transaction_type, status, created_at`,
      [wallet.id, String(amount)]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "Depósito simulado realizado com sucesso!",
      notice: "Este crédito é fictício e não representa movimentação de dinheiro real.",
      wallet: updatedWallet.rows[0],
      transaction: transactionResult.rows[0]
    });

  }   catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Erro no rollback:", rollbackError.message);
      }
    }

    console.error("Erro no depósito:", error.message);

    return res.status(500).json({
      error: "Não foi possível realizar o depósito."
    });

  } finally {
    client?.release();
  }
});



router.post("/transfers", async (req, res) => {
  const { recipientEmail, amount } = req.body ?? {};
  
  console.log("[TRANSFERÊNCIA] Requisição recebida:", {
    userId: req.user?.id,
    recipientEmail,
    amount
  });
  const normalizedEmail =
    typeof recipientEmail === "string"
      ? recipientEmail.trim().toLowerCase()
      : "";

  const validAmount =
    (typeof amount === "number" || typeof amount === "string") &&
    /^\d{1,6}(\.\d{1,2})?$/.test(String(amount)) &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    Number(amount) <= 100000;

  if (
    !normalizedEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    !validAmount
  ) {
    return res.status(400).json({
      message: "Informe um e-mail válido e um valor entre 0,01 e 100000 SPAY, com até duas casas decimais."
    });
  }

  let client;
  let transactionStarted = false;
  let transactionId = null;

  try {
    // ETAPA 1: validar e registrar a transferência como PENDING.
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    const recipientResult = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (recipientResult.rows.length === 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        message: "Destinatário não encontrado."
      });
    }

    const senderId = req.user.id;
    const recipientId = recipientResult.rows[0].id;

    if (String(senderId) === String(recipientId)) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: "Não é possível transferir para sua própria conta."
      });
    }

    const walletsResult = await client.query(
      `SELECT id, user_id, balance
       FROM wallets
       WHERE user_id IN ($1, $2)
       ORDER BY id
       FOR UPDATE`,
      [senderId, recipientId]
    );

    if (walletsResult.rows.length !== 2) {
      throw new Error("Carteira não encontrada.");
    }

    const senderWallet = walletsResult.rows.find(
      wallet => String(wallet.user_id) === String(senderId)
    );

    const recipientWallet = walletsResult.rows.find(
      wallet => String(wallet.user_id) === String(recipientId)
    );

    if (!senderWallet || !recipientWallet) {
      throw new Error("Carteira não encontrada.");
    }

    // Impedir outra transferência enquanto existir uma pendente.
    const pendingResult = await client.query(
      `SELECT id
       FROM transactions
       WHERE from_wallet_id = $1
         AND transaction_type = 'TRANSFER'
         AND status = 'PENDING'
       LIMIT 1`,
      [senderWallet.id]
    );

    if (pendingResult.rows.length > 0) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        message: "Você possui uma transferência pendente. Aguarde sua confirmação antes de enviar outra."
      });
    }

    const balanceResult = await client.query(
      `SELECT balance >= $1::numeric AS sufficient
       FROM wallets
       WHERE id = $2`,
      [String(amount), senderWallet.id]
    );

    if (!balanceResult.rows[0]?.sufficient) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        message: "Saldo insuficiente."
      });
    }

    // Registrar sem movimentar os saldos ainda.
    const transactionResult = await client.query(
      `INSERT INTO transactions (
         from_wallet_id,
         to_wallet_id,
         amount,
         transaction_type,
         status
       )
       VALUES ($1, $2, $3, 'TRANSFER', 'PENDING')
       RETURNING id`,
      [
        senderWallet.id,
        recipientWallet.id,
        String(amount)
      ]
    );

    transactionId = transactionResult.rows[0].id;

    await client.query("COMMIT");
    transactionStarted = false;

    client.release();
    client = null;

    // ETAPA 2: executar a transferência na blockchain.
    const blockchainResult = await executeBlockchainTransfer({
      transactionId,
      senderWalletId: senderWallet.id,
      recipientWalletId: recipientWallet.id,
      amount: String(amount)
    });

    // ETAPA 3: após confirmação, atualizar os saldos no PostgreSQL.
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    const currentTransaction = await client.query(
      `SELECT id, status
       FROM transactions
       WHERE id = $1
       FOR UPDATE`,
      [transactionId]
    );

    if (
      currentTransaction.rows.length === 0 ||
      currentTransaction.rows[0].status !== "PENDING"
    ) {
      throw new Error(
        "Não foi possível finalizar o registro da transferência."
      );
    }

    await client.query(
      `SELECT id
       FROM wallets
       WHERE id IN ($1, $2)
       ORDER BY id
       FOR UPDATE`,
      [senderWallet.id, recipientWallet.id]
    );

    const finalBalance = await client.query(
      `SELECT balance >= $1::numeric AS sufficient
       FROM wallets
       WHERE id = $2`,
      [String(amount), senderWallet.id]
    );

    if (!finalBalance.rows[0]?.sufficient) {
      throw new Error(
        "Transferência confirmada na blockchain, mas o saldo local precisa de reconciliação."
      );
    }

    await client.query(
      `UPDATE wallets
       SET balance = balance - $1
       WHERE id = $2`,
      [String(amount), senderWallet.id]
    );

    await client.query(
      `UPDATE wallets
       SET balance = balance + $1
       WHERE id = $2`,
      [String(amount), recipientWallet.id]
    );

    const completedResult = await client.query(
      `UPDATE transactions
       SET status = 'COMPLETED'
       WHERE id = $1
         AND status = 'PENDING'
       RETURNING *`,
      [transactionId]
    );

    if (completedResult.rows.length === 0) {
      throw new Error(
        "Não foi possível atualizar o status da transferência."
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      message: "Transferência confirmada com sucesso!",
      transaction: completedResult.rows[0],
      blockchain: {
        hash: blockchainResult.transactionHash,
        blockNumber: blockchainResult.blockNumber,
        senderAddress: blockchainResult.senderAddress,
        recipientAddress: blockchainResult.recipientAddress
      }
    });

  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Erro no rollback:", rollbackError.message);
      }

      transactionStarted = false;
    }

    // Só marcar FAILED quando houver falha definitiva.
    if (transactionId && error.definitiveFailure === true) {
      try {
        await pool.query(
          `UPDATE transactions
           SET status = 'FAILED'
           WHERE id = $1
             AND status = 'PENDING'`,
          [transactionId]
        );
      } catch (updateError) {
        console.error(
          "Erro ao atualizar status da transferência:",
          updateError.message
        );
      }
    }

    console.error(
      "Erro na transferência:",
      error.message
    );

    if (transactionId) {
      if (error.definitiveFailure === true) {
        return res.status(400).json({
          message: error.message,
          transactionId,
          status: "FAILED"
        });
      }

      return res.status(503).json({
        message: "A transferência não foi finalizada. Ela pode continuar pendente; consulte o histórico antes de tentar novamente.",
        transactionId,
        status: "PENDING"
      });
    }

    return res.status(500).json({
      message: "Erro interno ao iniciar a transferência."
    });

  } finally {
    client?.release();
  }
});


export default router;