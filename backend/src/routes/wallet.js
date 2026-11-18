import { Router } from "express";
import { demoWallet, demoTransactions } from "../data/demoWallet.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    data: demoWallet,
    notice: "Carteira fictícia para demonstração acadêmica."
  });
});

router.get("/transactions", (_req, res) => {
  res.json({
    data: demoTransactions,
    total: demoTransactions.length,
    notice: "Movimentações fictícias; nenhuma operação financeira real ocorreu."
  });
});

export default router;
