# SmartPay — Pagamentos Inteligentes

MVP acadêmico desenvolvido para a disciplina de **Tecnologia Bancária**, com o objetivo de demonstrar conceitos de pagamentos digitais, carteiras virtuais, APIs REST e uso de blockchain em um ambiente controlado.

> **Aviso importante:** o SmartPay é exclusivamente demonstrativo. Não movimenta dinheiro real, não realiza Pix, não se conecta a instituições financeiras e não possui integração oficial com o Open Finance ou com o DREX. Os saldos e as transações apresentados são fictícios. A blockchain utilizada é uma rede local de desenvolvimento.

## 1. Informações do projeto

### 1.1 Nome
**SmartPay — Pagamentos Inteligentes**

### 1.2 Problema abordado
O projeto explora desafios presentes nos meios tradicionais de pagamento e na gestão de serviços financeiros, como a integração entre sistemas, a rastreabilidade das operações, a segurança das informações e a experiência do usuário.

A proposta é demonstrar, em escala acadêmica, como tecnologias atuais podem ser combinadas para representar um fluxo de pagamentos digitais com carteira demonstrativa, serviços de backend e registro de operações em blockchain.

### 1.3 Conceitos relacionados
- **Open Finance:** compartilhamento de dados e serviços financeiros mediante autorização do titular. No SmartPay, é uma referência conceitual para o fluxo de consentimento, sem conexão com o ecossistema oficial.
- **DREX:** moeda digital brasileira em desenvolvimento pelo Banco Central. É estudado como referência tecnológica, sem integração oficial no projeto.
- **Tokenização:** representação de um ativo ou unidade de valor por meio de um token digital. O projeto utiliza o token demonstrativo SPAY em ambiente local.
- **Blockchain e DLT:** tecnologias de registro distribuído que permitem registrar operações de forma rastreável.
- **APIs REST:** comunicação entre o frontend e os serviços do backend.

## 2. Equipe e responsabilidades

Os nomes e as funções definitivas deverão ser preenchidos pela equipe:

| Integrante | Responsabilidade |
|---|---|
| Participante 1 | "Função a definir" |
| Participante 2 | "Função a definir" |
| Participante 3 | "Função a definir" |
| Participante 4 | "Função a definir" |

## 3. Planejamento e execução

O desenvolvimento foi organizado em quatro fases, para separar os objetivos do projeto e facilitar a integração dos componentes.

### Fase 1 — Ecossistema
- Definição do problema e da proposta do SmartPay.
- Identificação dos conceitos bancários e tecnológicos relacionados.
- Planejamento dos componentes frontend, backend e blockchain.
- Definição do fluxo demonstrativo de usuários, carteiras e transferências.

### Fase 2 — Segurança
- Estruturação do cadastro e do login.
- Armazenamento de senhas com hash utilizando bcrypt.
- Autenticação por tokens JWT e proteção de rotas.
- Consideração dos princípios da LGPD, especialmente finalidade, necessidade, transparência e proteção dos dados.
- Planejamento conceitual de consentimento para representar um cenário inspirado em Open Finance.

### Fase 3 — Blockchain
- Desenvolvimento do componente blockchain com Solidity e Hardhat.
- Preparação do token demonstrativo SPAY.
- Execução e testes em rede local de desenvolvimento.
- Utilização do registro em blockchain como parte do fluxo demonstrativo de transferência.

### Fase 4 — Integração
- Comunicação entre frontend e backend por meio de APIs REST.
- Integração do backend com o banco de dados.
- Integração do fluxo de transferência com o serviço blockchain.
- Testes dos componentes e identificação de limitações para a demonstração acadêmica.

## 4. Arquitetura e decisões do projeto

O SmartPay utiliza uma arquitetura dividida em três componentes principais:

- **Frontend:** interface desenvolvida com React e Vite, responsável pela interação com o usuário.
- **Backend:** API desenvolvida com Node.js e Express, responsável pelas regras de negócio, autenticação, acesso ao banco de dados e coordenação das operações.
- **Blockchain:** contratos inteligentes desenvolvidos em Solidity e gerenciados com Hardhat, executados em ambiente local de desenvolvimento.

O PostgreSQL é utilizado para persistência dos dados da aplicação.

### 4.1 Regras de negócio e contratos inteligentes
As regras de negócio da aplicação são coordenadas pelo backend. O contrato inteligente e o token SPAY são utilizados para demonstrar o uso de blockchain e DLT no fluxo do projeto.

A arquitetura não é totalmente descentralizada: o backend e o banco de dados continuam centralizando parte importante da lógica e dos dados. A blockchain é um componente complementar da demonstração.

### 4.2 Segurança e LGPD
O projeto utiliza autenticação com JWT, hash de senhas com bcrypt e middleware para proteger rotas autenticadas. Também existem mecanismos de limitação de tentativas de cadastro e login.

As decisões de segurança consideram:
- Não armazenar senhas em texto puro.
- Restringir o acesso a rotas que exigem autenticação.
- Utilizar variáveis de ambiente para configurações sensíveis.
- Evitar publicar chaves privadas, tokens, senhas ou arquivos `.env`.
- Não registrar dados pessoais diretamente na blockchain, pois registros em blockchain podem ser difíceis de alterar ou remover.

