import { ZodError } from "zod";

import { DomainError, NotFoundError } from "@/lib/errors";

/**
 * Traduz um erro de validação/regra de negócio numa mensagem segura para
 * exibir ao usuário. Erros inesperados (bugs, falha de infra) são
 * relançados para o error boundary do Next — nunca viram mensagem "amigável"
 * que esconderia um problema real.
 */
export function toActionErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Dados inválidos";
  }
  if (error instanceof DomainError || error instanceof NotFoundError) {
    return error.message;
  }
  throw error;
}
