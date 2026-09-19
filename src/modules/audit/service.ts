import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

interface RecordAuditLogInput {
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient;

/**
 * Registra uma operação crítica (seção 31 do documento de produto). Aceita
 * opcionalmente um client de transação (`tx`) para que o registro de
 * auditoria participe da mesma transação atômica da operação que o originou
 * — ex.: reajuste de agenda por atraso, onde tudo precisa ser tudo-ou-nada.
 */
export async function recordAuditLog(input: RecordAuditLogInput, client: PrismaClientOrTransaction = prisma) {
  await client.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
