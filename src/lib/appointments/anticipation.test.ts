import { describe, expect, it } from "vitest";

import { findAnticipationOpportunity } from "./anticipation";

const day = "2026-01-01T";
const THIRTY_MIN_MS = 30 * 60_000;

function at(hhmm: string) {
  return new Date(`${day}${hhmm}:00`);
}

describe("findAnticipationOpportunity", () => {
  it("encontra a oportunidade quando o horário liberado está livre", () => {
    const result = findAnticipationOpportunity({
      durationMs: THIRTY_MIN_MS,
      cancelledSlots: [{ startAt: at("15:30"), endAt: at("16:00") }],
      activeSlots: [{ id: "lucas", startAt: at("16:00"), endAt: at("16:30") }],
      now: at("10:00"),
    });

    expect(result).toEqual({ startAt: at("15:30"), endAt: at("16:00") });
  });

  it("retorna null quando não há nenhum horário cancelado", () => {
    const result = findAnticipationOpportunity({
      durationMs: THIRTY_MIN_MS,
      cancelledSlots: [],
      activeSlots: [{ id: "lucas", startAt: at("16:00"), endAt: at("16:30") }],
      now: at("10:00"),
    });

    expect(result).toBeNull();
  });

  it("ignora um horário liberado que colidiria com um agendamento ativo", () => {
    // Slot liberado às 15:30-16:00, mas alguém já ocupa 15:45-16:15 (ex.: reagendado por atraso).
    const result = findAnticipationOpportunity({
      durationMs: THIRTY_MIN_MS,
      cancelledSlots: [{ startAt: at("15:30"), endAt: at("16:00") }],
      activeSlots: [{ id: "outro", startAt: at("15:45"), endAt: at("16:15") }],
      now: at("10:00"),
    });

    expect(result).toBeNull();
  });

  it("escolhe a oportunidade mais cedo entre múltiplos horários liberados válidos", () => {
    const result = findAnticipationOpportunity({
      durationMs: THIRTY_MIN_MS,
      cancelledSlots: [
        { startAt: at("16:00"), endAt: at("16:30") },
        { startAt: at("15:00"), endAt: at("15:30") },
      ],
      activeSlots: [],
      now: at("10:00"),
    });

    expect(result).toEqual({ startAt: at("15:00"), endAt: at("15:30") });
  });

  it("ignora um horário liberado que já passou", () => {
    const result = findAnticipationOpportunity({
      durationMs: THIRTY_MIN_MS,
      cancelledSlots: [{ startAt: at("09:00"), endAt: at("09:30") }],
      activeSlots: [],
      now: at("10:00"),
    });

    expect(result).toBeNull();
  });

  it("pula um horário liberado inválido e usa o próximo válido", () => {
    const result = findAnticipationOpportunity({
      durationMs: THIRTY_MIN_MS,
      cancelledSlots: [
        { startAt: at("15:00"), endAt: at("15:30") }, // colide com "outro"
        { startAt: at("16:00"), endAt: at("16:30") }, // livre
      ],
      activeSlots: [{ id: "outro", startAt: at("15:00"), endAt: at("15:30") }],
      now: at("10:00"),
    });

    expect(result).toEqual({ startAt: at("16:00"), endAt: at("16:30") });
  });
});
