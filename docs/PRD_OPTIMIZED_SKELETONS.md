# PRD: Estratégia de Carregamento Otimizada (Skeletons Per-Page)

## 1. Visão Geral
O objetivo deste documento é definir o novo padrão de UX para estados de carregamento no Whatrack. Atualmente, o sistema apresenta "piscadas" e múltiplos estados de carregamento (skeletons) que não coincidem com o layout final, causando confusão visual e Layout Shift.

## 2. Problemas Atuais
- **Múltiplos Skeletons:** Presença de skeletons globais (`dashboard/loading.tsx`) que conflitam com skeletons específicos de componentes.
- **Diferença de Layout:** O esqueleto exibido não mimetiza fielmente a estrutura da página final (ex: esqueleto de gráfico aparecendo em página de configurações).
- **Waterfalls de Loading:** O usuário vê um loading, a página carrega, e então vê outro loading interno (Client-side fetching).

## 3. Nova Estratégia (Next.js 15 & RSC)

### 3.1. Eliminação de Globais
- Remover todos os arquivos `loading.tsx` genéricos (raiz, dashboard, auth).
- Cada página ou grupo de funcionalidades deve ter seu próprio `loading.tsx` (ex: `dashboard/settings/meta-ads/loading.tsx`) que desenha exatamente as bordas, headers e tabs daquela tela.

### 3.2. Prioridade para Server-Side Rendering (RSC)
- Sempre que possível, buscar os dados iniciais no Servidor (Page Component `async`).
- Injetar os dados via `initialData` no React Query. Isso elimina a necessidade de skeletons após a página ser entregue pelo servidor.

### 3.3. Skeletons de Componentes (Micro-Loadings)
- Skeletons dentro de componentes (como tabelas e cards) só devem aparecer em ações de **Refetch** ou **Filtros**, após a página já estar montada.
- O design dos skeletons deve usar bordas e tamanhos idênticos aos itens reais (ex: `h-10` para uma linha de tabela).

## 4. Plano de Implementação
1. **Remoção Imediata:** Excluir todos os arquivos `loading.tsx` que não são específicos.
2. **Refatoração de Páginas:** Converter Client Components de página em Server Components para fetch paralelo.
3. **Design dos Skeletons:** Criar skeletons para cada tela principal:
   - Inbox/WhatsApp
   - Meta Ads (Ad Accounts & Pixels)
   - Leads / Kanban
   - Dashboards de ROI
4. **Padronização:** Usar apenas o componente `@/components/ui/skeleton.tsx` com as classes `bg-muted/50`.

## 5. Critérios de Sucesso
- Zero "piscadas" de layout diferente ao navegar entre rotas.
- Navegação entre abas (tabs) instantânea ou com micro-feedback local.
- Eliminação total do esqueleto de dashboard em telas de configuração.
