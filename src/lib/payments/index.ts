import { ManualPaymentProvider } from "./providers/manual";
import type { PaymentProvider } from "./provider";

let cached: PaymentProvider | undefined;

/**
 * Fábrica do provider configurado via `PAYMENT_PROVIDER`. Hoje só existe o
 * provider "manual" (ver ADR em `docs/PAYMENTS.md`); um provider real
 * (Mercado Pago, por exemplo) entra aqui como mais um `case`, sem alterar
 * nenhum outro módulo.
 */
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  const providerName = process.env.PAYMENT_PROVIDER ?? "manual";
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? "change-me";

  switch (providerName) {
    case "manual":
      cached = new ManualPaymentProvider(webhookSecret);
      return cached;
    default:
      throw new Error(`PAYMENT_PROVIDER desconhecido: ${providerName}`);
  }
}

export type { CheckoutResult, CreateCheckoutInput, PaymentEventPayload, PaymentProvider } from "./provider";
