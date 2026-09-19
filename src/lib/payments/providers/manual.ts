import { randomUUID } from "node:crypto";

import type {
  CheckoutResult,
  CreateCheckoutInput,
  PaymentEventPayload,
  PaymentProvider,
} from "@/lib/payments/provider";
import { verifySignature } from "@/lib/payments/webhookSignature";

/**
 * Provider "manual": nenhuma chamada de rede a um gateway externo. O cliente
 * paga por Pix/dinheiro/cartão físico e a recepção/admin confirma o
 * recebimento pelo painel (`confirmSubscriptionPaymentAction`), que chama o
 * mesmo caminho de código que um webhook real usaria — ver `docs/PAYMENTS.md`.
 *
 * Implementa a interface `PaymentProvider` inteira (inclusive verificação de
 * assinatura de webhook via HMAC) para que trocar por um gateway real no
 * futuro seja só trocar a implementação injetada em `lib/payments/index.ts`.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";

  constructor(private readonly webhookSecret: string) {}

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    return {
      externalSubscriptionId: null,
      instructions:
        `Assinatura "${input.planName}" no valor de ` +
        `R$ ${input.amount.toFixed(2)} para ${input.customerName}. ` +
        "Realize o pagamento por Pix, cartão ou dinheiro na recepção. " +
        "Sua assinatura será ativada assim que o pagamento for confirmado.",
    };
  }

  async cancelSubscription(): Promise<void> {
    // Nada a fazer num gateway externo — o cancelamento é só local.
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    return verifySignature(rawBody, this.webhookSecret, signatureHeader);
  }

  parseWebhookEvent(rawBody: string): PaymentEventPayload {
    const payload = JSON.parse(rawBody) as Partial<PaymentEventPayload>;

    if (!payload.externalSubscriptionId || !payload.status) {
      throw new Error("Payload de webhook inválido: faltam campos obrigatórios");
    }

    return {
      externalEventId: payload.externalEventId ?? randomUUID(),
      eventType: payload.eventType ?? "payment.update",
      externalSubscriptionId: payload.externalSubscriptionId,
      status: payload.status,
      amount: payload.amount,
      externalPaymentId: payload.externalPaymentId,
    };
  }
}
