# Contexto: PRD-019 Campaign UX Improvements

---

## Definicao

Este PRD entrega seis melhorias incrementais no módulo de campanhas WhatsApp, organizadas em duas fases:

**Fase 1 — Quick Wins (Tasks 1-8):**
Todas as melhorias que não requerem mudança de schema. Podem ser entregues em paralelo após Task 1.

**Fase 2 — Blocklist (Tasks 9-13):**
Nova entidade `WhatsAppOptOut` + integração com o snapshot de campanha.

---

## Quem Usa

- **Operadores de marketing**: criam campanhas, analisam engajamento, duplicam campanhas para novas audiências.
- **Gestores de compliance**: gerenciam blocklist de opt-outs para garantir que contatos que pediram exclusão
  não recebam mensagens.
- **Leads/contatos**: podem solicitar opt-out via resposta de campanha (futuramente via link automático).

---

## Feature 1: Drawer → Main Shell

### Fluxo Atual
1. Usuário na listagem clica "Nova campanha"
2. `CampaignFormDrawer` abre sobre a listagem
3. Wizard de 3 passos dentro do drawer
4. Ao criar, fecha drawer e atualiza listagem

### Fluxo Desejado
1. Usuário clica "Nova campanha"
2. `router.push` para `/campaigns/new`
3. `CampaignBuilder` ocupa tela inteira
4. Ao salvar/cancelar, `router.push` de volta para `/campaigns`

### Impacto Tecnico
- `CampaignFormDrawer` é deletado.
- `CampaignsPage` remove estado `isCreateOpen` + import do drawer.
- Botão "Nova campanha" usa `router.push(campaignsPath + '/new')`.
- `CampaignBuilder` já existe em `src/components/dashboard/campaigns/builder/campaign-builder.tsx`.

---

## Feature 2: Funil de Engajamento

### Problema
O `/stats` endpoint retorna `total / success / failed / pending`. O `success` agrega SENT + DELIVERED +
READ + RESPONDED em um único número, escondendo a progressão real do funil.

### Estado Desejado
```
1.000 enviados → 950 entregues → 600 lidos → 80 responderam
     (95%)            (63%)            (8%)
```

### Dados Disponíveis
`WhatsAppCampaignRecipient.status` tem os valores: `PENDING`, `SENT`, `DELIVERED`, `READ`,
`RESPONDED`, `FAILED`, `EXCLUDED`.

### Mudanca no /stats
Adicionar campos ao response:
```typescript
{
  status: string
  total: number
  sent: number       // SENT + DELIVERED + READ + RESPONDED (enviados com sucesso)
  delivered: number  // DELIVERED + READ + RESPONDED
  read: number       // READ + RESPONDED
  responded: number  // RESPONDED
  failed: number     // FAILED + EXCLUDED
  pending: number    // PENDING
  // mantém 'success' como alias de 'sent' para não quebrar clientes existentes
  success: number
}
```

### Componente Visual
- Funil horizontal com 4 etapas: Enviado → Entregue → Lido → Respondeu
- Cada etapa mostra: count absoluto + taxa relativa ao anterior (ex: "63% dos enviados")
- Polling a 2s durante PROCESSING, estático após COMPLETED
- Substituir os 4 cards atuais (Total/Sucesso/Falha/Pendente) pelo funil

---

## Feature 3: Filtro de Recipients

### Problema
A tabela de destinatários não tem filtro. Para campanhas com 5k+ recipients, é impossível encontrar
um contato específico ou ver apenas os que falharam.

### Estado Desejado
- Select de status: "Todos", "Enviada", "Entregue", "Lida", "Interação", "Falhou", "Excluído"
- Input de busca por telefone (debounced, 300ms)
- Contagem dinâmica: "Mostrando X de Y destinatários"
- Ao mudar filtro, reset para página 1

### Mudanca no /recipients
Aceitar query params:
- `status`: filtro por status (opcional)
- `phone`: busca parcial por telefone (opcional, ILIKE `%phone%`)
- `page`, `pageSize`: paginação já existente

---

## Feature 4: Preview de Template

### Problema
O usuário seleciona um template pelo nome mas não vê como ficará a mensagem antes de criar.

### Estado Desejado
- No passo "Conteúdo" do Campaign Builder: ao selecionar um template, exibir preview lateral
- Preview mostra: nome do template, idioma, categoria, e o conteúdo dos componentes (header, body, footer, buttons)
- Dados vêm de `GET /api/v1/whatsapp/templates` (endpoint já existe, retorna lista de templates com detalhes)

