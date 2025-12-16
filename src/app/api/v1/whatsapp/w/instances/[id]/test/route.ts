import { NextResponse } from 'next/server'
import { z } from 'zod'
import { validateFullAccess } from '@/server/auth/validate-organization-access'
import { prisma } from '@/lib/prisma'
import {
  sendWuzapiMessage,
  sendWuzapiImage,
  sendWuzapiLocation,
  sendWuzapiAudio,
  sendWuzapiVideo,
  sendWuzapiDocument,
  sendWuzapiSticker,
  sendWuzapiContact,
  sendWuzapiPoll,
  sendWuzapiButtons,
  sendWuzapiList,
} from '@/services/whatsapp/wuzapi'

// Tipos de mensagem suportados
const messageTypes = [
  'text',
  'image',
  'location',
  'audio',
  'video',
  'document',
  'sticker',
  'contact',
  'poll',
  'buttons',
  'list',
] as const

// Schema base
const baseSchema = z.object({
  phone: z.string().min(1, 'Número de destino é obrigatório'),
  type: z.enum(messageTypes).default('text'),
})

// Schemas por tipo
const textSchema = baseSchema.extend({
  type: z.literal('text'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
})

const imageSchema = baseSchema.extend({
  type: z.literal('image'),
  image: z.string().min(1, 'Imagem é obrigatória'),
  caption: z.string().optional(),
})

const locationSchema = baseSchema.extend({
  type: z.literal('location'),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string().optional(),
})

const audioSchema = baseSchema.extend({
  type: z.literal('audio'),
  audio: z.string().min(1, 'Áudio é obrigatório'),
})

const videoSchema = baseSchema.extend({
  type: z.literal('video'),
  video: z.string().min(1, 'Vídeo é obrigatório'),
  caption: z.string().optional(),
})

const documentSchema = baseSchema.extend({
  type: z.literal('document'),
  document: z.string().min(1, 'Documento é obrigatório'),
  filename: z.string().optional(),
  caption: z.string().optional(),
})

const stickerSchema = baseSchema.extend({
  type: z.literal('sticker'),
  sticker: z.string().min(1, 'Sticker é obrigatório'),
})

const contactSchema = baseSchema.extend({
  type: z.literal('contact'),
  contactName: z.string().min(1, 'Nome do contato é obrigatório'),
  contactPhone: z.string().min(1, 'Telefone do contato é obrigatório'),
})

const pollSchema = z.object({
  phone: z.string().min(1), // Será usado como groupId
  type: z.literal('poll'),
  question: z.string().min(1, 'Pergunta é obrigatória'),
  options: z.array(z.string()).min(2, 'Mínimo 2 opções').max(12, 'Máximo 12 opções'),
  selectableCount: z.number().optional(),
})

const buttonSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['quickreply', 'url', 'call']).optional().default('quickreply'),
  url: z.string().optional(),
  phoneNumber: z.string().optional(),
})

const buttonsSchema = baseSchema.extend({
  type: z.literal('buttons'),
  title: z.string().min(1),
  body: z.string().min(1),
  footer: z.string().optional(),
  buttons: z.array(buttonSchema).min(1).max(3),
})

const listItemSchema = z.object({
  rowId: z.string(),
  title: z.string(),
  desc: z.string().optional(),
})

const listSchema = baseSchema.extend({
  type: z.literal('list'),
  topText: z.string().min(1),
  desc: z.string().min(1),
  footerText: z.string().optional(),
  buttonText: z.string().min(1),
  list: z.array(listItemSchema).min(1),
})

// Union de todos os tipos
const testMessageSchema = z.discriminatedUnion('type', [
  textSchema,
  imageSchema,
  locationSchema,
  audioSchema,
  videoSchema,
  documentSchema,
  stickerSchema,
  contactSchema,
  pollSchema,
  buttonsSchema,
  listSchema,
])

// Schema legado para compatibilidade
const legacySchema = z.object({
  phone: z.string().min(1),
  message: z.string().min(1),
})

/**
 * POST /api/v1/whatsapp/w/instances/[id]/test
 * Sends a test message via the WuzAPI instance
 * Supports all WuzAPI message types
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await validateFullAccess(request)
  if (!access.hasAccess || !access.organizationId) {
    return NextResponse.json({ error: access.error ?? 'Acesso negado' }, { status: 403 })
  }

  const { id: instanceId } = await params

  try {
    const body = await request.json()

    // Verify instance exists
    const instance = await prisma.whatsappInstance.findUnique({
      where: {
        organizationId_instanceId: {
          organizationId: access.organizationId,
          instanceId,
        },
      },
    })

    if (!instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    // Parse request
    let parsed = testMessageSchema.safeParse(body)

    // Fallback para schema legado
    if (!parsed.success && !body.type) {
      const legacyParsed = legacySchema.safeParse(body)
      if (legacyParsed.success) {
        parsed = testMessageSchema.safeParse({
          ...legacyParsed.data,
          type: 'text',
        })
      }
    }

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: parsed.error.flatten(),
      }, { status: 400 })
    }

    const data = parsed.data
    const formattedPhone = data.phone.replace(/\D/g, '')

    let result: { success: boolean; messageId?: string; error?: string }

    switch (data.type) {
      case 'text':
        result = await sendWuzapiMessage({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          message: data.message,
        })
        break

      case 'image':
        result = await sendWuzapiImage({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          image: data.image,
          caption: data.caption,
        })
        break

      case 'location':
        result = await sendWuzapiLocation({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          latitude: data.latitude,
          longitude: data.longitude,
          name: data.name,
        })
        break

      case 'audio':
        result = await sendWuzapiAudio({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          audio: data.audio,
        })
        break

      case 'video':
        result = await sendWuzapiVideo({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          video: data.video,
          caption: data.caption,
        })
        break

      case 'document':
        result = await sendWuzapiDocument({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          document: data.document,
          filename: data.filename,
          caption: data.caption,
        })
        break

      case 'sticker':
        result = await sendWuzapiSticker({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          sticker: data.sticker,
        })
        break

      case 'contact':
        result = await sendWuzapiContact({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
        })
        break

      case 'poll':
        result = await sendWuzapiPoll({
          instanceId,
          organizationId: access.organizationId,
          groupId: formattedPhone, // Para poll, phone é o ID do grupo
          question: data.question,
          options: data.options,
          selectableCount: data.selectableCount,
        })
        break

      case 'buttons':
        result = await sendWuzapiButtons({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          title: data.title,
          body: data.body,
          footer: data.footer,
          buttons: data.buttons,
        })
        break

      case 'list':
        result = await sendWuzapiList({
          instanceId,
          organizationId: access.organizationId,
          phone: formattedPhone,
          topText: data.topText,
          desc: data.desc,
          footerText: data.footerText,
          buttonText: data.buttonText,
          list: data.list,
        })
        break

      default:
        return NextResponse.json({
          error: 'Tipo de mensagem não suportado',
        }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({
        error: result.error ?? 'Falha ao enviar mensagem',
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error('[api/v1/whatsapp/w/instances/[id]/test] POST error', error)
    const errorMessage = error instanceof Error ? error.message : 'Falha ao enviar mensagem'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
