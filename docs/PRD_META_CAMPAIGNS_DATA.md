# PRD: Tabela de Dados e Campanhas do Meta Ads

## 1. Visão Geral
O objetivo é criar uma nova interface dentro da seção "Dados" no menu lateral (Sidebar) chamada **Meta Ads**. Esta tela será responsável por exibir dados detalhados e granulares de campanhas, permitindo análises aprofundadas com múltiplos filtros e a capacidade de personalizar quais métricas (colunas) são exibidas.

## 2. Acesso e Navegação
- **Menu:** Adicionar o item **"Meta Ads"** ou **"Campanhas Meta"** sob a seção de **"Dados"** no Menu Lateral (abaixo de Leads/Vendas).
- **Rota Proposta:** `/dashboard/meta-ads/campaigns` ou `/dashboard/data/meta-ads`.

## 3. Filtros Superiores (Top Bar)
A tela precisará ter um painel robusto de filtros para refinar a busca:
- **Conta de Anúncio:** (Selector) Quais contas de anúncio o usuário deseja visualizar.
- **Período de Visualização:** (Date Range Picker) Ex: Hoje, Ontem, Últimos 7 dias, Últimos 30 dias.
- **Status da Campanha:** (Select/Checkbox) Ativo, Pausado, Concluído, etc.
- **Nome da Campanha:** (Input Text) Para busca rápida de campanhas específicas.

## 4. Tabela de Dados (Data Table)
A tabela será construída utilizando o `TanStack Table`, que já é o padrão do projeto e permite gerenciar estado de linhas e visibilidade de colunas de forma nativa.

### 4.1. Funcionalidade de Personalização de Colunas
- Um botão **"Colunas"** (Dropdown) ficará disponível acima da tabela.
- O usuário poderá **marcar e desmarcar** checkboxes das métricas que deseja visualizar.
- As preferências de visualização poderão ser salvas na URL (via search params) ou apenas no estado local do cliente.

### 4.2. Colunas Base (Baseadas na imagem de referência)
1. **[  ]** (Checkbox para seleção)
2. **Status** (Ativo/Pausado com badge ou bolinha de cor)
3. **Campanha** (Nome - Fixo na esquerda)
4. **Orçamento** (Diário / Vitalício)
5. **ROI** (Retorno sobre Investimento real vs Whatrack)
6. **CPA** (Custo Por Aquisição)
7. **Vendas** (Compras / Conversões)
8. **Lucro** (Faturamento - Gastos Meta - (custo produto se houver))
9. **Gastos** (Amount Spent)
10. **Faturamento** (Receita Gerada / Purchase Value)
11. **CTR** (Click-Through Rate)
12. **Cliques** (Link Clicks)
13. **CPC** (Cost per Click)
14. **Vis. de Pág.** (Landing Page Views / Visualizações de Página)
15. **CPV** (Custo por Vis. de Página)
16. **IC** (Initiate Checkout / Checkouts Iniciados)
17. **CTI** (Custo por IC)

### 4.3. Novas Colunas Adicionais Propostas (Ocultas por padrão)
Essas colunas enriquecem a análise e os usuários avançados gostarão de ativá-las:
18. **Resultados** (Métricas de resultado oficial do Meta)
19. **Custo por Resultado** 
20. **ATC** (Add to Cart / Adições ao Carrinho)
21. **Custo por ATC**
22. **ROAS (Meta)** vs **ROAS (Whatrack)** (Para comparação de rastreio)
23. **Impressões**
24. **CPM** (Custo por Mil Impressões)
25. **Frequência** (Quantas vezes a média de usuários viu o anúncio)
26. **Alcance**

## 5. Implementação Técnica
- Criar a página `page.tsx` no novo caminho.
- Criar componentes locais na pasta da rota (ex: `table-filters.tsx`, `columns.tsx`, `data-table.tsx` ou reusar o `ResponsiveDataTable`).
- Utilizar os hooks do React Query para buscar os dados de campanhas da API (`/api/meta-ads/campaigns?accountId=X&dateRange=Y`).
- Ocultar colunas por padrão utilizando o estado de `columnVisibility` do TanStack Table.
- Adicionar Tooltips `(i)` nos headers de colunas mais complexas (CPA, CTI, Lucro) para explicar o cálculo.

## 6. Próximos Passos
1. Validar essas colunas e nomenclaturas propostas com o usuário.
2. Iniciar a criação da API Route / Fetch de dados de campanhas se não existir.
3. Montar a UI dos Filtros e a estrutura base da Tabela.
