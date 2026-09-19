import { describe, expect, it } from "vitest";

import { DomainError } from "@/lib/errors";

import { type AppointmentSlot, simulateDelay } from "./rescheduleDelay";

const day = "2026-01-01T";

function at(hhmm: string) {
  return new Date(`${day}${hhmm}:00`);
}

function slot(id: string, startHHmm: string, endHHmm: string): AppointmentSlot {
  return { id, startAt: at(startHHmm), endAt: at(endHHmm) };
}

describe("simulateDelay", () => {
  it("cenário 1: aplica o atraso no próprio agendamento de origem", () => {
    const source = slot("joao", "15:00", "15:30");
    const result = simulateDelay({ source, newSourceEndAt: at("15:45"), following: [] });

    expect(result.additionalMinutes).toBe(15);
    expect(result.source.newStartAt).toEqual(at("15:00"));
    expect(result.source.newEndAt).toEqual(at("15:45"));
    expect(result.affected).toHaveLength(0);
  });

  it("cenário 2/3: propaga +15min para os agendamentos seguintes back-to-back", () => {
    const source = slot("joao", "15:00", "15:30");
    const following = [
      slot("pedro", "15:30", "16:00"),
      slot("lucas", "16:00", "16:30"),
      slot("marcos", "16:30", "17:00"),
    ];

    const result = simulateDelay({ source, newSourceEndAt: at("15:45"), following });

    expect(result.affected).toHaveLength(3);
    expect(result.affected.map((c) => [c.id, c.newStartAt, c.newEndAt])).toEqual([
      ["pedro", at("15:45"), at("16:15")],
      ["lucas", at("16:15"), at("16:45")],
      ["marcos", at("16:45"), at("17:15")],
    ]);
  });

  it("cenário 3: atraso de +30min desloca corretamente uma agenda back-to-back", () => {
    const source = slot("joao", "15:00", "15:30");
    const following = [slot("pedro", "15:30", "16:00"), slot("lucas", "16:00", "16:30")];

    const result = simulateDelay({ source, newSourceEndAt: at("16:00"), following });

    expect(result.affected.map((c) => [c.id, c.newStartAt, c.newEndAt])).toEqual([
      ["pedro", at("16:00"), at("16:30")],
      ["lucas", at("16:30"), at("17:00")],
    ]);
  });

  it("absorve gap: agendamento com folga suficiente não é deslocado, e a propagação para", () => {
    const source = slot("joao", "15:00", "15:30");
    const following = [
      // gap de 1h depois do novo término (15:45) — folga suficiente, não desloca
      slot("pedro", "17:00", "17:30"),
      slot("lucas", "17:30", "18:00"),
    ];

    const result = simulateDelay({ source, newSourceEndAt: at("15:45"), following });

    expect(result.affected).toHaveLength(0);
  });

  it("absorve gap parcialmente: só os que realmente sobrepõem são deslocados", () => {
    const source = slot("joao", "15:00", "15:30");
    const following = [
      slot("pedro", "15:30", "16:00"), // sobrepõe, desloca
      slot("lucas", "17:00", "17:30"), // já tinha folga suficiente mesmo após pedro deslocar
    ];

    const result = simulateDelay({ source, newSourceEndAt: at("15:45"), following });

    expect(result.affected.map((c) => c.id)).toEqual(["pedro"]);
  });

  it("cenário 6: um segundo atraso no mesmo atendimento calcula o delta a partir do estado atual (sem duplicar)", () => {
    // Depois do primeiro atraso, o "estado atual" já é 15:00–15:45.
    const sourceAfterFirstDelay = slot("joao", "15:00", "15:45");

    const result = simulateDelay({
      source: sourceAfterFirstDelay,
      newSourceEndAt: at("15:55"),
      following: [],
    });

    // +10min a partir do estado já ajustado, nunca +25 (o que duplicaria o atraso anterior).
    expect(result.additionalMinutes).toBe(10);
  });

  it("cenário 4 (via filtro externo): agendamento cancelado some da lista e não bloqueia nem força propagação indevida", () => {
    // A responsabilidade de excluir CANCELLED/NO_SHOW é da camada de repositório/serviço;
    // aqui garantimos que, sem o cancelado ("pedro", que ocuparia 15:30-16:00) na lista,
    // o gap que ele deixaria é corretamente considerado: "lucas" já tem folga (16:00 >= 15:45)
    // e não precisa deslocar.
    const source = slot("joao", "15:00", "15:30");
    const following = [slot("lucas", "16:00", "16:30")]; // "pedro" (cancelado) já foi filtrado antes

    const result = simulateDelay({ source, newSourceEndAt: at("15:45"), following });

    expect(result.affected).toHaveLength(0);
  });

  it("rejeita um novo término que não é posterior ao atual", () => {
    const source = slot("joao", "15:00", "15:30");
    expect(() => simulateDelay({ source, newSourceEndAt: at("15:30"), following: [] })).toThrow(DomainError);
    expect(() => simulateDelay({ source, newSourceEndAt: at("15:20"), following: [] })).toThrow(DomainError);
  });
});
