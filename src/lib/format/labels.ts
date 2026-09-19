export const paymentTypeLabels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CARD: "Cartão",
  SUBSCRIPTION: "Assinatura",
  OTHER: "Outro",
};

export const subscriptionStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  ACTIVE: "Ativa",
  PAST_DUE: "Atrasada",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
};

export const appointmentStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  GERENTE: "Gerente",
  RECEPCAO: "Recepção",
  BARBEIRO: "Barbeiro",
  CLIENTE: "Cliente",
};
