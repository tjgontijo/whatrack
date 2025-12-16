import { z } from 'zod';
import { validateWhatsApp, removeWhatsAppMask } from '@/lib/mask/phone-mask';

export const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().refine(
    (value) => validateWhatsApp(removeWhatsAppMask(value)),
    { message: "Telefone inválido." }
  ),
});

export type ContactFormData = z.infer<typeof contactSchema>;
export type ContactErrors = Partial<Record<keyof ContactFormData, string>>;
