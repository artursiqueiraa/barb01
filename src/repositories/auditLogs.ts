import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export interface AuditLogFilters {
  action?: string;
  entity?: string;
  from?: Date;
  to?: Date;
}

function buildWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const { action, entity, from, to } = filters;
  return {
    ...(action ? { action } : {}),
    ...(entity ? { entity } : {}),
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

export const auditLogsRepository = {
  findMany(filters: AuditLogFilters = {}) {
    return prisma.auditLog.findMany({
      where: buildWhere(filters),
      orderBy: { createdAt: "desc" },
    });
  },
};
