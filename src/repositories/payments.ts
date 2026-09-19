import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const paymentsRepository = {
  create(data: Prisma.PaymentCreateInput) {
    return prisma.payment.create({ data });
  },

  findBySubscription(subscriptionId: string) {
    return prisma.payment.findMany({
      where: { subscriptionId },
      orderBy: { createdAt: "desc" },
    });
  },
};

export const paymentEventsRepository = {
  findByProviderAndExternalId(provider: string, externalEventId: string) {
    return prisma.paymentEvent.findUnique({
      where: { provider_externalEventId: { provider, externalEventId } },
    });
  },

  create(data: { provider: string; externalEventId: string; eventType: string; payloadHash: string }) {
    return prisma.paymentEvent.create({ data });
  },

  markProcessed(id: string) {
    return prisma.paymentEvent.update({ where: { id }, data: { processedAt: new Date() } });
  },
};
