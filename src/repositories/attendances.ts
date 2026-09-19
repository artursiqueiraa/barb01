import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export interface AttendanceFilters {
  barberId?: string;
  customerId?: string;
  serviceId?: string;
  from?: Date;
  to?: Date;
  skip?: number;
  take?: number;
}

function buildWhere(filters: AttendanceFilters): Prisma.AttendanceWhereInput {
  const { barberId, customerId, serviceId, from, to } = filters;
  return {
    ...(barberId ? { barberId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(serviceId ? { serviceId } : {}),
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

export const attendancesRepository = {
  findMany(filters: AttendanceFilters = {}) {
    return prisma.attendance.findMany({
      where: buildWhere(filters),
      include: { customer: true, barber: true, service: true },
      orderBy: { createdAt: "desc" },
      skip: filters.skip,
      take: filters.take,
    });
  },

  aggregateForReport(filters: AttendanceFilters = {}) {
    return prisma.attendance.findMany({
      where: buildWhere(filters),
      include: { service: true, barber: true, customer: true },
    });
  },

  create(data: Prisma.AttendanceCreateInput) {
    return prisma.attendance.create({ data });
  },
};
