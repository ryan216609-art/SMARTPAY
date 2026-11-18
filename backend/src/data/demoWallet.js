export const demoWallet = {
  id: "wallet-demo-001",
  owner: "Usuário SmartPay",
  address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  currency: "SPAY",
  balance: 250.00,
  environment: "DEMO"
};

export const demoTransactions = [
  {
    id: "TX-DEMO-003",
    description: "Crédito inicial demonstrativo",
    type: "credit",
    amount: 250.00,
    status: "CONFIRMED",
    date: "2026-11-18T10:00:00.000Z"
  },
  {
    id: "TX-DEMO-002",
    description: "Pagamento de demonstração",
    type: "debit",
    amount: 35.00,
    status: "CONFIRMED",
    date: "2026-11-17T14:30:00.000Z"
  },
  {
    id: "TX-DEMO-001",
    description: "Crédito de teste",
    type: "credit",
    amount: 35.00,
    status: "CONFIRMED",
    date: "2026-11-17T12:00:00.000Z"
  }
];
