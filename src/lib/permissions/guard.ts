import { auth } from "@/lib/auth";

import { can, type Action, type Resource } from "./matrix";

export class UnauthorizedError extends Error {
  constructor(message = "Não autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Acesso negado") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Garante que existe uma sessão válida. Lança UnauthorizedError caso contrário. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session;
}

/**
 * Garante sessão válida E permissão para o recurso/ação.
 * Deve ser a primeira chamada de qualquer Route Handler ou Server Action
 * que produza efeito colateral ou exponha dado sensível — nunca confiar
 * apenas em o frontend esconder o botão/rota.
 */
export async function requirePermission(resource: Resource, action: Action) {
  const session = await requireSession();
  if (!can(session.user.role, resource, action)) {
    throw new ForbiddenError();
  }
  return session;
}
