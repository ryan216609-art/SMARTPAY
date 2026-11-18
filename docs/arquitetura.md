# Arquitetura inicial

## Visão geral
O frontend React consome a API REST do backend Express. Nesta primeira entrega, o backend retorna uma carteira e movimentações fictícias. A camada blockchain é mantida como projeto separado e terá seu contrato SPAY implantado em uma rede Hardhat local.

## Responsabilidades
- Frontend: apresentação e interação; não contém regras financeiras autoritativas.
- Backend: validações, regras de negócio e coordenação das integrações.
- Banco de dados (etapa futura): usuários, consentimentos e histórico operacional.
- Blockchain: registro de transferências de tokens de demonstração.
- Smart contract: regras on-chain do token.

## Decisão de arquitetura
A interface não acessa diretamente o banco de dados nem deve conter chaves privadas. A comunicação ocorre por HTTP/JSON com o backend. Segredos e configurações são fornecidos por variáveis de ambiente.

## Limitações atuais
O primeiro módulo não implementa autenticação, persistência, Open Finance real, Pix ou integração DREX. Os dados da carteira são estáticos e explicitamente demonstrativos.
