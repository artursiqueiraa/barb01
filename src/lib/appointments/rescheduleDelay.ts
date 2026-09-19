import { differenceInMinutes } from "date-fns";

import { DomainError } from "@/lib/errors";

export interface AppointmentSlot {
  id: string;
  startAt: Date;
  endAt: Date;
}

export interface RescheduleChange {
  id: string;
  oldStartAt: Date;
  oldEndAt: Date;
  newStartAt: Date;
  newEndAt: Date;
}

export interface DelaySimulation {
  additionalMinutes: number;
  source: RescheduleChange;
  /** Só os agendamentos que precisaram deslocar de fato (gaps que já absorviam o atraso ficam de fora). */
  affected: RescheduleChange[];
}

/**
 * Recalcula a agenda de um barbeiro depois de um atraso reportado num
 * atendimento. A cascata "absorve gap": cada agendamento seguinte só é
 * deslocado o quanto for necessário para eliminar a sobreposição; assim que
 * um deles já tiver folga suficiente, a propagação para (ele e os
 * posteriores não são tocados nem contam como afetados).
 */
export function simulateDelay(params: {
  source: AppointmentSlot;
  newSourceEndAt: Date;
  /** Mesmo barbeiro, mesmo dia, status ativo, startAt > source.startAt. */
  following: AppointmentSlot[];
}): DelaySimulation {
  const { source, newSourceEndAt, following } = params;

  const additionalMinutes = differenceInMinutes(newSourceEndAt, source.endAt);
  if (additionalMinutes <= 0) {
    throw new DomainError("Informe um horário de término posterior ao atual");
  }

  const sorted = [...following].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  let runningEnd = newSourceEndAt;
  const affected: RescheduleChange[] = [];

  for (const appointment of sorted) {
    if (appointment.startAt.getTime() >= runningEnd.getTime()) {
      break;
    }

    const shiftMs = runningEnd.getTime() - appointment.startAt.getTime();
    const newStartAt = new Date(appointment.startAt.getTime() + shiftMs);
    const newEndAt = new Date(appointment.endAt.getTime() + shiftMs);

    affected.push({
      id: appointment.id,
      oldStartAt: appointment.startAt,
      oldEndAt: appointment.endAt,
      newStartAt,
      newEndAt,
    });

    runningEnd = newEndAt;
  }

  return {
    additionalMinutes,
    source: {
      id: source.id,
      oldStartAt: source.startAt,
      oldEndAt: source.endAt,
      newStartAt: source.startAt,
      newEndAt: newSourceEndAt,
    },
    affected,
  };
}
