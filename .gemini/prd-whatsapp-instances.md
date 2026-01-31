# PRD: WhatsApp Business - Gestão de Instâncias

## 1. Visão Geral

### 1.1 Contexto
A funcionalidade atual de WhatsApp no Whatrack está mal estruturada, com abas desorganizadas e sem hierarquia clara. Precisamos redesenhar seguindo padrões de mercado usados por grandes BSPs (Business Solution Providers) como Twilio, MessageBird e Zenvia.

### 1.2 Objetivo
Criar uma experiência de gestão de WhatsApp Business API profissional, onde o usuário possa:
- Visualizar e gerenciar múltiplas **instâncias** (números de telefone conectados)
- Acessar detalhes, templates e histórico de cada instância
- Enviar mensagens de teste e campanhas

### 1.3 Referências de Mercado
| Plataforma | Estrutura Principal |
|------------|-------------------|
| **Twilio** | Lista de números → Detalhe do número → Logs/Templates |
| **MessageBird** | Team Inbox → Canais → Configuração por canal |
| **Zenvia** | Instâncias → Detalhe → Mensagens/Templates |
| **WATI** | Conexões → Status/QR → Templates/Broadcasts |

---

## 2. Arquitetura de Informação

### 2.1 Hierarquia de Navegação

```
/dashboard/settings/whatsapp
├── [Visão Geral] - Cards com instâncias conectadas
│   ├── Card: Número 1 (+55 11 9999-9999)
│   │   └── Status, Qualidade, Última atividade
│   ├── Card: Número 2 (+55 21 8888-8888)
│   └── [+ Adicionar Instância]
│
└── /dashboard/settings/whatsapp/:phoneId
    ├── [Visão Geral] - Status detalhado da instância
    ├── [Perfil] - Perfil comercial do número
    ├── [Templates] - Gerenciar templates de mensagem
    ├── [Enviar] - Enviar mensagens de teste
    └── [Histórico] - Logs de mensagens enviadas
```

### 2.2 Fluxo do Usuário

```
┌─────────────────────────────────────────────────────────────────┐
│                    LISTA DE INSTÂNCIAS                          │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐              │
│  │ +55 11 99999-9999   │  │ +55 21 88888-8888   │  [+ Nova]    │
│  │ ● Conectado         │  │ ○ Desconectado      │              │
│  │ Qualidade: Verde    │  │ Qualidade: Amarelo  │              │
│  │ 1.234 msg/mês       │  │ 0 msg/mês           │              │
│  └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (Clique no card)
┌─────────────────────────────────────────────────────────────────┐
│  ← Voltar          +55 11 99999-9999          ● Conectado      │
├─────────────────────────────────────────────────────────────────┤
│  [Visão Geral]  [Perfil]  [Templates]  [Enviar]  [Histórico]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Conteúdo da aba selecionada...                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Telas e Componentes

### 3.1 Tela: Lista de Instâncias (Principal)

**URL:** `/dashboard/settings/whatsapp`

**Objetivo:** Mostrar todas as instâncias (números) conectadas à organização.

**Componentes:**
- **Header simples** (sem título grande, seguindo padrão de leads)
- **Cards de instância** (um por número de telefone)
- **Botão "Adicionar Instância"** (futuro - conectar novo número)
- **Empty State** (quando não há instâncias)

**Card de Instância - Informações:**
| Campo | Descrição |
|-------|-----------|
| `display_phone_number` | Número formatado |
| `verified_name` | Nome verificado do negócio |
| `status` | CONNECTED, DISCONNECTED, etc |
| `quality_rating` | GREEN, YELLOW, RED |
| `platform_type` | CLOUD_API |
| `throughput.level` | Capacidade de envio |

**Ações no Card:**
- Click → Navega para detalhe da instância
- Menu (3 pontos) → Configurações, Desconectar

---

### 3.2 Tela: Detalhe da Instância

**URL:** `/dashboard/settings/whatsapp/:phoneId`

**Objetivo:** Gerenciamento completo de uma instância específica.

**Navegação por Abas:**

| Aba | Descrição | Prioridade |
|-----|-----------|------------|
| **Visão Geral** | Status, métricas, alertas | P0 |
| **Perfil** | Perfil comercial (about, endereço, etc) | P1 |
| **Templates** | Lista e gestão de templates | P0 |
| **Enviar** | Envio de mensagens de teste | P0 |
| **Histórico** | Logs de mensagens enviadas | P2 |

---

### 3.3 Componentes por Aba

#### 3.3.1 Visão Geral
- **Status Card:** Conexão, verificação, qualidade
- **Métricas:** Mensagens enviadas (24h/7d/30d)
- **Alertas:** Avisos de qualidade, limites, etc
- **Conta WABA:** ID, timezone, moeda

#### 3.3.2 Perfil
- **Avatar:** Foto do perfil comercial
- **Dados editáveis:** About, descrição, endereço, email, websites
- **Categoria:** Vertical do negócio

#### 3.3.3 Templates
- **Lista de templates** com status (APPROVED, PENDING, REJECTED)
- **Filtros:** Por status, categoria
- **Detalhes do template:** Prévia, idiomas, componentes
- **Link externo:** Criar template no Business Manager

#### 3.3.4 Enviar
- **Seletor de template** (apenas APPROVED)
- **Destino:** Número de telefone
- **Prévia da mensagem**
- **Botão enviar**
- **Histórico rápido:** Últimas 5 mensagens enviadas

#### 3.3.5 Histórico
- **Tabela de mensagens:** Data, destino, template, status
- **Filtros:** Por período, status
- **Detalhes:** Click para ver detalhes da entrega

---

## 4. Modelo de Dados

### 4.1 Entidades Principais

```typescript
// Instância (Número de Telefone)
interface WhatsAppInstance {
  id: string;                    // phone_number_id
  organizationId: string;
  displayPhoneNumber: string;    // +55 11 99999-9999
  verifiedName: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'PENDING';
  qualityRating: 'GREEN' | 'YELLOW' | 'RED';
  platformType: 'CLOUD_API' | 'ON_PREMISE';
  throughput: {
    level: 'STANDARD' | 'HIGH' | 'VERY_HIGH';
  };
  accountMode: 'SANDBOX' | 'LIVE';
  codeVerificationStatus: 'VERIFIED' | 'NOT_VERIFIED';
  createdAt: Date;
  lastActiveAt: Date;
}

