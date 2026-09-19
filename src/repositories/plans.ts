import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const plansRepository = {
  findMany(params: { onlyActive?: boolean } = {}) {
    const { onlyActive = true } = params;
    return prisma.plan.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { price: "asc" },
    });
  },

  findById(id: string) {
    return prisma.plan.findUnique({ where: { id } });
  },

  create(data: Prisma.PlanCreateInput) {
    return prisma.plan.create({ data });
  },

  update(id: string, data: Prisma.PlanUpdateInput) {
    return prisma.plan.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.plan.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  },
};
