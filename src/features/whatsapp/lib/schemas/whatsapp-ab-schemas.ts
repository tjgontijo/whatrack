import { z } from 'zod';

export const AbTestVariantSchema = z.object({
  label: z.enum(['A', 'B', 'C', 'D', 'E']),
  templateName: z.string().min(1),
  templateLang: z.string().default('pt_BR'),
  splitPercent: z.number().int().min(0).max(100),
});

export const AbTestConfigSchema = z.object({
  windowHours: z.union([z.literal(4), z.literal(8), z.literal(12), z.literal(24), z.literal(48)]),
  winnerCriteria: z.enum(['RESPONSE_RATE', 'READ_RATE', 'MANUAL']),
  remainderPercent: z.number().int().min(0).max(50).optional().default(0),
});

export const AbTestCreateSchema = z.object({
  isAbTest: z.boolean(),
  variants: z.array(AbTestVariantSchema).min(2).max(5),
  config: AbTestConfigSchema,
}).refine(
  (data) => {
    if (!data.isAbTest) return true;
    const variantsSum = data.variants.reduce((sum, v) => sum + v.splitPercent, 0);
    const remainder = data.config.remainderPercent ?? 0;
    return variantsSum + remainder === 100;
  },
  {
    message: 'A soma dos percentuais das variantes e do restante deve ser igual a 100%',
    path: ['variants'],
  }
).refine(
  (data) => {
    if (!data.isAbTest) return true;
    const templateNames = data.variants.map((v) => v.templateName);
    return new Set(templateNames).size === templateNames.length;
  },
  {
    message: 'Cada variante deve usar um template diferente',
    path: ['variants'],
  }
).refine(
  (data) => {
    if (!data.isAbTest) return true;
    const labels = data.variants.map((v) => v.label);
    return new Set(labels).size === labels.length;
  },
  {
    message: 'As etiquetas das variantes devem ser únicas',
    path: ['variants'],
  }
);

export const AbTestSelectWinnerSchema = z.object({
  variantId: z.string().uuid(),
});

export const AbTestMetricsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AbTestVariantInput = z.infer<typeof AbTestVariantSchema>;
export type AbTestConfigInput = z.infer<typeof AbTestConfigSchema>;
export type AbTestCreateInput = z.infer<typeof AbTestCreateSchema>;
export type AbTestSelectWinnerInput = z.infer<typeof AbTestSelectWinnerSchema>;
export type AbTestMetricsQueryInput = z.infer<typeof AbTestMetricsQuerySchema>;
