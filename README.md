# SmartPay — Pagamentos Inteligentes

MVP acadêmico da disciplina de Tecnologia Bancária.

## Objetivo
Demonstrar uma plataforma de pagamentos digitais com carteira de demonstração, APIs REST, autenticação e consentimento planejados para as próximas etapas, além de tokenização de demonstração em uma blockchain local.

> **Aviso:** esta versão não movimenta dinheiro real, não realiza Pix e não se conecta a bancos ou ao DREX. O saldo e o histórico da carteira são dados fictícios. O contrato SPAY será executado apenas em rede local de desenvolvimento.

## Estrutura
- `frontend/`: React + Vite.
- `backend/`: Node.js + Express, API REST.
- `blockchain/`: Solidity + Hardhat.
- `docs/`: arquitetura, decisões e planejamento.

## Requisitos
- Node.js 20 ou superior
- npm
- Git
- PostgreSQL será necessário quando a persistência for implementada. Não é exigido para executar o primeiro módulo.

## Executar o primeiro módulo

Abra três terminais na raiz do projeto.

### 1. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
API: `http://localhost:3001`
Verificação: `http://localhost:3001/api/health`
Carteira: `http://localhost:3001/api/wallet`

### 2. Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`.

### 3. Blockchain local (preparação)
```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat test
```

Para iniciar um nó local:
```bash
npx hardhat node
```
Em outro terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

## API inicial

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Estado da API |
| GET | `/api/wallet` | Carteira demonstrativa |
| GET | `/api/wallet/transactions` | Histórico demonstrativo |

## Variáveis de ambiente
Consulte os arquivos `.env.example`. Nunca publique arquivos `.env`, chaves privadas, senhas ou tokens.

## Segurança e dados
Esta etapa usa dados fictícios e não possui autenticação. Não use dados pessoais reais. Nas próximas etapas serão implementados autenticação, autorização, consentimento e persistência. Dados pessoais não devem ser gravados diretamente na blockchain.

## Próximas entregas
1. Persistência PostgreSQL e cadastro/login.
2. JWT, hash de senhas e controle de acesso.
3. Consentimento e revogação para fluxo Open Finance simulado.
4. Contrato SPAY e testes.
5. Cobrança e pagamento por QR Code.
6. Integração completa, documentação e demonstração.

## Equipe
Preencher os nomes e papéis dos quatro integrantes antes da entrega:
- Analista de Ecossistema: `Igor Zwang`
- Guardian de Dados: `Hellyson Frazão`
- Arquiteto Blockchain: `Luiz Felipe`
- Integrador: `Ryan Vieira`

## Licença
Projeto acadêmico para fins educacionais.
