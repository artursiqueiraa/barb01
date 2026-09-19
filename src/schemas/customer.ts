import { z } from "zod";

import { isValidCPF, onlyDigits } from "@/lib/validators/br";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  cpf: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine(isValidCPF, "CPF inválido"),
  phone: z
    .string()
    .trim()
    .transform(onlyDigits)
    .refine((v) => v.length >= 10 && v.length <= 11, "Telefone inválido"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  birthDate: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
