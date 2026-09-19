import { z } from "zod";

import { onlyDigits } from "@/lib/validators/br";

export const barberSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  phone: z
    .string()
    .trim()
    .transform(onlyDigits)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  photo: z
    .string()
    .trim()
    .url("URL inválida")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  defaultCommissionPercentage: z.coerce
    .number()
    .min(0, "Comissão não pode ser negativa")
    .max(100, "Comissão não pode passar de 100%"),
});

export type BarberInput = z.infer<typeof barberSchema>;

export const commissionRuleSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  percentage: z.coerce.number().min(0).max(100),
});

export type CommissionRuleInput = z.infer<typeof commissionRuleSchema>;
