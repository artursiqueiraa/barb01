import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { logger } from "@/lib/logger";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions/guard";

/**
 * Converte qualquer erro lançado dentro de um Route Handler numa resposta HTTP
 * consistente, sem nunca expor stack trace ou detalhes internos ao cliente.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: error.flatten() },
      { status: 400 },
    );
  }

  logger.error("api.unhandled_error", {
    message: error instanceof Error ? error.message : "unknown",
  });

  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}
