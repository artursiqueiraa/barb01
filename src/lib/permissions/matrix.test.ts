import { describe, expect, it } from "vitest";

import { can } from "./matrix";

describe("RBAC matrix", () => {
  it("ADMIN pode tudo", () => {
    expect(can("ADMIN", "financial", "read")).toBe(true);
    expect(can("ADMIN", "settings", "update")).toBe(true);
    expect(can("ADMIN", "commissionRules", "update")).toBe(true);
  });

  it("BARBEIRO não pode alterar comissão", () => {
    expect(can("BARBEIRO", "commissionRules", "update")).toBe(false);
  });

  it("BARBEIRO não pode acessar financeiro", () => {
    expect(can("BARBEIRO", "financial", "read")).toBe(false);
  });

  it("BARBEIRO pode registrar e ler atendimentos", () => {
    expect(can("BARBEIRO", "attendances", "create")).toBe(true);
    expect(can("BARBEIRO", "attendances", "read")).toBe(true);
  });

  it("GERENTE não pode alterar configurações críticas nem ver auditoria", () => {
    expect(can("GERENTE", "settings", "update")).toBe(false);
    expect(can("GERENTE", "audit", "read")).toBe(false);
  });

  it("RECEPCAO só enxerga assinaturas em modo leitura", () => {
    expect(can("RECEPCAO", "subscriptions", "read")).toBe(true);
    expect(can("RECEPCAO", "subscriptions", "update")).toBe(false);
  });

  it("CLIENTE não pode acessar dados administrativos", () => {
    expect(can("CLIENTE", "barbers", "read")).toBe(false);
    expect(can("CLIENTE", "financial", "read")).toBe(false);
  });

  it("CLIENTE pode assinar um plano e cancelar (escopo 'própria assinatura' é checado na action)", () => {
    expect(can("CLIENTE", "subscriptions", "create")).toBe(true);
    expect(can("CLIENTE", "subscriptions", "update")).toBe(true);
  });

  it("GERENTE pode confirmar pagamento mas não pode excluir", () => {
    expect(can("GERENTE", "payments", "update")).toBe(true);
    expect(can("GERENTE", "payments", "delete")).toBe(false);
  });
});
