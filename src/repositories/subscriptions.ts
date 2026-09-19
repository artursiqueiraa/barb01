import type { Prisma, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  planId?: string;
  customerId?: string;
  from?: Date;
  to?: Date;
}

function buildWhere(filters: SubscriptionFilters): Prisma.SubscriptionWhereInput {
  const { status, planId, customerId, from, to } = filters;
  return {
    ...(status ? { status } : {}),
    ...(planId ? { planId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };
}

export const subscriptionsRepository = {
  findMany(filters: SubscriptionFilters = {}) {
    return prisma.subscription.findMany({
      where: buildWhere(filters),
      include: { customer: true, plan: true },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.subscription.findUnique({
      where: { id },
      include: { customer: true, plan: true },
    });
  },

  findByExternalId(externalSubscriptionId: string) {
    return prisma.subscription.findUnique({ where: { externalSubscriptionId } });
  },

  /** Assinatura PENDING ou ACTIVE já existente do cliente para o mesmo plano — evita duplicidade no checkout. */
  findOpenForPlan(customerId: string, planId: string) {
    return prisma.subscription.findFirst({
      where: { customerId, planId, status: { in: ["PENDING", "ACTIVE", "PAST_DUE"] } },
    });
  },

  create(data: Prisma.SubscriptionCreateInput) {
    return prisma.subscription.create({ data });
  },

  update(id: string, data: Prisma.SubscriptionUpdateInput) {
    return prisma.subscription.update({ where: { id }, data });
  },

  addStatusHistory(subscriptionId: string, fromStatus: SubscriptionStatus | null, toStatus: SubscriptionStatus, reason?: string) {
    return prisma.subscriptionStatusHistory.create({
      data: { subscriptionId, fromStatus, toStatus, reason },
    });
  },

  historyAndPayments(subscriptionId: string) {
    return prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        statusHistory: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { createdAt: "desc" } },
        plan: true,
        customer: true,
      },
    });
  },
};