### Regras
- Preview é somente leitura
- Se o template tem variáveis (ex: `{{1}}`), exibir com placeholder "(variável)"
- Preview renderiza em um card estilo "bolha de WhatsApp"

---

## Feature 5: Duplicar Campanha

### Problema
Para reenviar a mesma campanha para uma nova audiência (prática comum em marketing), o usuário
precisa recriar tudo do zero.

### Estado Desejado
- Botão "Duplicar" na página de detalhe da campanha
- Ao clicar: cria nova campanha com mesmo nome (sufixo " — Cópia"), tipo, template, instância
- Status da nova campanha: `DRAFT`
- Sem copiar recipients (nova audiência será definida pelo usuário)
- Sem copiar scheduledAt
- Após criação, redireciona para a nova campanha em `/campaigns/{newId}`

### Endpoint
`POST /api/v1/whatsapp/campaigns/{campaignId}/duplicate`
- Body: vazio
- Response: `{ campaignId: string, name: string }`

---

## Feature 6: Blocklist / Opt-out

### Definicao
Opt-out é a recusa explícita de um contato em receber mensagens de marketing. Uma vez na blocklist,
o contato é automaticamente excluído do snapshot de qualquer campanha futura.

### Modelo
```
WhatsAppOptOut {
  id             String   @id @default(cuid())
  organizationId String
  phone          String   // formato E.164 ex: +5511999999999
  source         String   // 'MANUAL' | 'CAMPAIGN_REPLY' | 'API'
  campaignId     String?  // campanha que gerou o opt-out (se source = CAMPAIGN_REPLY)
  note           String?  // nota do operador (se source = MANUAL)
  createdAt      DateTime @default(now())
  createdBy      String?  // userId (se source = MANUAL)

  @@unique([organizationId, phone])
  @@index([organizationId, createdAt])
}
```

### Exclusão Automática no Snapshot
Durante a geração do snapshot de recipients (`WhatsAppCampaignSnapshotService`):
1. Buscar todos os opt-outs da organização
2. Ao criar cada `WhatsAppCampaignRecipient`, checar se o telefone está na blocklist
3. Se sim, criar o recipient com `status = 'EXCLUDED'` e `exclusionReason = 'OPT_OUT'`

### UI de Gestão
Nova aba ou página em `/campaigns/opt-outs`:
- Tabela: telefone, fonte, campanha (link), data, nota
- Busca por telefone
- Botão "Adicionar opt-out" (manual)
- Botão "Remover opt-out" com confirmação

### Regras de Negocio
- Opt-out é por `(organizationId, phone)` — escopo de organização, não de projeto
- Remover um opt-out reativa o contato para futuras campanhas (não retroativo)
- Adicionar opt-out manual requer nota mínima de 5 caracteres
- Importação em lote via CSV (V2 — fora deste PRD)

---

## Dados e Integracoes

### Modelos existentes reutilizados
- `WhatsAppCampaign` — duplicate usa campos existentes
- `WhatsAppCampaignRecipient` — status enum já tem EXCLUDED e exclusionReason
- `WhatsAppCampaignDispatchGroup` — duplicate copia o grupo

### Novo modelo
- `WhatsAppOptOut` — novo (Task 9)

### APIs internas
- `GET /api/v1/whatsapp/campaigns/[id]/stats` — modificado (Task 2)
- `GET /api/v1/whatsapp/campaigns/[id]/recipients` — modificado (Task 4)
- `POST /api/v1/whatsapp/campaigns/[id]/duplicate` — novo (Task 7)
- `GET/POST /api/v1/whatsapp/opt-outs` — novo (Task 10)
- `DELETE /api/v1/whatsapp/opt-outs/[id]` — novo (Task 10)

### Caches
- Stats polling: TanStack Query `refetchInterval: 2000` durante PROCESSING (existente)
- Recipients: invalidar ao mudar filtro/página
- Opt-outs: SWR simples, sem polling

### Permissoes
- Todas as rotas protegidas por `validateFullAccess`
- Opt-out manual requer role que possa escrever (`ADMIN` ou `MEMBER`)

---

## Estado Desejado ao Final

- Botão "Nova campanha" navega para `/campaigns/new` (sem drawer)
- Página de detalhe mostra funil horizontal com taxas de engajamento
- Tabela de destinatários tem filtro por status e busca por telefone
- Campaign Builder mostra preview da mensagem no passo de Conteúdo
- Botão "Duplicar" na página de detalhe cria cópia e redireciona
- Página `/campaigns/opt-outs` para gestão de blocklist
- Contatos na blocklist são excluídos automaticamente no snapshot
