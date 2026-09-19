import { describe, expect, it } from "vitest";

import { hasOverlap } from "./conflict";

function range(startHHmm: string, endHHmm: string) {
  const day = "2026-01-01T";
  return { startAt: new Date(`${day}${startHHmm}:00`), endAt: new Date(`${day}${endHHmm}:00`) };
}

describe("hasOverlap", () => {
  it("detecta sobreposição parcial", () => {
    expect(hasOverlap(range("15:00", "15:30"), range("15:15", "15:45"))).toBe(true);
  });

  it("não considera conflito horários apenas encostados", () => {
    expect(hasOverlap(range("15:00", "15:30"), range("15:30", "16:00"))).toBe(false);
  });

  it("detecta um intervalo totalmente contido no outro", () => {
    expect(hasOverlap(range("15:00", "16:00"), range("15:15", "15:45"))).toBe(true);
  });

  it("não considera conflito intervalos totalmente separados", () => {
    expect(hasOverlap(range("15:00", "15:30"), range("16:00", "16:30"))).toBe(false);
  });
});
