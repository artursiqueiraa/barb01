export interface CreateCheckoutInput {
  subscriptionId: string;
  customerName: string;
  customerEmail: string | null;
  planName: string;
  amount: number;
}

export interface CheckoutResult {
  /** id da assinatura no gateway externo, se houver (null para o provider manual). */
  externalSubscriptionId: string | null;
  /** URL para onde redirecionar o cliente (checkout hospedado), quando aplicável. */
  redirectUrl?: string;
  /** Instruções exibidas ao cliente quando não há redirect (ex.: chave Pix, dados bancários). */
  instructions: string;
}

export interface PaymentEventPayload {
  externalEventId: string;
  eventType: string;
  externalSubscriptionId: string;
  status: "PAID" | "FAILED" | "CANCELLED";
  amount?: number;
  externalPaymentId?: string;
}

/**
 * Abstração de gateway de pagamento (seção "PAYMENT PROVIDER"). Nenhuma parte
 * do domínio (modules/subscriptions) pode depender diretamente de um gateway
 * específico — só desta interface. Trocar de provider é trocar a implementação
 * injetada em `lib/payments/index.ts`, sem tocar em regra de negócio.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  cancelSubscription(externalSubscriptionId: string | null): Promise<void>;
  /** Verifica a assinatura HMAC do corpo bruto do webhook. */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
  /** Interpreta o payload já autenticado do webhook num evento normalizado. */
  parseWebhookEvent(rawBody: string): PaymentEventPayload;
}
