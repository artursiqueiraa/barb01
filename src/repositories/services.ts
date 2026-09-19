import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const servicesRepository = {
  findMany(params: { onlyActive?: boolean } = {}) {
    const { onlyActive = true } = params;
    return prisma.service.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { name: "asc" },
    });
  },

  findById(id: string) {
    return prisma.service.findUnique({ where: { id } });
  },

  create(data: Prisma.ServiceCreateInput) {
    return prisma.service.create({ data });
  },

  update(id: string, data: Prisma.ServiceUpdateInput) {
    return prisma.service.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.service.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  },
};
