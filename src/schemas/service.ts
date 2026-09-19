import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  description: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  price: z.coerce.number().positive("Preço deve ser maior que zero"),
  durationMinutes: z.coerce.number().int().positive("Duração deve ser maior que zero"),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