**OAuth 2.0** é uma referência conceitual para os estudos de autorização e consentimento. Não deve ser considerado uma integração OAuth 2.0 completa implementada no MVP. Da mesma forma, o fluxo de consentimento inspirado em Open Finance não representa conexão com instituições participantes do sistema oficial.

### 4.3 APIs REST e integração
O frontend se comunica com o backend por meio de endpoints HTTP. O backend aplica as regras da aplicação e consulta ou atualiza os dados persistidos.

Entre as rotas utilizadas no projeto estão:
- `GET /api/health`: verificação do estado da API.
- Rotas de autenticação para cadastro, login e consulta do usuário autenticado.
- Rotas de carteira e histórico de transações.
- Rota de transferência demonstrativa.

A integração com a blockchain é realizada pelo serviço responsável pela execução da transferência. O fluxo precisa tratar estados intermediários e falhas de comunicação para evitar considerar uma operação concluída sem confirmação adequada.

### 4.4 Decisões de arquitetura
A separação entre frontend, backend e blockchain facilita o desenvolvimento e a manutenção dos módulos. O backend foi mantido como responsável pela coordenação das regras de negócio, enquanto a blockchain demonstra uma possibilidade de registro e tokenização.

Essa escolha reduz a complexidade do MVP e permite apresentar os conceitos sem exigir uma infraestrutura financeira real.

## 5. Riscos, desafios e viabilidade do MVP

### 5.1 Principais riscos
- Falhas de comunicação entre backend, banco de dados e blockchain.
- Diferenças entre o estado registrado no banco de dados e o resultado de uma operação na blockchain.
- Exposição indevida de credenciais ou variáveis de ambiente.
- Complexidade de integração de tecnologias diferentes.
- Limitações de uma rede blockchain local em comparação com uma rede real.

### 5.2 Cuidados no fluxo de transferência
Uma transferência pode passar por estados intermediários, como pendente, concluída ou com falha. Por isso, o sistema precisa considerar situações em que a chamada à blockchain não retorna uma confirmação definitiva.

O estado da operação deve ser tratado com cautela: uma falha de comunicação não significa necessariamente que a transação não foi executada. O fluxo completo deve ser validado por testes de integração antes de qualquer apresentação como concluído.

### 5.3 Viabilidade
O escopo foi limitado a um MVP acadêmico para tornar possível demonstrar os conceitos centrais com ferramentas acessíveis e ambiente local. A solução não possui os requisitos de segurança, auditoria, disponibilidade, conformidade regulatória ou integração necessários para operar como um serviço financeiro real.

## 6. Tecnologias utilizadas

| Componente | Tecnologias |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Banco de dados | PostgreSQL |
| Autenticação | JWT, bcrypt |
| Blockchain | Solidity, Hardhat |
| Comunicação | APIs REST |

## 7. Estrutura do repositório

```text
SMARTPAY/
├── backend/       # API, regras de negócio e integração com o banco
├── frontend/      # Interface da aplicação
├── blockchain/    # Contratos inteligentes e testes locais
└── docs/          # Documentação, arquitetura e planejamento
```

## 8. Requisitos e execução

### 8.1 Pré-requisitos
- Node.js 20 ou superior.
- npm.
- PostgreSQL.
- Git.

### 8.2 Configuração
Configure as variáveis de ambiente a partir dos arquivos `.env.example` de cada módulo. Ajuste as configurações de banco de dados e os endereços dos serviços conforme o ambiente local.

**Nunca compartilhe ou publique arquivos `.env`, senhas, tokens ou chaves privadas.**

### 8.3 Backend
No terminal, entre na pasta do backend, instale as dependências e execute o script de desenvolvimento definido no `package.json`:

```bash
cd backend
npm install
npm run dev
```

### 8.4 Frontend
Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra no navegador o endereço local informado pelo Vite.

### 8.5 Blockchain local
Em outro terminal:

```bash
cd blockchain
npm install
npx hardhat compile
npx hardhat test
```

Para iniciar um nó local, quando necessário:

```bash
npx hardhat node
```

A implantação dos contratos deve utilizar a configuração e os scripts existentes no módulo `blockchain`.

> Os comandos e as variáveis de ambiente podem exigir ajustes conforme os scripts e configurações presentes em cada módulo do repositório.

## 9. Limitações e escopo atual

- O SmartPay é um protótipo acadêmico e demonstrativo.
- Não movimenta dinheiro real e não realiza Pix.
- Não possui integração com bancos ou instituições financeiras.
- Não possui integração oficial com Open Finance ou DREX.
- O token SPAY é utilizado apenas para demonstração em ambiente local.
- O backend permanece centralizado; portanto, o sistema não é totalmente descentralizado.
- A aplicação não deve receber dados financeiros ou pessoais reais.
- O projeto não está preparado para uso em produção.

## 10. Objetivo acadêmico

O SmartPay busca demonstrar a aplicação integrada de conceitos de tecnologia bancária, desenvolvimento web, segurança da informação, APIs REST, banco de dados e blockchain. O resultado esperado é um MVP que permita compreender a arquitetura e os desafios de integração dessas tecnologias, respeitando as limitações de um ambiente acadêmico.

---

**Projeto acadêmico — Tecnologia Bancária.**