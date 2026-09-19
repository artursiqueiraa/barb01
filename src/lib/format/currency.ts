export function formatCurrency(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return numeric.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatPhone(phone: string): string {
  if (phone.length === 11) return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (phone.length === 10) return phone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return phone;
}
