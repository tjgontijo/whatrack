# PRD — Mastra Server no Portainer

**Status:** Draft
**Data:** 2026-02-25
**Versão:** 1.1
**Público:** Desenvolvedor com conhecimento básico de Docker e Portainer

---

## O que vamos fazer

Criar um servidor separado para o Mastra AI — o sistema de agentes inteligentes do WhaTrack — e hospedá-lo no seu Portainer usando Docker Swarm, exatamente como você faz com o Centrifugo e o Redis.

Hoje o Mastra roda "dentro" do Next.js. O objetivo é tirá-lo de lá e colocá-lo num container próprio, acessível em `https://mastra.whatrack.com`.

---

## Por que fazer isso

- **Mastra Studio**: interface visual para ver e testar seus agentes AI. Só funciona quando o Mastra roda em servidor próprio
- **Deploy independente**: atualizar a lógica de AI sem precisar fazer deploy do Next.js inteiro
- **Isolamento**: se o Mastra travar ou consumir muita memória, não afeta o site principal

---

## Glossário (para não se perder)

| Termo | O que é |
|---|---|
| **Imagem Docker** | Um "pacote" com tudo que a aplicação precisa para rodar. Como um executável, mas para servidores |
| **Container** | Uma imagem Docker em execução. Como um processo isolado |
| **Registry** | Um "armazém" de imagens Docker na nuvem. O GHCR é o armazém gratuito do GitHub |
| **GHCR** | GitHub Container Registry — onde suas imagens ficam guardadas, de graça, vinculadas ao seu GitHub |
| **GitHub Actions** | Sistema de automação do GitHub. Executa tarefas automaticamente quando você faz push de código |
| **Stack** | No Portainer, é um conjunto de serviços definidos num arquivo YAML — exatamente como você já usa |
| **Webhook** | Uma URL que, quando "chamada" (via HTTP POST), dispara uma ação — neste caso, atualiza o container |
| **Bun** | Runtime JavaScript mais rápido que Node.js. Usado para rodar o CLI do Mastra em desenvolvimento |
| **`mastra build`** | Comando do Mastra CLI que empacota seus agentes num servidor Hono pronto para produção |
| **`.mastra/output/`** | Pasta gerada pelo `mastra build` com o servidor completo e auto-contido |
| **Hono** | Framework HTTP leve que o Mastra usa internamente para expor os agentes como API |
| **Traefik** | O reverse proxy que você já usa — ele que pega `mastra.whatrack.com` e redireciona para o container certo |

---

## Como o Mastra funciona em produção

O Mastra tem um CLI próprio. O fluxo é:

```
Você escreve os agentes em TypeScript
       ↓
bunx mastra build
       ↓
Gera a pasta .mastra/output/ com um servidor Hono completo
       ↓
node .mastra/output/index.mjs
       ↓
Servidor rodando na porta 4111
```

O `output/` é **auto-contido** — tem tudo dentro, inclusive as dependências. Você pode copiá-lo para qualquer servidor com Node.js e rodar.

Endpoints gerados automaticamente pelo Mastra:
- `GET /health` — verifica se o servidor está vivo
- `GET /openapi.json` — documentação da API
- `GET /swagger-ui` — interface visual da API
- `GET /` — Mastra Studio (só em desenvolvimento)

---

## Visão geral do fluxo de deploy

```
git push → GitHub Actions → bunx mastra build → docker build → push GHCR → webhook Portainer → container atualizado
```

Em detalhes:

1. Você cria um repositório privado no GitHub chamado `whatrack-mastra`
2. Toda vez que fizer `git push`, o GitHub Actions automaticamente:
   - Instala as dependências com Bun
   - Roda `bunx mastra build` para gerar o servidor
   - Builda a imagem Docker com o output gerado
   - Envia essa imagem para o GHCR (armazém do GitHub)
3. O Portainer recebe uma notificação (webhook) e atualiza o container com a nova imagem
4. `mastra.whatrack.com` já está respondendo com a versão nova

Para o **primeiro deploy**, você vai:
1. Criar o repositório e fazer o primeiro push manualmente
2. Cadastrar as credenciais do GHCR no Portainer (uma única vez)
3. Colar o YAML do stack no Portainer

---

## Passo a Passo

---

### PARTE 1 — Criar o repositório no GitHub

