# PRD: CRUD de Templates WhatsApp

## 1. Visão Geral

### 1.1 Problema
Para aprovar a permissão `whatsapp_business_management` no App Review da Meta, precisamos demonstrar que o SaaS consegue **criar, listar, editar e excluir** templates de mensagem diretamente na plataforma, sem redirecionar o usuário para o Gerenciador do WhatsApp.

### 1.2 Objetivo
Implementar um CRUD completo de Message Templates dentro da aba "Templates" da página de configurações do WhatsApp, utilizando a API do Meta.

### 1.3 Escopo
- **In-Scope:**
  - Listagem de templates existentes (já implementado, melhorar)
  - Criação de novos templates via Dialog
  - Edição de templates pendentes/rejeitados
  - Exclusão de templates
  - Visualização de status e motivo de rejeição
  
- **Out-of-Scope:**
  - Upload de mídia para templates (imagens, vídeos) - v2
  - Templates de autenticação (OTP) - v2
  - Duplicação de templates - v2

---

## 2. User Stories

### US-01: Criar Template
**Como** usuário do SaaS,  
**Quero** criar um novo template de mensagem diretamente no sistema,  
**Para** não precisar sair da plataforma e acessar o Business Manager da Meta.

**Critérios de Aceite:**
- [ ] Botão "Novo Template" abre um Dialog
- [ ] Formulário com campos: Nome, Categoria, Idioma, Corpo, Variáveis (Samples)
- [ ] Validação de nome (minúsculas, sem espaços, underscores)
- [ ] Toast de sucesso/erro após submissão
- [ ] Template aparece na lista com status "PENDING"

### US-02: Listar Templates
**Como** usuário do SaaS,  
**Quero** ver todos os meus templates sincronizados com a Meta,  
**Para** acompanhar o status de aprovação de cada um.

**Critérios de Aceite:**
- [ ] Exibir nome, categoria, idioma, status, prévia do corpo
- [ ] Indicador visual para status (Approved, Pending, Rejected)
- [ ] Motivo de rejeição visível para templates rejeitados
- [ ] Loading skeleton durante carregamento

### US-03: Editar Template (Rejeitados)
**Como** usuário do SaaS,  
**Quero** corrigir um template rejeitado,  
**Para** submetê-lo novamente para aprovação.

**Critérios de Aceite:**
- [ ] Botão "Editar" visível apenas para templates REJECTED ou PENDING
- [ ] Dialog pré-preenchido com dados atuais
- [ ] Submissão atualiza o template na Meta

### US-04: Excluir Template
**Como** usuário do SaaS,  
**Quero** excluir um template que não uso mais,  
**Para** manter minha lista organizada.

**Critérios de Aceite:**
- [ ] Botão "Excluir" com confirmação (AlertDialog)
- [ ] Toast de sucesso após exclusão
- [ ] Template removido da lista imediatamente

---

## 3. Especificação Técnica

### 3.1 Endpoints da Meta API

| Ação | Método | Endpoint | Descrição |
|------|--------|----------|-----------|
| Listar | GET | `/{waba_id}/message_templates` | Retorna todos os templates |
| Criar | POST | `/{waba_id}/message_templates` | Cria novo template |
| Editar | POST | `/{waba_id}/message_templates` | Atualiza template existente |
| Excluir | DELETE | `/{waba_id}/message_templates?name={name}` | Remove template por nome |

### 3.2 Payload de Criação (Exemplo)

```json
{
  "name": "confirmacao_agendamento",
  "category": "UTILITY",
  "language": "pt_BR",
  "components": [
    {
      "type": "BODY",
      "text": "Olá {{1}}, confirmamos seu agendamento para {{2}}.",
      "example": {
        "body_text": [["Maria", "amanhã às 14h"]]
      }
    }
  ]
}
```

### 3.3 Arquitetura de Componentes

```
src/features/whatsapp/
├── api/
│   └── whatsapp.ts              # Adicionar: createTemplate, updateTemplate, deleteTemplate
├── components/
│   ├── views/
│   │   └── templates-view.tsx   # Refatorar: adicionar CRUD actions
│   └── dialogs/
│       ├── create-template-dialog.tsx   # NOVO
│       └── delete-template-dialog.tsx   # NOVO
├── hooks/
│   └── use-templates.ts         # NOVO: mutations para CRUD
└── types/
    └── index.ts                 # Adicionar: CreateTemplatePayload
```

### 3.4 Schema do Formulário (Zod)

