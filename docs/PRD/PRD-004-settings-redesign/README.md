# PRD-004: Settings Redesign — Estrutura, Design e Separação por Nível

## Sumário

Reestruturação completa das páginas de configuração do dashboard. O objetivo é separar claramente o que é **configuração de workspace/canal** (settings) do que é **conteúdo operacional** (app), eliminar inconsistências visuais entre páginas, introduzir um padrão único de formulário e refletir corretamente os níveis de acesso (membro, admin, owner) na sidebar de settings.

## Problema

1. **Conteúdo operacional dentro de settings**: Catálogo (itens/categorias) e Pipeline (etapas do kanban) são configurações operacionais que o usuário precisa durante o fluxo de trabalho, mas estão escondidas em settings como se fossem configurações de sistema.

2. **Ausência de padrão visual**: Cada página de settings foi construída de forma independente. Resultado: Profile tem 5 botões "Salvar" separados, Organization tem fluxo de preview multi-estado, WhatsApp tem layout próprio sem `PageShell`, Meta Ads não segue nenhum padrão.

3. **Sem separação de nível de acesso**: Planos, Cobrança e ferramentas de admin aparecem misturadas com configurações normais de usuário.

4. **Webhooks isolado**: A configuração de Webhook do WhatsApp é uma página separada na sidebar, mas é apenas uma configuração técnica do canal WhatsApp — deveria ser uma tab dentro de WhatsApp.

## Solução

```
SETTINGS (antes)                    SETTINGS (depois)
─────────────────────────────────── ─────────────────────────────────────
CONTA                                CONTA
  Perfil                               Perfil
WORKSPACE                            WORKSPACE  
  Organização                          Organização
  Equipe                               Equipe  
  Projetos          ← remove       CANAIS
  Assinatura        ← move down      WhatsApp  (+ tab Webhooks)
CANAIS                               Meta Ads
  WhatsApp                           INTELIGÊNCIA
  Meta Ads                             IA Studio
  Webhooks          ← merge         GOVERNANÇA
OPERAÇÃO                               Auditoria
  Pipeline          ← vai para app    Assinatura  (owner only)
  Catálogo          ← vai para app  ADMIN  (admin/owner only)
  IA Studio         ← move up        Planos e Cobrança
GOVERNANÇA                             Design System
  Auditoria                        
ADMIN
  Planos e Cobrança
  Design System
```

**Pipeline** → Drawer/Sheet acessado via botão na página de Pipeline (kanban)
**Catálogo** → Seção própria no app (`/catalog`) com acesso direto na sidebar de app

## Métricas de Sucesso

- Settings com sidebar limpa e agrupada por contexto real de uso
- Todas as páginas seguindo o mesmo padrão visual (`SettingsRow`)
- Pipeline configurável sem sair da tela de kanban
- Catálogo acessível diretamente no app, não enterrado em settings
- Zero regressões: rotas existentes, permissões e dados preservados
- Somente admins/owners veem itens de admin na sidebar de settings

## Fora do Escopo

- Redesign da lógica de negócio de qualquer page (apenas UI/estrutura)
- Mudança no schema do banco de dados
- Alteração nas APIs existentes
- Responsividade mobile
- Internacionalização