1. Acesse [github.com](https://github.com) e clique em **New repository**
2. Nome: `whatrack-mastra`
3. Visibilidade: **Private**
4. Clique em **Create repository**

---

### PARTE 2 — Criar o projeto com o CLI do Mastra

No terminal, na pasta onde você quer criar o projeto:

```bash
# Cria o projeto interativamente com Bun
bunx create-mastra@latest
```

O CLI vai perguntar:
- **Nome do projeto:** `whatrack-mastra`
- **Provider de LLM:** escolha `Groq` (já usa no projeto) ou `OpenAI`
- **Componentes:** selecione `Agents` e `Tools`

O CLI cria a seguinte estrutura:

```
whatrack-mastra/
├── src/
│   └── mastra/
│       ├── index.ts          ← configuração principal do Mastra
│       ├── agents/
│       │   └── weather-agent.ts   ← exemplo gerado (você vai substituir)
│       └── tools/
│           └── weather-tool.ts    ← exemplo gerado (você vai substituir)
├── .github/
│   └── workflows/            ← você vai criar aqui
├── package.json
└── .env
```

Depois de criado, entre na pasta:
```bash
cd whatrack-mastra
```

Teste se está funcionando em desenvolvimento:
```bash
bun run dev
# Mastra Studio abre em http://localhost:4111
```

---

### PARTE 3 — Adicionar o Dockerfile

O Dockerfile ensina o Docker a empacotar sua aplicação. O Mastra usa `mastra build` que gera um servidor Node.js — por isso o container final roda com Node, não com Bun.

Crie o arquivo `Dockerfile` na raiz do projeto:

```dockerfile
# ---- Etapa 1: Build ----
# Usa Bun para instalar dependências e rodar o mastra build
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências
COPY package.json bun.lockb* ./

# Instala as dependências
RUN bun install --frozen-lockfile

# Copia o código fonte
COPY . .

# Roda o build do Mastra
# Gera a pasta .mastra/output/ com o servidor pronto
RUN bunx mastra build

# ---- Etapa 2: Produção ----
# Usa Node.js para rodar o servidor gerado
# (o mastra build gera um servidor Node, não Bun)
FROM node:20-alpine AS production

WORKDIR /app

# Copia apenas o output gerado — tudo que precisa está aqui
COPY --from=builder /app/.mastra/output ./

# Informa que o container vai usar a porta 4111
EXPOSE 4111

# Inicia o servidor
CMD ["node", "index.mjs"]
```

**Por que duas etapas?**
A primeira etapa (builder) usa Bun para instalar dependências e buildar. A segunda etapa (production) usa apenas o Node.js com o resultado final — a imagem fica muito menor porque não carrega o Bun, o código fonte, nem as dependências de desenvolvimento.

---

### PARTE 4 — Adicionar o .dockerignore

Crie o arquivo `.dockerignore` na raiz para evitar copiar arquivos desnecessários para dentro da imagem:

```
node_modules
.mastra
.env
.env.*
*.md
.git
.gitignore
```

---

### PARTE 5 — Configurar o GitHub Actions

Crie o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Build e Deploy

# Executa toda vez que você fizer push na branch main
on:
  push:
    branches:
      - main

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      # 1. Baixa o código do repositório
      - name: Checkout do código
        uses: actions/checkout@v4

      # 2. Faz login no GHCR (armazém de imagens do GitHub)
      #    O GITHUB_TOKEN é criado automaticamente pelo GitHub — você não precisa fazer nada
      - name: Login no GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # 3. Builda a imagem Docker e envia para o GHCR
      #    O nome da imagem segue o padrão: ghcr.io/SEU_USUARIO/whatrack-mastra:latest
      - name: Build e push da imagem
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:latest

      # 4. Avisa o Portainer que tem imagem nova para puxar
      #    A URL do webhook você vai pegar no Portainer (Parte 7)
      - name: Notificar Portainer para atualizar
        run: |
          curl -X POST "${{ secrets.PORTAINER_WEBHOOK_MASTRA }}"
```

---

### PARTE 6 — Cadastrar credenciais do GHCR no Portainer

O Portainer precisa de permissão para baixar imagens do seu repositório privado no GHCR.

#### Criar um Personal Access Token no GitHub

1. No GitHub, clique na sua foto (canto superior direito) → **Settings**
2. No menu lateral esquerdo, role até o fim → **Developer settings**
3. Clique em **Personal access tokens** → **Tokens (classic)**
4. Clique em **Generate new token (classic)**
5. Preencha:
   - **Note:** `portainer-ghcr`
   - **Expiration:** `No expiration` (ou 1 ano)
   - **Permissões:** marque apenas `read:packages`
6. Clique em **Generate token**
7. **Copie o token agora** — ele só aparece uma vez. Salve num lugar seguro.

#### Cadastrar no Portainer

1. Acesse seu Portainer
2. No menu lateral, clique em **Registries**
3. Clique em **Add registry**
4. Escolha **Custom registry**
5. Preencha:
   - **Name:** `GitHub GHCR`
   - **Registry URL:** `ghcr.io`
   - **Username:** seu usuário do GitHub (ex: `thiagomatar`)
   - **Password:** o token que você copiou acima
6. Clique em **Add registry**

Pronto — o Portainer agora consegue puxar imagens privadas do GHCR automaticamente.

---

### PARTE 7 — Primeiro push e verificação do build

Agora vamos enviar o código para o GitHub pela primeira vez.

No terminal, na pasta `whatrack-mastra`:

```bash
git init
git add .
git commit -m "feat: initial mastra server"
git remote add origin https://github.com/SEU_USUARIO/whatrack-mastra.git
git push -u origin main
```

Substitua `SEU_USUARIO` pelo seu usuário do GitHub.

Após o push:
1. Acesse o repositório no GitHub
2. Clique na aba **Actions**
3. Você vai ver o workflow `Build e Deploy` rodando
4. Aguarde ~3-5 minutos até ficar verde ✅

Se ficar vermelho ❌, clique no job com erro para ver o log e identificar o problema.

Quando verde, sua imagem estará disponível em:
```
ghcr.io/SEU_USUARIO/whatrack-mastra:latest
```

---

### PARTE 8 — Criar o Stack no Portainer

1. Acesse seu Portainer
2. Vá em **Stacks** → **Add stack**
3. Nome: `mastra_whatrack`
4. Escolha **Web editor** e cole o YAML abaixo

---

### YAML do Stack

Cole este YAML no Portainer. Substitua os valores marcados com `← SUBSTITUIR`:

```yaml
version: "3.7"

services:
  mastra_whatrack:
    # Substitua SEU_USUARIO pelo seu usuário do GitHub
    image: ghcr.io/SEU_USUARIO/whatrack-mastra:latest   # ← SUBSTITUIR

    networks:
      - redeinterna

    environment:
      - PORT=4111
      # production = Mastra Studio desabilitado (mais seguro)
      # development = Mastra Studio habilitado (use só para testar)
      - NODE_ENV=production

      # Banco de dados — mesmo DATABASE_URL que o Next.js usa
      - DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=verify-full   # ← SUBSTITUIR

      # Modelos de AI
      - GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx    # ← SUBSTITUIR
      - OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx   # ← SUBSTITUIR

      # Centrifugo — copie os valores do seu stack do Centrifugo
      - CENTRIFUGO_URL=https://centrifugo.whatrack.com
      - CENTRIFUGO_API_KEY=7f5a2d9c4e8b1a6f3d0c9e7b2a4f6c1d    # ← SUBSTITUIR
      - CENTRIFUGO_TOKEN_HMAC_SECRET_KEY=1a9e5c7b3d4f8a2c6e0b7d9f4a1c3e5b   # ← SUBSTITUIR

      # Chave interna — o Next.js usa isso para autenticar chamadas ao Mastra
      # Crie uma string aleatória longa em: https://www.uuidgenerator.net/version4
      - MASTRA_API_KEY=CRIE_UMA_CHAVE_ALEATORIA_AQUI   # ← SUBSTITUIR

    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 3
      labels:
        - traefik.enable=1
        - traefik.http.routers.mastra.rule=Host(`mastra.whatrack.com`)
        - traefik.http.routers.mastra.entrypoints=websecure
        - traefik.http.routers.mastra.priority=1
        - traefik.http.routers.mastra.tls.certresolver=letsencryptresolver
        - traefik.http.routers.mastra.service=mastra
        - traefik.http.services.mastra.loadbalancer.server.port=4111
        - traefik.http.services.mastra.loadbalancer.server.scheme=http

networks:
  redeinterna:
    external: true
    name: redeinterna
```

5. Clique em **Deploy the stack**

---

### PARTE 9 — Configurar o webhook para deploy automático

Agora você vai conectar o Portainer ao GitHub Actions para que todo `git push` atualize o container automaticamente.

#### Pegar a URL do webhook no Portainer

1. No Portainer, vá em **Stacks**
2. Clique no stack `mastra_whatrack`
3. Procure a seção **Webhooks** na página do stack
4. Clique em **Enable** para ativar o webhook
5. Copie a URL gerada — ela vai parecer com:
   ```
   https://portainer.seudominio.com/api/webhooks/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

#### Cadastrar no GitHub

1. No repositório `whatrack-mastra`, vá em **Settings**
2. No menu lateral, clique em **Secrets and variables** → **Actions**
3. Clique em **New repository secret**
4. Preencha:
   - **Name:** `PORTAINER_WEBHOOK_MASTRA`
   - **Secret:** cole a URL do webhook do Portainer
5. Clique em **Add secret**

A partir de agora, todo `git push` na branch `main`:
1. GitHub Actions builda a imagem nova
2. Envia para o GHCR
3. Chama a URL do webhook do Portainer
4. Portainer baixa a imagem nova e recria o container automaticamente

---

### PARTE 10 — Verificar se está funcionando

#### Checar o container no Portainer

1. Vá em **Containers** no Portainer
2. Procure `mastra_whatrack`
3. Status deve ser **running** (verde)
4. Clique no container → **Logs** para ver se inicializou sem erros

Você deve ver algo como:
```
Mastra server running on port 4111
```

#### Testar o endpoint de saúde

```bash
curl https://mastra.whatrack.com/health
```

Deve retornar:
```json
{"status": "ok"}
```

#### Testar deploy automático

Faça uma mudança qualquer no código (ex: adicione um comentário), commite e faça push:

```bash
git add .
git commit -m "test: verificar deploy automático"
git push
```

Acompanhe na aba **Actions** do GitHub. Quando terminar, o container no Portainer deve ter reiniciado com a nova imagem.

---

### PARTE 11 — Acessar o Mastra Studio

O Studio só fica ativo quando `NODE_ENV=development`. Para acessá-lo:

1. No Portainer, vá no stack `mastra_whatrack`
2. Clique em **Editor**
3. Mude `NODE_ENV=production` para `NODE_ENV=development`
4. Clique em **Update the stack**
5. Acesse `https://mastra.whatrack.com` no navegador

**Lembre de voltar para `production` depois** — em development o Studio fica exposto publicamente sem autenticação.

---

## Variáveis de Ambiente — Resumo

| Variável | Onde pegar |
|---|---|
| `DATABASE_URL` | Mesma do Next.js (painel do Neon) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) → API Keys |
| `CENTRIFUGO_API_KEY` | Copiar do stack do Centrifugo no Portainer |
| `CENTRIFUGO_TOKEN_HMAC_SECRET_KEY` | Copiar do stack do Centrifugo no Portainer |
| `MASTRA_API_KEY` | Você cria — gere em [uuidgenerator.net](https://www.uuidgenerator.net/version4) |

---

## Próximo passo após o deploy

Com o Mastra rodando em servidor próprio, o Next.js precisa parar de executar os agentes localmente e passar a chamar o Mastra via HTTP.

A chamada vai mudar de executar o agente diretamente para uma requisição HTTP autenticada com a `MASTRA_API_KEY`. Isso será detalhado no próximo PRD de integração.

---

## Checklist de Deploy

- [ ] Repositório `whatrack-mastra` criado no GitHub (privado)
- [ ] Projeto criado com `bunx create-mastra@latest`
- [ ] `Dockerfile` criado na raiz
- [ ] `.dockerignore` criado na raiz
- [ ] `.github/workflows/deploy.yml` criado
- [ ] Primeiro `git push` feito
- [ ] GitHub Actions passou com ✅ (aba Actions no GitHub)
- [ ] Imagem visível no GHCR (`github.com/SEU_USUARIO/whatrack-mastra/packages`)
- [ ] Personal Access Token criado no GitHub (`read:packages`)
- [ ] Registry GHCR cadastrado no Portainer
- [ ] YAML do stack colado no Portainer com todos os valores substituídos
- [ ] Stack deployado com sucesso (container verde no Portainer)
- [ ] `https://mastra.whatrack.com/health` retornando `{"status":"ok"}`
- [ ] Webhook do Portainer copiado e cadastrado como secret no GitHub
- [ ] Teste de deploy automático funcionando (push → container atualiza)
