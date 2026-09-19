import type { SubscriptionStatus } from "@prisma/client";

import { DomainError, NotFoundError } from "@/lib/errors";
import { getPaymentProvider, type PaymentEventPayload } from "@/lib/payments";
import { calculatePeriodEnd } from "@/lib/subscriptions/period";
import { canTransitionSubscription } from "@/lib/subscriptions/transitions";
import { customersRepository } from "@/repositories/customers";
import { paymentsRepository } from "@/repositories/payments";
import { plansRepository } from "@/repositories/plans";
import { type SubscriptionFilters, subscriptionsRepository } from "@/repositories/subscriptions";
import { cancelSubscriptionSchema, checkoutSchema } from "@/schemas/subscription";

export const subscriptionsService = {
  list(filters: SubscriptionFilters = {}) {
    return subscriptionsRepository.findMany(filters);
  },

  async getProfile(subscriptionId: string) {
    const subscription = await subscriptionsRepository.historyAndPayments(subscriptionId);
    if (!subscription) throw new NotFoundError("Assinatura");
    return subscription;
  },

  /**
   * Inicia o checkout de uma assinatura: cria a Subscription em PENDING com o
   * preço do plano *no momento da contratação* (nunca referenciar o preço
   * atual do plano depois) e pede ao PaymentProvider as instruções/URL de
   * pagamento.
   */
  async createCheckout(customerId: string, input: unknown) {
    const { planId } = checkoutSchema.parse(input);

    const [customer, plan] = await Promise.all([
      customersRepository.findById(customerId),
      plansRepository.findById(planId),
    ]);

    if (!customer || !customer.active) throw new DomainError("Cliente inválido ou inativo");
    if (!plan || !plan.active) throw new DomainError("Plano inválido ou indisponível");

    const existing = await subscriptionsRepository.findOpenForPlan(customerId, planId);
    if (existing) throw new DomainError("Você já possui uma assinatura em aberto para este plano");

    const subscription = await subscriptionsRepository.create({
      customer: { connect: { id: customerId } },
      plan: { connect: { id: planId } },
      status: "PENDING",
      price: plan.price,
    });

    await subscriptionsRepository.addStatusHistory(subscription.id, null, "PENDING", "Checkout iniciado");

    const checkout = await getPaymentProvider().createCheckout({
      subscriptionId: subscription.id,
      customerName: customer.name,
      customerEmail: customer.email,
      planName: plan.name,
      amount: Number(plan.price),
    });

    if (checkout.externalSubscriptionId) {
      await subscriptionsRepository.update(subscription.id, {
        externalSubscriptionId: checkout.externalSubscriptionId,
      });
    }

    return { subscription, checkout };
  },

  /**
   * Confirma um pagamento e ativa/renova a assinatura. Usado tanto pelo fluxo
   * manual (admin/gerente confirma pelo painel) quanto pelo webhook de um
   * gateway real — os dois caminhos convergem aqui para nunca duplicar a
   * regra de transição de status.
   */
  async confirmPayment(
    subscriptionId: string,
    params: {
      amount: number;
      paymentType: "CASH" | "PIX" | "CARD" | "OTHER";
      externalPaymentId?: string;
      reason?: string;
    },
  ) {
    const subscription = await subscriptionsRepository.findById(subscriptionId);
    if (!subscription) throw new NotFoundError("Assinatura");

    const nextStatus: SubscriptionStatus = "ACTIVE";
    if (!canTransitionSubscription(subscription.status, nextStatus)) {
      throw new DomainError(`Não é possível ativar uma assinatura com status ${subscription.status}`);
    }

    await paymentsRepository.create({
      customer: { connect: { id: subscription.customerId } },
      subscription: { connect: { id: subscription.id } },
      amount: params.amount,
      status: "PAID",
      paymentType: params.paymentType,
      externalPaymentId: params.externalPaymentId,
      paidAt: new Date(),
    });

    const now = new Date();
    const isFirstActivation = subscription.status === "PENDING";
    const periodStart = isFirstActivation ? now : (subscription.currentPeriodEnd ?? now);
    const periodEnd = calculatePeriodEnd(periodStart, subscription.plan.billingPeriod);

    const updated = await subscriptionsRepository.update(subscription.id, {
      status: nextStatus,
      startedAt: subscription.startedAt ?? now,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
    });

    await subscriptionsRepository.addStatusHistory(
      subscription.id,
      subscription.status,
      nextStatus,
      params.reason ?? (isFirstActivation ? "Pagamento inicial confirmado" : "Renovação confirmada"),
    );

    return updated;
  },

  /** Cobrança recorrente falhou: ACTIVE -> PAST_DUE. Não afeta assinatura ainda PENDING. */
  async markPaymentFailed(subscriptionId: string, reason?: string) {
    const subscription = await subscriptionsRepository.findById(subscriptionId);
    if (!subscription) throw new NotFoundError("Assinatura");

    await paymentsRepository.create({
      customer: { connect: { id: subscription.customerId } },
      subscription: { connect: { id: subscription.id } },
      amount: subscription.price,
      status: "FAILED",
      paymentType: "OTHER",
    });

    const nextStatus: SubscriptionStatus = "PAST_DUE";
    if (subscription.status === "ACTIVE" && canTransitionSubscription(subscription.status, nextStatus)) {
      await subscriptionsRepository.update(subscription.id, { status: nextStatus });
      await subscriptionsRepository.addStatusHistory(
        subscription.id,
        subscription.status,
        nextStatus,
        reason ?? "Falha na cobrança recorrente",
      );
    }

    return subscriptionsRepository.findById(subscriptionId);
  },

  /** Nunca deleta — só marca CANCELLED e preserva todo o histórico financeiro. */
  async cancel(subscriptionId: string, input: unknown) {
    const { reason } = cancelSubscriptionSchema.parse({ subscriptionId, ...(input as object) });

    const subscription = await subscriptionsRepository.findById(subscriptionId);
    if (!subscription) throw new NotFoundError("Assinatura");

    const nextStatus: SubscriptionStatus = "CANCELLED";
    if (!canTransitionSubscription(subscription.status, nextStatus)) {
      throw new DomainError(`Não é possível cancelar uma assinatura com status ${subscription.status}`);
    }

    const updated = await subscriptionsRepository.update(subscription.id, {
      status: nextStatus,
      cancelledAt: new Date(),
    });

    await subscriptionsRepository.addStatusHistory(subscription.id, subscription.status, nextStatus, reason ?? "Cancelado");

    if (subscription.externalSubscriptionId) {
      await getPaymentProvider().cancelSubscription(subscription.externalSubscriptionId);
    }

    return updated;
  },

  /** Ponto único de entrada para eventos de webhook já autenticados e parseados. */
  async processWebhookEvent(event: PaymentEventPayload) {
    const subscription = await subscriptionsRepository.findByExternalId(event.externalSubscriptionId);
    if (!subscription) {
      return { handled: false as const, reason: "subscription_not_found" };
    }

    if (event.status === "PAID") {
      await this.confirmPayment(subscription.id, {
        amount: event.amount ?? Number(subscription.price),
        paymentType: "PIX",
        externalPaymentId: event.externalPaymentId,
        reason: `Webhook: ${event.eventType}`,
      });
    } else if (event.status === "FAILED") {
      await this.markPaymentFailed(subscription.id, `Webhook: ${event.eventType}`);
    } else if (event.status === "CANCELLED") {
      await this.cancel(subscription.id, { reason: `Webhook: ${event.eventType}` });
    }

    return { handled: true as const };
  },
};
