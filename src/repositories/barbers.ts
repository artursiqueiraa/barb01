import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const barbersRepository = {
  findMany(params: { onlyActive?: boolean } = {}) {
    const { onlyActive = true } = params;
    return prisma.barber.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
  },

  findById(id: string) {
    return prisma.barber.findUnique({
      where: { id },
      include: { commissionRules: { include: { service: true } } },
    });
  },

  create(data: Prisma.BarberCreateInput) {
    return prisma.barber.create({ data });
  },

  update(id: string, data: Prisma.BarberUpdateInput) {
    return prisma.barber.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.barber.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  },

  historySummary(id: string) {
    return prisma.attendance.findMany({
      where: { barberId: id },
      include: { service: true, customer: true },
      orderBy: { createdAt: "desc" },
    });
  },
};

export const commissionRulesRepository = {
  upsert(barberId: string, serviceId: string, percentage: number) {
    return prisma.commissionRule.upsert({
      where: { barberId_serviceId: { barberId, serviceId } },
      update: { percentage, active: true },
      create: { barberId, serviceId, percentage },
    });
  },

  deactivate(id: string) {
    return prisma.commissionRule.update({ where: { id }, data: { active: false } });
  },

  findForBarber(barberId: string) {
    return prisma.commissionRule.findMany({
      where: { barberId, active: true },
      include: { service: true },
    });
  },

  /** Resolve a comissão vigente: regra específica do par barbeiro+serviço, senão o default do barbeiro. */
  async resolvePercentage(barberId: string, serviceId: string): Promise<number> {
    const rule = await prisma.commissionRule.findUnique({
      where: { barberId_serviceId: { barberId, serviceId } },
    });
    if (rule?.active) return Number(rule.percentage);

    const barber = await prisma.barber.findUniqueOrThrow({ where: { id: barberId } });
    return Number(barber.defaultCommissionPercentage);
  },
};
