import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export const customersRepository = {
  findMany(params: { search?: string; onlyActive?: boolean; skip?: number; take?: number } = {}) {
    const { search, onlyActive = true, skip, take } = params;

    const where: Prisma.CustomerWhereInput = {
      ...(onlyActive ? { active: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { cpf: { contains: search.replace(/\D/g, "") } },
              { phone: { contains: search.replace(/\D/g, "") } },
            ],
          }
        : {}),
    };

    return prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    });
  },

  count(params: { search?: string; onlyActive?: boolean } = {}) {
    const { search, onlyActive = true } = params;
    const where: Prisma.CustomerWhereInput = {
      ...(onlyActive ? { active: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { cpf: { contains: search.replace(/\D/g, "") } },
              { phone: { contains: search.replace(/\D/g, "") } },
            ],
          }
        : {}),
    };
    return prisma.customer.count({ where });
  },

  findById(id: string) {
    return prisma.customer.findUnique({ where: { id } });
  },

  findByCpf(cpf: string) {
    return prisma.customer.findUnique({ where: { cpf } });
  },

  create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({ data });
  },

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.customer.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
  },

  historySummary(id: string) {
    return prisma.attendance.findMany({
      where: { customerId: id },
      include: { service: true, barber: true },
      orderBy: { createdAt: "desc" },
    });
  },

  latestSubscription(customerId: string) {
    return prisma.subscription.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });
  },
};
