import { hasOverlap } from "./conflict";

export interface CancelledSlot {
  startAt: Date;
  endAt: Date;
}

export interface ActiveSlot {
  id: string;
  startAt: Date;
  endAt: Date;
}

export interface AnticipationOpportunity {
  startAt: Date;
  endAt: Date;
}

/**
 * Acha a melhor oportunidade de antecipação para um agendamento: a mais cedo
 * dentre os horários liberados (cancelados) do mesmo barbeiro/dia, anteriores
 * ao agendamento, cuja ocupação com a MESMA duração do agendamento não
 * colida com nenhum agendamento ativo. Só identifica a oportunidade — nunca
 * altera nada; quem decide usar essa oportunidade é sempre uma ação
 * explícita (solicitar) seguida de decisão do barbeiro (aceitar/recusar).
 */
export function findAnticipationOpportunity(params: {
  durationMs: number;
  cancelledSlots: CancelledSlot[];
  /** Mesmo barbeiro/dia, excluindo o próprio agendamento. */
  activeSlots: ActiveSlot[];
  now: Date;
}): AnticipationOpportunity | null {
  const { durationMs, cancelledSlots, activeSlots, now } = params;

  const sorted = [...cancelledSlots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  for (const slot of sorted) {
    if (slot.startAt.getTime() <= now.getTime()) continue;

    const candidate = { startAt: slot.startAt, endAt: new Date(slot.startAt.getTime() + durationMs) };
    const conflicts = activeSlots.some((active) => hasOverlap(candidate, active));
    if (!conflicts) return candidate;
  }

  return null;
}
