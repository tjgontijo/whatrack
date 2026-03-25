# PRD-024: Sistema de Evolução Autônoma de Agentes (AgentOps)

## 1. Visão Geral do Produto
Construir um ambiente contínuo de evolução de agentes IA (*Mastra*), deixando de lado heurísticas manuais de "prompt engineering" em favor de um sistema empírico guiado por testes (Golden Dataset). O sistema criará variações de agentes de forma autônoma, medirá os resultados (taxa de acertos nas funções, custos, latências) em um ambiente controlado, e promoverá as versões de melhor performance, funcionando como um algoritmo genético de melhoria contínua para AIs.

### O Problema
Desenvolver e manter agentes confiáveis apenas ajustando prompts é frágil e sujeito a regressões. Quando a base de conhecimento cresce, ou quando mudamos as LLMs (ex: GPT-4o para Claude 3.5), modificações no prompt costumam introduzir falhas imprevistas em casos de uso antigos.
Não há garantia de que uma mudança "melhor" seja empiricamente comprovada sem A/B testing sistêmico.

### A Solução
Adotar uma arquitetura "Mastra-first" com foco em **Skill Verification**. Em vez da saída gerada, mediremos as decisões sistêmicas da IA (qual ferramenta acionou, velocidade de raciocínio, consumo de tokens). As configurações do agente são parametrizadas no banco de dados e ciclicamente submetidas a uma "Função de Aptidão" que avalia as variações em background e elege um "vencedor".

## 2. Objetivos Principais
- **Confiabilidade Experimental:** Garantir que nenhuma alteração em agentes vá para produção sem prova empírica de melhoria.
- **Otimização de Custos e Latência:** Ter o sistema testando LLMs "menores" ou com menor temperatura automaticamente e decidindo se elas têm a mesma proficiência que os modelos caros.
- **Interface Visual de Controle (Next.js):** Oferecer aos administradores um mapa visual ("Árvore Evolutiva") de variações, taxa de falha (Failure Rate), e Custo per Task.
- **Isolamento de Erros:** O "Campeão" atual nunca tem downtime, sendo substituído por "Desafiantes" apenas quando o placar de segurança assim determina.

## 3. Arquitetura do Sistema

O sistema é dividido em 4 pilares ("Módulos de Vida do Agente"):

### A. O "Genoma" do Agente (Parametrização - Prisma)
Os agentes no WhaTrack/Sistema não serão hardcoded. As classes do Mastra importarão os atributos via Prisma:
- `systemPrompt`: Instruções textuais base.
- `skills`: Lista de IDs/nomes arbitrários das ferramentas do Mastra ativas.
- `modelProvider` & `modelId`: Qual LLM (ex: `openai`, `anthropic`, `gpt-4o-mini`).
- `generationParams`: Temperatura, top_p, etc.

### B. Golden Dataset (Cenários de Teste)
Tabela de assertividade para testes E2E dos agentes, composta de inputs e outputs esperados (ex: Expectativa de chamada exata de uma `Skill`).

### C. Motor de Avaliação Específica (*Fitness Function*)
- **Execução Sandboxed:** Pega os cenários de teste, instancia dinamicamente o modelo Mastra e roda de forma assíncrona.
- **Cálculo de Score (0 a 100):** Analisa a telemetria das chamadas em background geradas. O peso se baseia em `(Acertos de Routing x Peso_A) - (Custos de Tokens x Peso_B) - (Tempo x Peso_C)`.

### D. Loop Evolutivo Assíncrono (Next.js Background Jobs/Inngest/CRON)
Um job responsável por realizar as "Mutações" no banco. Cria variações de agentes baseadas no atual (mudando leves instruções no prompt ou testando modelos diferentes), roda a Avaliação (Passo C) sobre o Dataset (Passo B) e consolida a "Versão Ativa".

### E. Dashboard de Visibilidade (Painel Admin)
- Visão tabular de Experimentos.
- Gráficos de barra comparativos (V1 vs V2).
- Logs de Traço (Por que a V3 perdeu para a V2 em uma intenção X).

## 4. Fases de Implementação (MVP)

**Fase 1: Configuração Básica e Prisma Schema**
- Migração no Prisma adicionando os domínios `AgentConfig`, `AgentVersion`, `AgentEvaluationTest`, e `EvaluationSession`.
- Adaptação na criação dos agentes do Mastra para instanciar via dados recebidos dessa camada de BD, ao invés de codificá-lo de forma estática nos repositórios.

**Fase 2: Motor de AB Testing Unitário**
- Uma interface administrativa simples (Next.js `/admin/agents`) que permita:
  - Criar um registro de Agente e uma Ver.2 manual.
  - Adicionar 5 a 10 cenários simples na tabela (input -> anticipated skill call).
  - Executar os testes apertando no botão "Run Benchmark", com saída exibida num terminal em tela.

**Fase 3: Refinamento de Telemetria e UI**
- Adição da leitura dos logs do Mastra para calcular a performance de Custo e Latência de fato.
- Dashboard gráfico visual exibindo as taxas de aproveitamento e Custo x Benefício.

**Fase 4: Automação Total (Evolution Loop)**
- Worker ou trigger noturno que analisa dados recentes com falha, alimenta a IA generadora (Metaprompting) para melhorar a diretiva base com o aprendizado da falha, cria nova Var (Desafiante), testa novamente com todas as assertividades passadas e elege o Campeão.

## 5. Rascunho das Camadas de Dados (Prisma)

O esquema relacional focaria numa arquitetura de versão imutável, onde todo deploy empírico de um novo Desafiante aciona uma nova tupla interligada.

```prisma
// Um modelo macro que condensa as skills.
model AgentIdentity {
  id             String         @id @default(cuid())
  name           String
  description    String?
  versions       AgentVersion[]

  activeVersionId String? // Aponta qual tá em 'produção' (Campeão) 
}

// A configuração paramétrica daquela tentativa/mutação. 
model AgentVersion {
  id               String   @id @default(cuid())
  agentIdentityId  String
  agentIdentity    AgentIdentity @relation(fields: [agentIdentityId], references: [id])

  // Genoma Genético
  systemPrompt     String
  modelProvider    String
  modelId          String
  temperature      Float @default(0.2)
  embeddedSkills   Json  // ['cancel_plan', 'query_usage', 'human_handoff']

  // Resultados das evoluções
  isChampion       Boolean @default(false)
  winRate          Float?  
  averageCost      Float?
  averageLatencyMs Float?

  testResults      EvaluationResult[]
  createdAt        DateTime @default(now())
}

// O cenário fixo que todo agente precisa passar (Golden Test)
model GoldenTest {
  id             String @id @default(cuid())
  name           String
  userMessage    String     // "Oi, quero cancelar meu serviço"
  expectedSkill  String     // "cancelar_sistema"
  shouldReject   Boolean @default(false)   // flag para cenários de teste adversos
}

// O resultado da medição desse cenário numa versão do agente
model EvaluationResult {
  id               String @id @default(cuid())
  agentVersionId   String
  agentVersion     AgentVersion @relation(fields: [agentVersionId], references: [id])
  goldenTestId     String // Sem strict relational check para testes mutaveis se preferir

  // Métricas
  success        Boolean // Acertou a ExpectedSkill?
  cost           Float   // Custou $X a API?
  latencyMs      Int
  calledSkill    String? // A skill que ele chamou de fato
  logTrace       String? // Stacktrace do LLM
  
  createdAt      DateTime @default(now())
}
```