// Configuração da Conta WABA
interface WABAConfig {
  id: string;                    // waba_id
  organizationId: string;
  name: string;
  accountReviewStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  businessVerificationStatus: 'verified' | 'unverified' | 'pending';
  timezoneId: string;
  currency: string;
  accessToken: string;           // Não expor no frontend
}

// Template de Mensagem
interface MessageTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: TemplateComponent[];
}

// Log de Mensagem
interface MessageLog {
  id: string;
  phoneId: string;
  to: string;
  templateName: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  errorCode?: string;
  sentAt: Date;
}
```

---

## 5. API Endpoints

### 5.1 Endpoints Necessários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/whatsapp/instances` | Listar todas as instâncias |
| GET | `/api/v1/whatsapp/instances/:phoneId` | Detalhe de uma instância |
| GET | `/api/v1/whatsapp/instances/:phoneId/profile` | Perfil comercial |
| GET | `/api/v1/whatsapp/instances/:phoneId/templates` | Templates da instância |
| POST | `/api/v1/whatsapp/instances/:phoneId/send` | Enviar mensagem |
| GET | `/api/v1/whatsapp/instances/:phoneId/messages` | Histórico de mensagens |

---

## 6. Plano de Implementação

### Fase 1: Estrutura Base (1-2 dias)
- [ ] Criar rota `/dashboard/settings/whatsapp` (lista)
- [ ] Criar rota `/dashboard/settings/whatsapp/[phoneId]` (detalhe)
- [ ] Implementar navegação entre telas
- [ ] Cards de instâncias na página principal

### Fase 2: Abas Essenciais (2-3 dias)
- [ ] Aba Visão Geral (refatorar configuration-view)
- [ ] Aba Templates (refatorar para listar templates)
- [ ] Aba Enviar (refatorar messaging-view)

### Fase 3: Abas Complementares (1-2 dias)
- [ ] Aba Perfil (refatorar business-profile-view)
- [ ] Aba Histórico (novo - logs de mensagens)

### Fase 4: Polish (1 dia)
- [ ] Loading states
- [ ] Error handling
- [ ] Responsividade mobile
- [ ] Testes

---

## 7. Considerações Técnicas

### 7.1 Rotas Next.js
```
src/app/dashboard/settings/whatsapp/
├── page.tsx                    # Lista de instâncias
└── [phoneId]/
    └── page.tsx                # Detalhe da instância
```

### 7.2 Feature Structure
```
src/features/whatsapp/
├── index.tsx
├── api/
│   └── whatsapp.ts
├── types/
│   └── index.ts
├── components/
│   ├── instance-card.tsx       # Card na lista
│   ├── instance-detail.tsx     # Container do detalhe
│   └── tabs/
│       ├── overview-tab.tsx
│       ├── profile-tab.tsx
│       ├── templates-tab.tsx
│       ├── send-tab.tsx
│       └── history-tab.tsx
└── hooks/
    └── use-instance.ts
```

---

## 8. Métricas de Sucesso

| Métrica | Objetivo |
|---------|----------|
| Tempo para enviar mensagem de teste | < 30 segundos |
| Clareza da navegação | Usuário encontra função em < 2 cliques |
| Aprovação no App Review | Gravar vídeo em < 2 minutos |

---

## 9. Próximos Passos

1. **Revisar PRD** com stakeholder
2. **Aprovar estrutura** de navegação
3. **Iniciar implementação** Fase 1
