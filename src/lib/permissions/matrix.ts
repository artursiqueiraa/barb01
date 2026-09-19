export type Role = "ADMIN" | "GERENTE" | "RECEPCAO" | "BARBEIRO" | "CLIENTE";

export type Resource =
  | "customers"
  | "barbers"
  | "commissionRules"
  | "services"
  | "plans"
  | "subscriptions"
  | "payments"
  | "attendances"
  | "appointments"
  | "reports"
  | "financial"
  | "settings"
  | "audit";

export type Action = "create" | "read" | "update" | "delete";

type PermissionMatrix = Record<Role, Partial<Record<Resource, Action[]>>>;

const ALL: Action[] = ["create", "read", "update", "delete"];

/**
 * Matriz declarativa de RBAC (seção 8 do documento de produto).
 *
 * Isto cobre apenas permissão por RECURSO. Escopo por LINHA (ex.: um BARBEIRO
 * só pode ler seus próprios atendimentos, um CLIENTE só o próprio histórico)
 * é responsabilidade da camada de repository/service, que deve sempre filtrar
 * por `session.barberId`/`session.customerId` — nunca confiar em um `id`
 * vindo do client para decidir o que retornar.
 */
const matrix: PermissionMatrix = {
  ADMIN: {
    customers: ALL,
    barbers: ALL,
    commissionRules: ALL,
    services: ALL,
    plans: ALL,
    subscriptions: ALL,
    payments: ALL,
    attendances: ALL,
    appointments: ALL,
    reports: ALL,
    financial: ALL,
    settings: ALL,
    audit: ALL,
  },
  GERENTE: {
    customers: ALL,
    barbers: ALL,
    commissionRules: ALL,
    services: ALL,
    plans: ALL,
    subscriptions: ALL,
    payments: ["read", "update"],
    attendances: ALL,
    appointments: ALL,
    reports: ["read"],
    financial: ["read"],
    // sem acesso a settings (configurações críticas) nem a audit.
  },
  RECEPCAO: {
    customers: ["create", "read", "update"],
    barbers: ["read"],
    services: ["read"],
    plans: ["read"],
    attendances: ["create", "read"],
    appointments: ["create", "read", "update"],
    subscriptions: ["read"],
  },
  BARBEIRO: {
    // "own only": filtrado por barberId da sessão na camada de repository.
    attendances: ["create", "read"],
    // "update" cobre só "informar atraso" no próprio agendamento — a checagem
    // de ownership (barberId da sessão) é feita em modules/appointments/actions.ts.
    appointments: ["read", "update"],
    reports: ["read"],
    customers: ["read"],
    barbers: ["read"],
  },
  CLIENTE: {
    // "own only": filtrado por customerId da sessão na camada de repository.
    subscriptions: ["create", "read", "update"],
    payments: ["read"],
    appointments: ["create", "read", "update"],
    attendances: ["read"],
  },
};

export function can(role: Role, resource: Resource, action: Action): boolean {
  return matrix[role]?.[resource]?.includes(action) ?? false;
}
