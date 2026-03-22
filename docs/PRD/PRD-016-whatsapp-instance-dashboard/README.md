# PRD-016: WhatsApp Instance Dashboard Redesign

## Problema

A tela de detalhe de uma instância WhatsApp (`/settings/whatsapp/[phoneId]`) é fragmentada e navega o usuário para sub-páginas separadas para cada ação. O resultado é:

- **3 cliques** para abrir templates (hub card → sub-página)
- **3 cliques** para enviar um teste (hub card → sub-página → preencher)
- Perfil comercial em sub-página separada, sem contexto do número
- Layout de "cards de atalho" (hub) — não é uma tela de gerenciamento real
- `business-profile` usa o primeiro `phoneId` da org — bug em orgs com múltiplas instâncias

## Solução

Consolidar tudo em **uma única tela** inspirada no ManyChat:

- Header rico com dados reais do número (flag, número, nome, status, qualidade)
- Seção de perfil comercial do número específico (foto, sobre, categoria)
- Seção de templates diretamente na página (sem navegar para sub-página)
- Botão "Enviar Teste" que abre um **Sheet lateral** com seletor de template + número destino

## Objetivo

O usuário abre a instância e **vê tudo de uma vez** — sem sair da página para gerenciar.

## Escopo

### IN
- Novo layout da página `/settings/whatsapp/[phoneId]`
- Seção de perfil (foto, nome verificado, about, vertical, email, websites)
- Seção de templates (lista com status badge, categoria, idioma)
- Sheet de "Enviar Teste" (seletor de template + número destino + variáveis)
- Endpoint `GET /api/v1/whatsapp/phone-numbers/[phoneId]/profile` — perfil por número específico
- Endpoint correto para templates por número específico (já existe, mantém)

### OUT
- Edição de perfil (read-only, link para Business Manager)
- Criação/edição de templates (mantém em sub-página `/templates` para quem precisar)
- Estatísticas de envio (fora do escopo desta tela)
- Remoção das sub-páginas existentes (mantém para acesso direto via URL)

## Referência Visual

ManyChat — painel de canal conectado:
- Header com avatar/foto + nome + badge de status
- Métricas rápidas abaixo do header
- Seções com conteúdo real, não cards de navegação
- Ação principal ("Enviar") sempre visível como botão proeminente
