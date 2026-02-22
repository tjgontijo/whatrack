import type { PrismaClient } from '../generated/prisma/client'

const BASE_AGENTS = [
    {
        name: 'Mastra AI Copilot',
        icon: 'BrainCircuit', // Assuming Lucide icon name or similar identifier
        systemPrompt: `Você é o Mastra AI Copilot, um Supervisor de Vendas Inteligente atuando dentro de um CRM para Clínicas de Estética.
Sua única função é analisar as últimas mensagens trocadas no WhatsApp entre a clínica e o cliente e determinar em qual estágio a conversa está. Seu objetivo final é encontrar aprovações de Vendas ou leads com alta qualificação que estão a um passo de fechar negócio.

Regras Inflexíveis:
1. Sempre retorne as propriedades rigorosamente conforme o schema esperado.
2. Identifique o procedimento (productName) que o paciente está discutindo. Exemplo: "Botox", "Preenchimento Labial", "Limpeza de Pele". Se não for explícito mas ficar subentendido o interesse em uma categoria, tente deduzir cautelosamente ou retorne N/A.
3. Se houver acordo de valores fechados (ex: "combinado os 1500"), preencha o dealValue apenas com números.
4. "reasoning" (Justificativa) deve conter um pequeno texto de 1 a 2 sentenças citando o motivo ou trecho da conversa original que motivou a decisão.
5. Em "intent": 
    - "SALE": Use APENAS se o agendamento E fechamento for claro. O cliente concordou e a secretária finalizou.
    - "QUALIFIED": O cliente demonstrou alto interesse, pediu preço ou tem horário marcado mas não enviou pagamento/confirmação explícita de "fechado".
    - "NEUTRAL": Dúvida, sondagem inicial, suporte Pós-venda, reagendamento ou qualquer assunto não monetário de momento.
6. A sua "confidence" deve ser um float de 0.0 a 1.0 (onde 1.00 é certeza absoluta).`,
        model: 'llama-3.3-70b-versatile',
        isActive: true, // We will leave it active or inactive based on user pref, but seed active by default. Wait, the user said "ele pode apenas ativar ou não". Inactive by default is safer so it doesn't run without them knowing. Let's default to false.
        triggers: [
            {
                eventType: 'CONVERSATION_IDLE_3M',
                conditions: {}
            }
        ],
        schemaFields: [
            {
                fieldName: 'intent',
                fieldType: 'ENUM',
                description: 'Classifica a intenção atual da conversa ou fechamento do negócio.',
                isRequired: true,
                options: ['SALE', 'QUALIFIED', 'NEUTRAL']
            },
            {
                fieldName: 'productName',
                fieldType: 'STRING',
                description: 'Nome do procedimento, produto ou serviço conversado (Ex: Botox, Lipo, Preenchimento). Se não houver, deixe vazio.',
                isRequired: false,
            },
            {
                fieldName: 'dealValue',
                fieldType: 'NUMBER',
                description: 'Valor total negociado em número decimal (1500.00). Retorne sem moeda, apenas o numeral. Deixe nulo se não houver.',
                isRequired: false,
            },
            {
                fieldName: 'reasoning',
                fieldType: 'STRING',
                description: 'Texto justificando a avaliação. Cite a evidência da conversa original ou como chegou no intent listado.',
                isRequired: true,
            },
            {
                fieldName: 'confidence',
                fieldType: 'NUMBER',
                description: 'A confiabilidade dessa extração. Valor float de 0.0 até 1.0 (onde 1.00 significa 100% garantido).',
                isRequired: true,
            }
        ]
    }
]

export async function seedAiAgents(prisma: PrismaClient) {
    console.log('Seeding base AI Agents...')

    let organizations = await prisma.organization.findMany({
        orderBy: { createdAt: 'asc' },
    })

    // Same fallback as ticket stages just in case
    if (organizations.length === 0) {
        console.log('No organizations found. Creating default organization for seeds...')
        const ownerEmail = process.env.OWNER_EMAIL || 'admin@whatrack.com'
        const baseSlug = ownerEmail.split('@')[0]
        const organization = await prisma.organization.create({
            data: {
                name: 'Default Organization',
                slug: baseSlug,
            },
        })
        organizations = [organization]
    }

    for (const org of organizations) {
        for (const agent of BASE_AGENTS) {
            // Upsert the Agent itself
            const agentRecord = await prisma.aiAgent.upsert({
                where: {
                    organizationId_name: {
                        organizationId: org.id,
                        name: agent.name,
                    },
                },
                update: {
                    icon: agent.icon,
                    systemPrompt: agent.systemPrompt,
                    model: agent.model,
                    // note: we do NOT update isActive to respect user choices
                },
                create: {
                    organizationId: org.id,
                    name: agent.name,
                    icon: agent.icon,
                    systemPrompt: agent.systemPrompt,
                    model: agent.model,
                    isActive: false, // Inactive by default, users explicitly turn them on
                },
            })

            // Instead of deep nested writes which could duplicate triggers, we enforce current configuration

            // Update Triggers
            await prisma.aiTrigger.deleteMany({
                where: { agentId: agentRecord.id }
            })
            if (agent.triggers.length > 0) {
                await prisma.aiTrigger.createMany({
                    data: agent.triggers.map((t) => ({
                        agentId: agentRecord.id,
                        eventType: t.eventType,
                        conditions: t.conditions,
                    }))
                })
            }

            // Update Schema Fields (via Upsert since we added the composite key agentId_fieldName)
            for (const field of agent.schemaFields) {
                await prisma.aiSchemaField.upsert({
                    where: {
                        agentId_fieldName: {
                            agentId: agentRecord.id,
                            fieldName: field.fieldName,
                        }
                    },
                    update: {
                        fieldType: field.fieldType,
                        description: field.description,
                        isRequired: field.isRequired,
                        options: field.options ?? undefined,
                    },
                    create: {
                        agentId: agentRecord.id,
                        fieldName: field.fieldName,
                        fieldType: field.fieldType,
                        description: field.description,
                        isRequired: field.isRequired,
                        options: field.options ?? undefined,
                    },
                })
            }

        }
        console.log(`✅ Base agents ensured for organization: ${org.name}`)
    }
}
