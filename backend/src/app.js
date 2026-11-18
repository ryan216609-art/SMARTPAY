import express from "express";
import databaseRoutes from "./routes/database.js";
import cors from "cors";
import healthRoutes from "./routes/health.js";
import walletRoutes from "./routes/wallet.js";
import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/account.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
// Proteção dos cabeçalhos HTTP
app.use(helmet());

// Limitação geral de requisições
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Muitas requisições. Tente novamente em alguns minutos."
  }
});

app.use(limiter);

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ name: "SmartPay API", docs: "Consulte /api/health" });
});

app.use("/api/health", healthRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/database", databaseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/account", accountRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

export default app;
