# WhaTrack - Redesign do Inbox (Atendimento Ágil & Atribuição de Meta Ads): PRD v1

## Visão Geral

O Inbox (`/dashboard/whatsapp/inbox`) é o coração do WhaTrack. É onde a equipe passa 90% do tempo.
O design atual peca por estar confinado em um "card" dentro do _main shell_ em vez de utilizar o espaço total (full-bleed), possui uma listagem de chats engessada, e a coluna de detalhes do lead (TicketPanel) não transborda valor de negócio (conversões/Aha! Moments).

Este PRD visa elevar a interface a um nível premium (Super-App), focando em legibilidade, contraste, e ações em tempo real, eliminando a cara de "sistema velho".

---

## 1. Problemas Atuais de UI/UX
1. **Layout Encaixotado:** O Inbox não abraça a tela toda. Fica "boiando" dentro de margins.
2. **Lista de Chats (Esquerda):** Falta clareza visual. Usuário não sabe quem é tráfego pago vs orgânico rápido; contadores ou "tags" quebradas ou em fontes desproporcionais.
3. **Painel de Detalhes (Direita) Estático:** Apenas exibe dados em formatação rústica. Não há calls-to-action poderosos para fechar a venda (enviar evento para Meta Ads), nem integração visível com a análise da IA.

---

## 2. Nova Estrutura Arquitetural (Full-Bleed Layout)

O componente atual do `page.tsx` será ejetado do container padrão de dashboard ou utilizará `h-[calc(100vh-header)]` com largura `100vw`.
Layout em 3 colunas (Resizable Panels da Radix/Shadcn mantido, mas sem bordas de Card ao redor tudo).

### Coluna 1: Lista de Conversas (Esquerda)
- **Design Clean:** Lista edge-to-edge sem bordas entre itens (apenas `border-b` super sutil ou background em hover).
- **Avatares Aprimorados:** Fallback com iniciais vibrantes geradas por hash ou foto do Meta.
- **Tags de Origem 🎯:** Em vez de texto puro, Badges modernas (ex: `[Fa] Instagram Ads` com ícone sutil ou contorno colorido) ao lado da hora da mensagem.
- **Micro-interações:** Hover state com transição suave; Badge de "Não Lido" com pulse verde (do WhatsApp).

### Coluna 2: Chat Window (Centro)
- **Header Premium:** Avatar e Nome do Contato; em vez de botões cinzas, botões Icon Ghost mais limpos e espaçados.
- **Area de Mensagens:** Fundo tradicional (ou levemente texturizado como o app mobile), garantindo legibilidade. Bolhas de texto (MessageBubbles) com boxShadow mais refinado, cores baseadas no tema (ex: verde primary vs cinza claro).
- **Banner de Modo "Visualização":** O footer atual dizendo "Responda pelo app" deve ser redesenhado como um Ribbon/Banner "glassmorphism" elegante, que não pareça um erro, mas uma feature ("Supervisão Ativada").

### Coluna 3: Ticket Panel & Copilot (Direita - A Joia da Coroa)
A tela mais vital para o Gestor, onde o ROI do Meta Ads acontece.
Fluxo top-down redesenhado:

1. **Header do Perfil:** 
   - Foto grande (circular) centralizada ou alinhada com nome forte em `h3`.
   - Telefone com cópia em 1-click.

2. **Destaque: Origem do Lead (Módulo Tracking) 🔥:**
   - Background diferenciado se for tráfego pago (um card levemente colorido dentro da coluna).
   - "Lead gerado por Campanha: **Verão 2026** no Instagram".
   - ID do clique (FBCLID) visível em fonte monospaced pequena.

3. **Módulo IA Copilot ✨ (Integração Imediata):**
   - Container com borda fina dourada ou roxa dependendo da heurística.
   - Detecção: "IA encontrou intenção de compra de: _Toxina Botulínica_ (R$ 1.500)."
   - Botão Verde Solid [✅ Registrar Venda].

4. **Controles de CRM (Dropdowns em Linha):**
   - Abandonar Labels isoladas. Formato "Chave: [ Select ]".
   - **Estágio:** Select nativo pra alterar de "Novo" para "Negociação" na hora.
   - **Atendente:** Select buscar a carinha (image) da equipe.

5. **Termômetro da Janela 24h:**
   - Ao invés de barra simples, um "Radial Progress" pequeno ou uma barra de neon verde (quando ok) ou vermelha piscante (quando restam < 2h).

6. **Footer Fixo Principal:**
   - Botão _Primary_ de Largura Total: **[ Concluir Venda (CAPI) ]** (Abre modal simples Produto+Valor).
   - Botão _Destructive/Ghost_: **[ Descartar Lead ]**.

---

## 3. Diretrizes de UX e CSS
- **Cores / Tipografia:** Utilizar a paleta global já setada no Shadcn, explorando bem o uso de `muted-foreground` para texto secundário e criando forte contraste para números financeiros (DealValue).
- **Loading States:** Abandonar o giro tradicional e implementar Skeleton Loads para as conversas e o Ticket ao carregar.
- **Espaçamentos:** Aplicar mais "respiro" (`gap-4`, `p-6`) no lado direito (Ticket Panel). A lista da esquerda pode ser condensada (`p-3`).

## 4. Roteiro Prático de Refatoração (A ser executado)
1. Editar o Layout Shell exclusivo para a rota `/dashboard/whatsapp/inbox` para remover os paddings desnecessários e expandir a tela.
2. Refatorar o componente `ChatList`: Adicionar suporte a Badges e Tags de origem reais (puxando do `TicketTracking`).
3. Refatorar o componente `ChatWindow`: Polimento nos estilos de MessageBubble e Header.
4. Refazer do zero o componente `TicketPanel` dividindo-o em subcomponentes menores (`LeadInfo`, `TrackingCard`, `AiCopilotCard`, `CrmControls`, `BottomActions`).

---
_Nota: A proposta aqui não foca em lógicas robustas backend, apenas transforma a estrutura de dados existente em uma apresentação premium, intuitiva, focada na principal dor do cliente: saber de onde o lead veio e confirmar a venda pro Meta._
