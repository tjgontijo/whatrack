'use client'

import React, { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  Plus,
  Save,
  Trash2,
  Bot,
  Target,
  FileOutput,
  Puzzle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AgentSkillBindings } from '@/components/dashboard/ai/agent-skill-bindings'
import { AI_SKILLS_QUERY_KEY } from '@/hooks/ai/use-ai-skills'
import type { AiSkill } from '@/types/ai/ai-skill'
import type { AiAgentSkillBinding, FormSkillBinding } from '@/types/ai/ai-agent-skill'

// ---------- Types ----------

interface AgentData {
  id: string
  name: string
  leanPrompt: string
  model: string
  isActive: boolean
  triggers: { eventType: string; conditions: Record<string, unknown> }[]
  schemaFields: {
    fieldName: string
    fieldType: string
    description: string
    isRequired: boolean
    options?: unknown
  }[]
  skillBindings: AiAgentSkillBinding[]
}

// ---------- AgentBuilderForm ----------

interface AgentBuilderFormProps {
  agent: AgentData | null
  allSkills: AiSkill[]
  isNew: boolean
}

function AgentBuilderForm({ agent, allSkills, isNew }: AgentBuilderFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [name, setName] = useState(agent?.name ?? '')
  const [leanPrompt, setLeanPrompt] = useState(agent?.leanPrompt ?? '')
  const [model, setModel] = useState(agent?.model ?? 'llama-3.3-70b-versatile')
  const [isActive, setIsActive] = useState(agent?.isActive ?? true)
  const [triggers, setTriggers] = useState<{ eventType: string; conditions: Record<string, unknown> }[]>(
    agent?.triggers ?? [],
  )
  const [schemaFields, setSchemaFields] = useState<
    { fieldName: string; fieldType: string; description: string; isRequired: boolean; options?: unknown }[]
  >(agent?.schemaFields ?? [])
  const [skillBindings, setSkillBindings] = useState<FormSkillBinding[]>(
    agent?.skillBindings?.map((b) => ({
      skillId: b.skillId,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      skill: b.skill,
    })) ?? [],
  )
  const [isSaving, setIsSaving] = useState(false)

  function handleAddTrigger() {
    setTriggers([...triggers, { eventType: 'TICKET_WON', conditions: {} }])
  }

  function handleUpdateTrigger(index: number, val: string) {
    setTriggers(triggers.map((t, i) => (i === index ? { ...t, eventType: val } : t)))
  }

  function handleRemoveTrigger(index: number) {
    setTriggers(triggers.filter((_, i) => i !== index))
  }

  function handleAddField() {
    setSchemaFields([
      ...schemaFields,
      { fieldName: '', fieldType: 'STRING', description: '', isRequired: true },
    ])
  }

  function handleUpdateField(index: number, key: string, val: unknown) {
    setSchemaFields(schemaFields.map((f, i) => (i === index ? { ...f, [key]: val } : f)))
  }

  function handleRemoveField(index: number) {
    setSchemaFields(schemaFields.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!name.trim() || !leanPrompt.trim() || triggers.length === 0 || schemaFields.length === 0) {
      toast.error('Preencha Nome, Prompt Enxuto, e adicione pelo menos um Trigger e um Schema Field.')
      return
    }

    setIsSaving(true)
    const toastId = toast.loading('Salvando agente...')

    const payload = {
      name,
      leanPrompt,
      model,
      isActive,
      triggers,
      schemaFields,
      skillBindings: skillBindings.map(({ skillId, sortOrder, isActive: sa }) => ({
        skillId,
        sortOrder,
        isActive: sa,
      })),
    }

    try {
      const url = isNew ? '/api/v1/ai-agents' : `/api/v1/ai-agents/${agent?.id}`
      const method = isNew ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error()
      toast.success('Agente salvo com sucesso!', { id: toastId })
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] })
      router.push('/dashboard/settings/ai')
    } catch {
      toast.error('Falha ao salvar agente.', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              {isNew ? 'Criar Novo Copiloto' : 'Editar Copiloto'}
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure o papel da IA, quando ela deve acordar, e o que ela deve extrair.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="mr-4 flex items-center gap-2">
            <Label>Agente Ativo?</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Agente'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* 1. Identidade e Cérebro */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="text-primary h-5 w-5" /> Identidade e Cérebro
            </CardTitle>
            <CardDescription>Defina quem é o agente e como ele deve se comportar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Agente</Label>
              <Input
                placeholder="Ex: Auditor de Tráfego CAPI"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prompt Enxuto</Label>
              <p className="text-muted-foreground text-xs">
                Identidade e foco do agente. Regras comportamentais transversais ficam nas Skills.
              </p>
              <Textarea
                className="min-h-[160px] resize-none whitespace-pre-wrap font-mono text-sm leading-relaxed"
                placeholder="Você é o inspetor de vendas. Analise o chat. Se o cliente falar que pagou via PIX ou boleto, classifique como SALE."
                value={leanPrompt}
                onChange={(e) => setLeanPrompt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo LLM Base</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a inteligência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llama-3.3-70b-versatile">
                    LLaMA 3.3 (70B) - Groq Rápido
                  </SelectItem>
                  <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini - OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 2. Triggers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="text-destructive h-5 w-5" /> Triggers (Gatilhos)
            </CardTitle>
            <CardDescription>Quando o agente deve analisar o CRM?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {triggers.length === 0 && (
              <div className="text-muted-foreground rounded-md border border-dashed py-4 text-center text-sm">
                Nenhum gatilho definido. O agente nunca vai acordar automático.
              </div>
            )}
            {triggers.map((t, idx) => (
              <div
                key={idx}
                className="bg-muted/30 group relative flex flex-col gap-2 rounded-md border p-3"
              >
                <Label className="text-xs">Evento de Disparo</Label>
                <Select value={t.eventType} onValueChange={(val) => handleUpdateTrigger(idx, val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TICKET_WON">Ticket Fechado (Ganhamos)</SelectItem>
                    <SelectItem value="TICKET_LOST">Ticket Fechado (Perda/Lost)</SelectItem>
                    <SelectItem value="TICKET_CLOSED">
                      Sempre que um ticket for arquivado
                    </SelectItem>
                    <SelectItem value="CONVERSATION_IDLE_3M">
                      3 Min sem Resposta na Caixa
                    </SelectItem>
                    <SelectItem value="NEW_MESSAGE_RECEIVED">
                      Ao receber nova Mensagem Cliente
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-destructive/10 text-destructive hover:bg-destructive absolute -right-2 -top-2 h-6 w-6 rounded-full opacity-0 transition-all hover:text-white group-hover:opacity-100"
                  onClick={() => handleRemoveTrigger(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={handleAddTrigger}
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Gatilho
            </Button>
          </CardFooter>
        </Card>

        {/* 3. Output Schema */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileOutput className="h-5 w-5 text-indigo-500" /> Variáveis de Extração (Zod
              Dinâmico)
            </CardTitle>
            <CardDescription>
              O que o LLM deve garimpar dentro do histórico do WhatsApp e te entregar mastigado?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground grid grid-cols-12 gap-4 border-b pb-2 text-sm font-medium">
              <div className="col-span-3">Propriedade (Inglês)</div>
              <div className="col-span-3">Tipo do Dado</div>
              <div className="col-span-4">Descrição (Guia pra IA achar isso)</div>
              <div className="col-span-1 text-center">Obrig.</div>
              <div className="col-span-1"></div>
            </div>

            {schemaFields.length === 0 && (
              <div className="text-muted-foreground rounded-md border border-dashed py-8 text-center text-sm">
                Você precisa adicionar pelo menos um campo que a IA vai preencher.
              </div>
            )}

            {schemaFields.map((field, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center gap-4">
                <div className="col-span-3">
                  <Input
                    placeholder="Ex: dealValue"
                    value={field.fieldName}
                    onChange={(e) =>
                      handleUpdateField(idx, 'fieldName', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))
                    }
                  />
                </div>
                <div className="col-span-3">
                  <Select
                    value={field.fieldType}
                    onValueChange={(val) => handleUpdateField(idx, 'fieldType', val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STRING">Texto Curto (String)</SelectItem>
                      <SelectItem value="NUMBER">Número Decimal (Moeda)</SelectItem>
                      <SelectItem value="BOOLEAN">Verdadeiro/Falso</SelectItem>
                      <SelectItem value="ENUM">Lista Determinada (Ex: Níveis)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Descreva exatamente o que é isso para o Agente ler"
                    value={field.description}
                    onChange={(e) => handleUpdateField(idx, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex justify-center text-center">
                  <Checkbox
                    checked={field.isRequired}
                    onCheckedChange={(c) => handleUpdateField(idx, 'isRequired', c)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveField(idx)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" onClick={handleAddField}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar Variável
            </Button>
          </CardFooter>
        </Card>

        {/* 4. Skills Vinculadas */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Puzzle className="text-primary h-5 w-5" /> Skills Vinculadas
            </CardTitle>
            <CardDescription>
              Combine blocos de instrução para compor o comportamento completo do agente.
            </CardDescription>
          </CardHeader>
          <AgentSkillBindings
            allSkills={allSkills}
            value={skillBindings}
            onChange={setSkillBindings}
            agentId={agent?.id}
          />
        </Card>
      </div>
    </div>
  )
}

// ---------- Page shell (data fetching) ----------

export default function AiAgentBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const isNew = id === 'new'

  const { data: agentData, isLoading: agentLoading } = useQuery({
    queryKey: ['ai-agents', id],
    queryFn: async (): Promise<AgentData> => {
      const res = await fetch(`/api/v1/ai-agents/${id}`)
      if (!res.ok) throw new Error('Agente não encontrado.')
      const data = await res.json()
      return data.agent
    },
    enabled: !isNew,
    retry: false,
    throwOnError: () => {
      router.push('/dashboard/settings/ai')
      return false
    },
  })

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: AI_SKILLS_QUERY_KEY,
    queryFn: async (): Promise<AiSkill[]> => {
      const res = await fetch('/api/v1/ai-skills')
      if (!res.ok) throw new Error('Erro ao carregar skills.')
      const data = await res.json()
      return data.skills ?? []
    },
  })

  const isLoading = (!isNew && agentLoading) || skillsLoading

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <AgentBuilderForm
      key={agentData?.id ?? 'new'}
      agent={agentData ?? null}
      allSkills={skillsData ?? []}
      isNew={isNew}
    />
  )
}
