import { describe, expect, it } from "vitest";

import { calculateCommissionValue } from "./calculate";

describe("calculateCommissionValue", () => {
  it("calcula 50% de R$40 como R$20 (corte)", () => {
    expect(calculateCommissionValue(40, 50)).toBe(20);
  });

  it("calcula 45% de R$90 como R$40,50 (selagem)", () => {
    expect(calculateCommissionValue(90, 45)).toBe(40.5);
  });

  it("retorna 0 quando o percentual é 0", () => {
    expect(calculateCommissionValue(100, 0)).toBe(0);
  });

  it("retorna o próprio preço quando o percentual é 100", () => {
    expect(calculateCommissionValue(35, 100)).toBe(35);
  });

  it("arredonda para 2 casas decimais", () => {
    expect(calculateCommissionValue(15, 40)).toBe(6);
    expect(calculateCommissionValue(33.33, 33)).toBeCloseTo(11.0, 2);
  });
});
