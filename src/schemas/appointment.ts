import { z } from "zod";

export const appointmentSchema = z.object({
  customerId: z.string().min(1, "Selecione o cliente"),
  barberId: z.string().min(1, "Selecione o barbeiro"),
  serviceId: z.string().min(1, "Selecione o serviço"),
  startAt: z.coerce.date({ message: "Informe data e horário" }),
  notes: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;

/**
 * Entrada do "Informar atraso": ou um preset em minutos (+5/+10/+15/+20/+30
 * ou "Outro" em minutos livres), ou um novo horário de término informado
 * diretamente. O service resolve os dois modos para um único `newEndAt`.
 */
export const reportDelaySchema = z
  .object({
    appointmentId: z.string().min(1),
    mode: z.enum(["preset", "custom"]),
    minutes: z.coerce.number().int().positive("Informe um valor de minutos maior que zero").optional(),
    newEndAt: z.coerce.date().optional(),
  })
  .refine((data) => (data.mode === "preset" ? data.minutes !== undefined : data.newEndAt !== undefined), {
    message: "Informe o tempo adicional ou o novo horário de término",
  });

export type ReportDelayInput = z.infer<typeof reportDelaySchema>;
