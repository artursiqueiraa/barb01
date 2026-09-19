import type { SubscriptionStatus } from "@prisma/client";

/**
 * Transições de status permitidas para uma assinatura. `CANCELLED` e
 * `EXPIRED` são terminais — uma vez lá, nunca voltam (se o cliente quiser
 * assinar de novo, cria-se uma nova Subscription, nunca reabre a antiga).
 * Permanecer no mesmo status é sempre permitido (ex.: renovação mantém ACTIVE
 * mas ainda gera uma entrada no histórico com o novo período).
 */
const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  PENDING: ["PENDING", "ACTIVE", "CANCELLED", "EXPIRED"],
  ACTIVE: ["ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"],
  PAST_DUE: ["PAST_DUE", "ACTIVE", "CANCELLED", "EXPIRED"],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransitionSubscription(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Só o status ACTIVE dá direito aos benefícios do plano (regra do MVP). */
export function hasActiveBenefits(status: SubscriptionStatus): boolean {
  return status === "ACTIVE";
}
