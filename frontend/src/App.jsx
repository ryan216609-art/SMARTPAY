
import { useEffect, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Bell, ChevronRight, CircleHelp,
  Clock3, CreditCard, Eye, EyeOff, Landmark, LockKeyhole,
  RefreshCw, ShieldCheck, Wallet, Zap, LogOut, UserPlus
} from "lucide-react";

import {
  getHealth,
  getWallet,
  getTransactions,
  createDeposit,
  createTransfer,
  login,
  register,
  getMe,
  getToken,
  saveToken,
  clearToken
} from "./services/api";

const money = (value) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const date = (value) => {
  if (!value) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

export default function App() {
  const [activePage, setActivePage] = useState("overview");
  
  const [recipientEmail, setRecipientEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState("");
  const [transferError, setTransferError] = useState("");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");
  const [depositError, setDepositError] = useState("");
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [health, setHealth] = useState("loading");
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function loadDashboard() {
    try {
      setError("");

      const [healthData, walletData, transactionData] =
        await Promise.all([
          getHealth(),
          getWallet(),
          getTransactions()
        ]);

      setHealth(healthData.status);
      setWallet(walletData.data);
      setTransactions(transactionData.data || []);
    } catch (err) {
      setHealth("offline");
      setError(err.message || "Não foi possível carregar os dados.");
    }
  }

  async function checkSession() {
    if (!getToken()) return;

    try {
      const response = await getMe();
      setUser(response.user);
    } catch {
      clearToken();
      setUser(null);
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response =
        authMode === "login"
          ? await login(email, password)
          : await register(name, email, password);

      saveToken(response.token);
      setUser(response.user);
      setPassword("");
    } catch (err) {
      setError(err.message || "Não foi possível realizar a operação.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setWallet(null);
    setTransactions([]);
    setError("");
    setEmail("");
    setPassword("");
  }
  async function handleDeposit(event) {
  event.preventDefault();

  setDepositLoading(true);
  setDepositMessage("");
  setDepositError("");

  try {
    const amount = Number(depositAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Informe um valor válido para o depósito.");
    }

    await createDeposit(amount);

    setDepositMessage("Depósito realizado com sucesso!");
    setDepositAmount("");

    await loadDashboard();
  } catch (err) {
    setDepositError(err.message || "Não foi possível realizar o depósito.");
  } finally {
    setDepositLoading(false);
  }
}
async function handleTransfer(event) {
  event.preventDefault();

  setTransferLoading(true);
  setTransferMessage("");
  setTransferError("");

  try {
    const amount = Number(transferAmount);

    if (!recipientEmail.trim()) {
      throw new Error("Informe o e-mail do destinatário.");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Informe um valor válido para a transferência.");
    }

    await createTransfer(recipientEmail.trim(), amount);

    setTransferMessage("Transferência realizada com sucesso!");
    setRecipientEmail("");
    setTransferAmount("");

    await loadDashboard();
  } catch (err) {
    setTransferError(
      err.message || "Não foi possível realizar a transferência."
    );
  } finally {
    setTransferLoading(false);
  }
}

  const displayedTransactions = transactions.map((tx) => {
    const isDeposit = tx.transaction_type === "DEPOSIT";
    const isIncoming =
      isDeposit || tx.recipient_name === user?.name;

    return {
      ...tx,
      type: isIncoming ? "credit" : "debit",
      description: isDeposit
        ? "Depósito na carteira"
        : isIncoming
          ? `Transferência recebida de ${tx.sender_name || "Usuário"}`
          : `Transferência enviada para ${tx.recipient_name || "Usuário"}`
    };
  });

  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <div className="brand-mark">
              <Zap size={21} fill="currentColor" />
            </div>
            <span>smart<span>pay</span></span>
          </div>

          <span className="eyebrow">PAGAMENTOS INTELIGENTES</span>

          <h1>
            {authMode === "login"
              ? "Bem-vindo de volta!"
              : "Crie sua conta"}
          </h1>

          <p className="auth-description">
            {authMode === "login"
              ? "Acesse sua carteira digital SmartPay."
              : "Cadastre-se para começar a utilizar o SmartPay."}
          </p>

          {error && <div className="error-banner">{error}</div>}

          <form className="auth-form" onSubmit={handleAuth}>
            {authMode === "register" && (
              <label className="form-field">
                Nome completo
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome"
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
            )}

            <label className="form-field">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </label>

            <label className="form-field">
              Senha
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                minLength={8}
                required
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Aguarde..."
                : authMode === "login"
                  ? "Entrar na conta"
                  : "Criar conta"}
            </button>
          </form>

          <div className="auth-switch">
            {authMode === "login"
              ? "Ainda não possui uma conta?"
              : "Já possui uma conta?"}

            <button
              type="button"
              onClick={() => {
                setAuthMode(
                  authMode === "login" ? "register" : "login"
                );
                setError("");
              }}
            >
              {authMode === "login" ? "Cadastre-se" : "Fazer login"}
            </button>
          </div>

          <div className="auth-security">
            <ShieldCheck size={17} />
            Ambiente acadêmico de demonstração
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Zap size={21} fill="currentColor" />
          </div>
          <span>smart<span>pay</span></span>
        </div>

        <div className="workspace-label">MENU PRINCIPAL</div>

          <nav>
  <button
    className={`nav-item ${activePage === "overview" ? "active" : ""}`}
    onClick={() => setActivePage("overview")}
  >
    <Wallet size={18} />
    Visão geral
  </button>

  <button className="nav-item disabled" disabled>
    <CreditCard size={18} />
    Pagamentos
    <small>Em breve</small>
  </button>

  <button
    className={`nav-item ${activePage === "history" ? "active" : ""}`}
    onClick={() => setActivePage("history")}
  >
    <Clock3 size={18} />
    Histórico
  </button>
</nav>

        <div className="sidebar-bottom">
          <div className="security-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Ambiente de demonstração</strong>
              <span>Sem movimentação de dinheiro real.</span>
            </div>
          </div>

          <div className="profile">
            <div className="avatar">
              {user.name?.charAt(0).toUpperCase() || "SP"}
            </div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">PAINEL FINANCEIRO</span>
            <h1><h1>
  {activePage === "overview" ? "Visão geral" : "Histórico"}
</h1></h1>
          </div>

          <div className="top-actions">
            <span className={`api-status ${health === "ok" ? "online" : ""}`}>
              <i />
              API {health === "ok"
                ? "conectada"
                : health === "loading"
                  ? "conectando"
                  : "indisponível"}
            </span>
            <button className="icon-button" aria-label="Ajuda">
              <CircleHelp size={19} />
            </button>
            <button className="icon-button" aria-label="Notificações">
              <Bell size={19} />
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={loadDashboard}>Tentar novamente</button>
          </div>
        )}
      {activePage === "overview" ? (
        <>
        <section className="welcome-row">
          <div>
            <h2>
              Olá, {user.name.split(" ")[0]}! <span>✦</span>
            </h2>
            <p>
              Acompanhe sua carteira e suas movimentações em um só lugar.
            </p>
          </div>
          <div className="date-chip">
            <Clock3 size={15} /> Ambiente de teste
          </div>
        </section>

        <section className="summary-grid">
          <div className="balance-card">
            <div className="balance-top">
              <span><Wallet size={17} /> SALDO DISPONÍVEL</span>
              <button
                onClick={() => setVisible(!visible)}
                aria-label="Mostrar ou ocultar saldo"
              >
                {visible ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            <div className="balance-value">
              {wallet
                ? visible
                  ? `SPAY ${money(wallet.balance)}`
                  : "SPAY ••••••"
                : "Carregando..."}
            </div>

            <div className="balance-foot">
              <span className="balance-tag">
                <i /> Saldo demonstrativo
              </span>
              <span>1 SPAY = R$ 1,00*</span>
            </div>

            <div className="card-orb orb-one" />
            <div className="card-orb orb-two" />
          </div>

          <div className="info-card">
            <div className="info-icon purple">
              <Landmark size={20} />
            </div>
            <span className="info-label">TIPO DE CARTEIRA</span>
            <strong>Digital SPAY</strong>
            <p>Carteira de demonstração</p>
            <span className="info-link">
              Conta #{wallet?.id || "—"} <ChevronRight size={15} />
            </span>
          </div>

          <div className="info-card">
            <div className="info-icon green">
              <ShieldCheck size={20} />
            </div>
            <span className="info-label">STATUS DA CONEXÃO</span>
            <strong>{health === "ok" ? "Conectado" : "Verificando..."}</strong>
            <p>Comunicação via API REST</p>
            <button className="refresh-link" onClick={loadDashboard}>
              <RefreshCw size={14} /> Atualizar dados
            </button>
          </div>
        </section>
        
        <section className="panel deposit-panel">
          <div className="panel-heading">
            <div>
              <h3>Adicionar saldo</h3>
              <p>Deposite SPAY na sua carteira digital.</p>
            </div>
            <div className="info-icon green">
              <Wallet size={20} />
            </div>
          </div>

          <form className="deposit-form" onSubmit={handleDeposit}>
            <label className="form-field">
              Valor do depósito (SPAY)
              <input
                type="number"
                min="0.01"
                max="100000"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Ex.: 50,00"
                required
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={depositLoading}
            >
              {depositLoading ? "Processando..." : "Confirmar depósito"}
            </button>
          </form>

          {depositMessage && (
            <div className="deposit-success">
              <ShieldCheck size={17} />
              {depositMessage}
            </div>
          )}

          {depositError && (
            <div className="error-banner">
              {depositError}
            </div>
          )}

          <div className="notice">
            <ShieldCheck size={17} />
            <span>Operação simulada para fins acadêmicos. Não envolve dinheiro real.</span>
          </div>
        </section>

        <section className="panel transfer-panel">
          <div className="panel-heading">
            <div>
              <h3>Enviar SPAY</h3>
              <p>Transfira saldo para outra carteira SmartPay.</p>
            </div>
            <div className="info-icon purple">
              <ArrowUpRight size={20} />
            </div>
          </div>

          <form className="transfer-form" onSubmit={handleTransfer}>
            <label className="form-field">
              E-mail do destinatário
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="destino@smartpay.com"
                required
              />
            </label>

            <label className="form-field">
              Valor da transferência (SPAY)
              <input
                type="number"
                min="0.01"
                max="100000"
                step="0.01"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Ex.: 10,00"
                required
              />
            </label>

            <button
              className="primary-button"
              type="submit"
              disabled={transferLoading}
            >
              {transferLoading
                ? "Processando..."
                : "Confirmar transferência"}
            </button>
          </form>

          {transferMessage && (
            <div className="deposit-success">
              <ShieldCheck size={17} />
              {transferMessage}
            </div>
          )}

          {transferError && (
            <div className="error-banner">
              {transferError}
            </div>
          )}

          <div className="notice">
            <ShieldCheck size={17} />
            <span>
              Transferências simuladas entre usuários cadastrados no SmartPay.
              Não envolvem dinheiro real.
            </span>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel transactions-panel">
            <div className="panel-heading">
              <div>
                <h3>Movimentações recentes</h3>
                <p>Acompanhe as últimas atividades da carteira.</p>
              </div>
              <span className="text-button">
                {transactions.length} registros
              </span>
            </div>

            <div className="transaction-list">
              {displayedTransactions.map((tx) => (
                <div className="transaction" key={tx.id}>
                  <div className={`tx-icon ${tx.type}`}>
                    {tx.type === "credit"
                      ? <ArrowDownLeft size={19} />
                      : <ArrowUpRight size={19} />}
                  </div>

                  <div className="tx-description">
                    <strong>{tx.description}</strong>
                    <span>
                      {date(tx.created_at)} · #{tx.id}
                    </span>
                  </div>

                  <div className="tx-amount">
                    <strong className={tx.type}>
                      {tx.type === "credit" ? "+" : "−"} SPAY {money(tx.amount)}
                    </strong>
                    <span className="confirmed">
                      {tx.status === "COMPLETED"
                        ? "● Confirmada"
                        : tx.status}
                    </span>
                  </div>
                </div>
              ))}

              {!transactions.length && !error && (
                <p className="empty-state">
                  Nenhuma movimentação encontrada.
                </p>
              )}
            </div>
          </div>

          <div className="panel wallet-panel">
            <div className="panel-heading">
              <div>
                <h3>Dados da carteira</h3>
                <p>Identificação da sua conta</p>
              </div>
              <div className="mini-icon">
                <LockKeyhole size={17} />
              </div>
            </div>

            <div className="wallet-detail">
              <span>PROPRIETÁRIO</span>
              <strong>{user.name}</strong>
            </div>

            <div className="wallet-detail">
              <span>E-MAIL DA CONTA</span>
              <strong className="address">{user.email}</strong>
            </div>

            <div className="wallet-detail">
              <span>IDENTIFICAÇÃO DA CARTEIRA</span>
              <strong>#{wallet?.id || "—"}</strong>
            </div>

            <div className="wallet-detail">
              <span>ATIVO</span>
              <strong>
                {wallet?.currency || "SPAY"}
                <em>Token de demonstração</em>
              </strong>
            </div>

            <div className="notice">
              <ShieldCheck size={17} />
              <span>
                Seus dados são utilizados exclusivamente para fins
                acadêmicos. O saldo SPAY não representa dinheiro real.
              </span>
            </div>
          </div>
        </section>

        <footer>
          <span>© 2026 SmartPay. Projeto acadêmico de Tecnologia Bancária.</span>
          <span>* Paridade fictícia definida para demonstração.</span>
        </footer>
          </>
) : (
  <section className="panel history-page">
    <div className="panel-heading">
      <div>
        <h3>Histórico de transações</h3>
        <p>Consulte todas as movimentações da sua carteira.</p>
      </div>

      <span className="text-button">
        {transactions.length} registros
      </span>
    </div>

    <div className="transaction-list">
      {displayedTransactions.map((tx) => (
        <div className="transaction" key={tx.id}>
          <div className={`tx-icon ${tx.type}`}>
            {tx.type === "credit"
              ? <ArrowDownLeft size={19} />
              : <ArrowUpRight size={19} />}
          </div>

          <div className="tx-description">
            <strong>{tx.description}</strong>
            <span>
              Transação #{tx.id} · {date(tx.created_at)}
            </span>
          </div>

          <div className="tx-amount">
            <strong className={tx.type}>
              {tx.type === "credit" ? "+" : "−"} SPAY {money(tx.amount)}
            </strong>
            <span className="confirmed">
              {tx.status === "COMPLETED"
                ? "Confirmada"
                : tx.status}
            </span>
          </div>
        </div>
      ))}

      {!transactions.length && (
        <p className="empty-state">
          Nenhuma movimentação encontrada.
        </p>
      )}
    </div>
  </section>
)}
      </main>
    </div>
  );
}
