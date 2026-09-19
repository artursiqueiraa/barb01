import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getPaymentProvider } from "@/lib/payments";
import { paymentEventsRepository } from "@/repositories/payments";
import { subscriptionsService } from "@/modules/subscriptions/service";

/**
 * Endpoint de webhook do gateway de pagamento. Nunca confia no corpo da
 * requisição sem antes validar a assinatura, e nunca processa o mesmo evento
 * duas vezes (idempotência via `payment_events`, chave única
 * `[provider, externalEventId]`) — ver seção "WEBHOOK" / "IDEMPOTÊNCIA".
 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    logger.warn("webhook.invalid_signature", { provider: provider.name });
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let event;
  try {
    event = provider.parseWebhookEvent(rawBody);
  } catch (error) {
    logger.warn("webhook.invalid_payload", {
      provider: provider.name,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const existing = await paymentEventsRepository.findByProviderAndExternalId(
    provider.name,
    event.externalEventId,
  );

  if (existing?.processedAt) {
    logger.info("webhook.duplicate_ignored", { provider: provider.name, externalEventId: event.externalEventId });
    return NextResponse.json({ received: true, duplicate: true });
  }

  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const eventRecord =
    existing ??
    (await paymentEventsRepository.create({
      provider: provider.name,
      externalEventId: event.externalEventId,
      eventType: event.eventType,
      payloadHash,
    }));

  try {
    const result = await subscriptionsService.processWebhookEvent(event);
    await paymentEventsRepository.markProcessed(eventRecord.id);

    if (!result.handled) {
      logger.warn("webhook.subscription_not_found", { externalSubscriptionId: event.externalSubscriptionId });
    }

    return NextResponse.json({ received: true, handled: result.handled });
  } catch (error) {
    logger.error("webhook.processing_failed", {
      provider: provider.name,
      externalEventId: event.externalEventId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Erro ao processar evento" }, { status: 500 });
  }
}
