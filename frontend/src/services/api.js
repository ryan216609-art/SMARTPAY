
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const TOKEN_KEY = "smartpay_token";

// Recupera o token salvo no navegador
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Salva o token após o login
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Remove o token ao sair da conta
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Função central para comunicação com o backend
async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
  throw new Error(
    data.message ||
    data.error ||
    `Erro na API (${response.status})`
  );
}

  return data;
}

// Autenticação
export const login = (email, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (name, email, password) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const getMe = () => request("/auth/me");

// Carteira
export const getWallet = () => request("/account/wallet");

export const getTransactions = () =>
  request("/account/transactions");

// Movimentações
export const createDeposit = (amount) =>
  request("/account/deposits", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });

export const createTransfer = (recipientEmail, amount) =>
  request("/account/transfers", {
    method: "POST",
    body: JSON.stringify({ recipientEmail, amount }),
  });

// Saúde da API
export const getHealth = () => request("/health");
