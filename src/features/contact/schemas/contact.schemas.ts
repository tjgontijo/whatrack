import { z } from 'zod'

export const contactTrackingSchema = z.object({
  trafficSource: z.string().trim().min(1, 'Fonte de tráfego inválida'),
  utmSource: z.string().trim().optional().nullable(),
  utmMedium: z.string().trim().optional().nullable(),
  utmCampaign: z.string().trim().optional().nullable(),
  fbclid: z.string().trim().optional().nullable(),
  gclid: z.string().trim().optional().nullable(),
})

export const contactRequestSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Nome inválido'),
    phone: z.string().trim().min(8, 'Telefone inválido'),
    createdAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Data inválida'),
    tracking: contactTrackingSchema,
  }),
})

export type ContactRequestInput = z.infer<typeof contactRequestSchema>
