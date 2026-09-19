import { z } from "zod";

export const planSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  price: z.coerce.number().positive("Preço deve ser maior que zero"),
  billingPeriod: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
});

export type PlanInput = z.infer<typeof planSchema>;
