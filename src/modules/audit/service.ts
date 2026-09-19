import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

interface RecordAuditLogInput {
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/** Registra uma operação crítica (seção 31 do documento de produto). */
export async function recordAuditLog(input: RecordAuditLogInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
