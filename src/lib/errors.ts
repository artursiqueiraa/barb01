/** Erro de regra de negócio pensado para ser exibido ao usuário (ex.: "CPF já cadastrado"). */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class NotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} não encontrado`);
    this.name = "NotFoundError";
  }
}