```typescript
const createTemplateSchema = z.object({
  name: z.string()
    .min(1, "Nome obrigatório")
    .max(512)
    .regex(/^[a-z_]+$/, "Apenas letras minúsculas e underscores"),
  category: z.enum(["MARKETING", "UTILITY"]),
  language: z.string().default("pt_BR"),
  bodyText: z.string().min(1, "Corpo obrigatório").max(1024),
  // Variáveis detectadas automaticamente via regex {{1}}, {{2}}...
  samples: z.array(z.string()).optional(),
})
```

---

## 4. Design de Interface

### 4.1 Templates View (Atualizada)

```
┌─────────────────────────────────────────────────────────────┐
│  Meus Templates                        [+ Novo Template]    │
│  Sincronizados com o Gerenciador do WhatsApp                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ UTILIDADE   │  │ MARKETING   │  │ UTILIDADE   │          │
│  │ ✓ Aprovado  │  │ ⏳ Pendente │  │ ✗ Rejeitado │          │
│  │             │  │             │  │             │          │
│  │ confirmacao │  │ promocao    │  │ lembrete    │          │
│  │ _agendamen  │  │ _black      │  │ _pagamento  │          │
│  │             │  │             │  │             │          │
│  │ "Olá {{1}}, │  │ "Aproveite  │  │ "Seu pagam. │          │
│  │ confirmamos │  │ {{1}}% de   │  │ vence em    │          │
│  │ seu..."     │  │ desconto!"  │  │ {{1}} dias" │          │
│  │             │  │             │  │             │          │
│  │ pt_BR       │  │ pt_BR       │  │ pt_BR       │          │
│  │        [⋮]  │  │        [⋮]  │  │        [⋮]  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Dialog de Criação

```
┌─────────────────────────────────────────────────────────────┐
│  ✖                        Novo Template                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Nome do Template                                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ confirmacao_agendamento                             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ⓘ Apenas letras minúsculas e underscores                  │
│                                                             │
│  Categoria              Idioma                              │
│  ┌──────────────────┐   ┌──────────────────┐                │
│  │ Utilidade      ▼│   │ Português (BR) ▼│                │
│  └──────────────────┘   └──────────────────┘                │
│                                                             │
│  Corpo da Mensagem                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Olá {{1}}, confirmamos seu agendamento para {{2}}.  │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│  ⓘ Use {{1}}, {{2}} para variáveis dinâmicas               │
│                                                             │
│  ─────────────────────────────────────────────────────      │
│  Exemplos das Variáveis (obrigatório para aprovação)        │
│                                                             │
│  Valor para {{1}}       Valor para {{2}}                    │
│  ┌──────────────────┐   ┌──────────────────┐                │
│  │ Maria            │   │ amanhã às 14h    │                │
│  └──────────────────┘   └──────────────────┘                │
│                                                             │
│  ─────────────────────────────────────────────────────      │
│  Prévia                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ "Olá Maria, confirmamos seu agendamento para        │    │
│  │  amanhã às 14h."                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancelar]  [Criar Template]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Fluxo de Implementação

### Fase 1: Backend (API Routes)
1. [ ] `POST /api/v1/whatsapp/templates` - Criar template
2. [ ] `DELETE /api/v1/whatsapp/templates` - Excluir template
3. [ ] Adicionar métodos no `MetaCloudService`

### Fase 2: API Client
4. [ ] `whatsappApi.createTemplate(payload)`
5. [ ] `whatsappApi.deleteTemplate(name)`

### Fase 3: UI Components
6. [ ] `CreateTemplateDialog` com formulário completo
7. [ ] `DeleteTemplateDialog` com confirmação
8. [ ] Refatorar `TemplatesView` para incluir ações

### Fase 4: Polish
9. [ ] Detecção automática de variáveis no texto
10. [ ] Prévia em tempo real do template
11. [ ] Tratamento de erros específicos da Meta

---

## 6. Métricas de Sucesso

| Métrica | Target |
|---------|--------|
| Templates criados via SaaS | > 0 (prova de uso) |
| Taxa de aprovação | > 80% |
| Tempo de criação (UX) | < 60 segundos |

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Rejeição por falta de samples | Alta | Alto | Campo obrigatório + validação |
| Rate limit da Meta | Baixa | Médio | Debounce + cache de lista |
| Nome duplicado | Média | Baixo | Validação prévia via GET |

---

## 8. Critérios de Pronto (Definition of Done)

- [ ] Código implementado e sem erros de TypeScript
- [ ] Funcionalidade testada manualmente (criar, listar, excluir)
- [ ] Template criado aparece no WhatsApp Manager oficial
- [ ] UI responsiva (mobile-friendly)
- [ ] Toast de feedback para todas as ações
- [ ] Vídeo de demonstração gravável para App Review
