
import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Limite de tentativas de cadastro
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de cadastro. Tente novamente em 15 minutos."
  }
});

// Limite de tentativas de login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas de login. Tente novamente em 15 minutos."
  }
});

// Validação básica de e-mail
function isValidEmail(email) {
  return (
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

// Geração do token JWT
function generateToken(user) {
  return jwt.sign(
    {
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      subject: String(user.id),
      expiresIn: process.env.JWT_EXPIRES_IN || "2h"
    }
  );
}

// CADASTRO
router.post("/register", registerLimiter, async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      error: "Informe nome, e-mail e senha válidos."
    });
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (
    normalizedName.length < 2 ||
    normalizedName.length > 80 ||
    !isValidEmail(normalizedEmail) ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      error: "Verifique o nome, o e-mail e a senha. A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes."
    });
  }

  let client;
  let transactionStarted = false;

  try {
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [normalizedName, normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO wallets (user_id, balance, currency)
       VALUES ($1, 0, 'SPAY')`,
      [user.id]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    const token = generateToken(user);

    return res.status(201).json({
      message: "Usuário cadastrado com sucesso!",
      user,
      token
    });

  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Erro no rollback:", rollbackError.message);
      }
    }

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Este e-mail já está cadastrado."
      });
    }

    console.error("Erro no cadastro:", error.message);

    return res.status(500).json({
      error: "Não foi possível realizar o cadastro."
    });

  } finally {
    client?.release();
  }
});

// LOGIN
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    return res.status(400).json({
      error: "Informe um e-mail e uma senha válidos."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({
      error: "Formato de e-mail inválido."
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });
    }

    const token = generateToken(user);

    return res.json({
      message: "Login realizado com sucesso!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error("Erro no login:", error.message);

    return res.status(500).json({
      error: "Não foi possível realizar o login."
    });
  }
});

// USUÁRIO AUTENTICADO
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "Usuário não encontrado."
      });
    }

    return res.json({
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Erro ao consultar usuário:", error.message);

    return res.status(500).json({
      error: "Não foi possível consultar o usuário."
    });
  }
});

export default router;
