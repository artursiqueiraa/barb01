import { z } from "zod";

export const checkoutSchema = z.object({
  planId: z.string().min(1, "Selecione um plano"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const confirmPaymentSchema = z.object({
  subscriptionId: z.string().min(1),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  paymentType: z.enum(["CASH", "PIX", "CARD", "OTHER"]),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

export const cancelSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
