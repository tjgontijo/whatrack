# Library Directory (`src/lib`)

Este diretório contém a camada de **Infraestrutura**, **Utilitários agnósticos** e **Clientes de serviços externos**. 

## Diretrizes de Uso
1. **Agnóstico ao Domínio:** Os arquivos aqui não devem conter regras de negócio complexas. Eles fornecem as ferramentas para que as `features` implementem o negócio.
2. **Server-Only:** Muitos arquivos aqui utilizam o pacote `server-only` para garantir que segredos e lógicas de banco não vazem para o cliente.
3. **Instanciação Única:** Clientes de banco de dados (Prisma) e Cache (Redis) devem ser instanciados apenas uma vez aqui e exportados.

## Estrutura de Pastas

| Pasta | Responsabilidade |
| :--- | :--- |
| `audit/` | Serviço base para logs de auditoria do sistema. |
| `auth/` | Configuração do motor de autenticação (Better-Auth) e políticas de acesso (RBAC). |
| `centrifugo/` | Clientes de integração para comunicação Real-time (Websockets). |
| `constants/` | Enums e valores constantes compartilhados (ex: Status de Tickets). |
| `date/` | Helpers para manipulação de datas e fusos horários (baseado em `date-fns`). |
| `db/` | Conexão com Prisma, Redis e lógicas de Cache de Lookup. |
| `env/` | Validação e tipagem de variáveis de ambiente usando Zod. |
| `funnel/` | Utilitários para processamento de intenções de funil de vendas. |
| `http/` | Clientes de API (Axios/Fetch) e contextos de requisição cliente/servidor. |
| `i18n/` | Configurações de internacionalização e dicionários de mensagens. |
| `mail/` | Integração com provedores de e-mail (Resend) e templates base. |
| `mask/` | Formatadores e máscaras para documentos (CPF, CNPJ, Telefone). |
| `utils/` | Pequenas funções de ajuda, logger e o utilitário `Result` para padronização de retornos. |

## O que NÃO colocar aqui
- **Lógica de Faturamento:** Deve ficar em `src/features/billing`.
- **Regras de CRM/Leads:** Deve ficar em `src/features/leads` ou `src/features/contact`.
- **Componentes React:** Devem ficar em `src/components` ou dentro de uma feature específica.
