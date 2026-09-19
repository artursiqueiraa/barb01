import { describe, expect, it } from "vitest";

import { calculatePeriodEnd } from "./period";

describe("calculatePeriodEnd", () => {
  it("soma 1 mês para plano mensal", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = calculatePeriodEnd(start, "MONTHLY");
    expect(end.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("soma 1 ano para plano anual", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = calculatePeriodEnd(start, "YEARLY");
    expect(end.toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });
});
