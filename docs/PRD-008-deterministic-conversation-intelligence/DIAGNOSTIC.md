# Diagnóstico

## O que falta hoje

### 1. Não há endpoint consolidado de dados da conversa

Os dados estão em vários modelos mas não há endpoint que retorne o contexto completo de uma conversa em DTO único.

**Impacto:** operador precisa inferir contexto lendo mensagens. IA não tem onde buscar fatos estruturados.

**Correção:** criar `/api/v1/conversations/[id]/intelligence` retornando o DTO completo.

### 2. Dados de atribuição não aparecem na inbox

`DealTracking` tem UTM, ctwaclid, referrer, landing page — mas o `DealPanel` só mostra se `sourceType = paid`. Outros campos ficam ocultos.

**Impacto:** operador não vê de onde veio o lead sem buscar em outra tela.

**Correção:** seção "Origem" no acordeão exibindo todos os campos disponíveis.

### 3. Dados temporais não são derivados para exibição

`lastInboundAt` existe no banco mas a inbox não exibe "há quanto tempo o lead mandou a última mensagem". O operador precisa calcular mentalmente.

**Impacto:** friction desnecessário para o operador.

**Correção:** service calcula diffs e UI exibe em formato humano.

### 4. Histórico do lead não está visível como contexto unificado

`totalDeals` e `lifetimeValue` aparecem separados mas não integrados em um DTO que a IA possa consumir.

**Correção:** incluir no DTO como seção `lead`.

## Riscos

- `firstResponseTimeSec` existe em `Conversation` e em `Deal` — podem divergir. Usar sempre o do `Deal` para contexto do deal atual.
- `avgResponseTimeSec` é da `Conversation` — representa toda a conversa, não só o deal atual. Documentar isso na UI.
- `windowSecondsRemaining` pode ser negativo — UI deve tratar explicitamente ("Expirada há X").
- `inboundOutboundRatio` é `null` quando `outboundMessagesCount = 0` — não dividir por zero.

## Princípios

- Nenhum campo do DTO é interpretação.
- O service não toma decisões — só calcula.
- A UI exibe números — não julgamentos.
