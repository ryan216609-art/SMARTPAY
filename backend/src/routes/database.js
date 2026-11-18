
import { Router } from "express";
import pool from "../config/database.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, NOW() AS time"
    );

    res.json({
      status: "connected",
      message: "Conexão com PostgreSQL estabelecida!",
      database: result.rows[0].database,
      time: result.rows[0].time
    });
  } catch (error) {
    console.error("Erro na conexão com PostgreSQL:", error.message);

    res.status(500).json({
      status: "disconnected",
      message: "Não foi possível conectar ao banco de dados."
    });
  }
});

export default router;
