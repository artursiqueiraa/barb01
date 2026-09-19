import { z } from "zod";

export const attendanceSchema = z.object({
  customerId: z.string().min(1, "Selecione o cliente"),
  barberId: z.string().min(1, "Selecione o barbeiro"),
  serviceId: z.string().min(1, "Selecione o serviço"),
  // "SUBSCRIPTION" nunca é aceito vindo do cliente: é decidido pelo servidor
  // ao verificar se o cliente possui assinatura ativa (seção 20 do produto).
  paymentType: z.enum(["CASH", "PIX", "CARD", "OTHER"]),
  notes: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export type AttendanceInput = z.infer<typeof attendanceSchema>;
