import { describe, expect, it } from "vitest";

import { canTransitionSubscription, hasActiveBenefits } from "./transitions";

describe("canTransitionSubscription", () => {
  it("permite ativar uma assinatura pendente", () => {
    expect(canTransitionSubscription("PENDING", "ACTIVE")).toBe(true);
  });

  it("permite marcar uma assinatura ativa como atrasada", () => {
    expect(canTransitionSubscription("ACTIVE", "PAST_DUE")).toBe(true);
  });

  it("permite regularizar uma assinatura atrasada", () => {
    expect(canTransitionSubscription("PAST_DUE", "ACTIVE")).toBe(true);
  });

  it("nunca sai de CANCELLED", () => {
    expect(canTransitionSubscription("CANCELLED", "ACTIVE")).toBe(false);
    expect(canTransitionSubscription("CANCELLED", "PENDING")).toBe(false);
  });

  it("nunca sai de EXPIRED", () => {
    expect(canTransitionSubscription("EXPIRED", "ACTIVE")).toBe(false);
  });

  it("não permite reativar diretamente uma assinatura pendente para PAST_DUE", () => {
    expect(canTransitionSubscription("PENDING", "PAST_DUE")).toBe(false);
  });
});

describe("hasActiveBenefits", () => {
  it("só ACTIVE dá direito a benefícios", () => {
    expect(hasActiveBenefits("ACTIVE")).toBe(true);
    expect(hasActiveBenefits("PAST_DUE")).toBe(false);
    expect(hasActiveBenefits("PENDING")).toBe(false);
    expect(hasActiveBenefits("CANCELLED")).toBe(false);
    expect(hasActiveBenefits("EXPIRED")).toBe(false);
  });
});
