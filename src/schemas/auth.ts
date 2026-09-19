import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerCustomerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length >= 10 && value.length <= 11, "Telefone inválido"),
  cpf: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 11, "CPF inválido"),
});

export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;
