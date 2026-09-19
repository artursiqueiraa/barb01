import type { AppointmentStatus, Prisma } from "@prisma/client";
import { endOfDay, startOfDay } from "date-fns";

import { hasOverlap } from "@/lib/appointments/conflict";
import { simulateDelay } from "@/lib/appointments/rescheduleDelay";
import { prisma } from "@/lib/db/prisma";
import { DomainError, NotFoundError } from "@/lib/errors";
import { recordAuditLog } from "@/modules/audit/service";

const ACTIVE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

export interface ApplyDelayResult {
  additionalMinutes: number;
  barberId: string;
  barberName: string;
  sourceCustomerName: string;
  source: { id: string; previousStartAt: Date; previousEndAt: Date; newStartAt: Date; newEndAt: Date };
  affectedCustomers: {
    appointmentId: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    previousStartAt: Date;
    previousEndAt: Date;
    newStartAt: Date;
    newEndAt: Date;
  }[];
}

export interface AppointmentFilters {
  barberId?: string;
  customerId?: string;
  day?: Date;
}

function buildWhere(filters: AppointmentFilters): Prisma.AppointmentWhereInput {
  const { barberId, customerId, day } = filters;
  return {
    ...(barberId ? { barberId } : {}),
    ...(customerId ? { customerId } : {}),
    ...(day ? { startAt: { gte: startOfDay(day), lte: endOfDay(day) } } : {}),
  };
}

export const appointmentsRepository = {
  findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: { customer: true, barber: true, service: true },
    });
  },

  findMany(filters: AppointmentFilters = {}) {
    return prisma.appointment.findMany({
      where: buildWhere(filters),
      include: { customer: true, barber: true, service: true },
      orderBy: { startAt: "asc" },
    });
  },

  /** Próximos agendamentos ativos de um cliente (painel do cliente). */
  upcomingForCustomer(customerId: string) {
    return prisma.appointment.findMany({
      where: { customerId, status: { in: ACTIVE_STATUSES }, startAt: { gte: startOfDay(new Date()) } },
      include: { barber: true, service: true },
      orderBy: { startAt: "asc" },
    });
  },

  /** Agenda completa do dia (inclui cancelados/no-show, para exibir riscado na tela). */
  listDayForBarber(barberId: string, day: Date) {
    return prisma.appointment.findMany({
      where: { barberId, startAt: { gte: startOfDay(day), lte: endOfDay(day) } },
      include: { customer: true, service: true },
      orderBy: { startAt: "asc" },
    });
  },

  /** Agendamentos ativos (não cancelados/no-show) do barbeiro no mesmo dia, exceto o próprio. */
  listActiveSameDay(barberId: string, day: Date, excludeId?: string) {
    return prisma.appointment.findMany({
      where: {
        barberId,
        status: { in: ACTIVE_STATUSES },
        startAt: { gte: startOfDay(day), lte: endOfDay(day) },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      include: { customer: true },
      orderBy: { startAt: "asc" },
    });
  },

  create(data: Prisma.AppointmentCreateInput) {
    return prisma.appointment.create({ data });
  },

  cancel(id: string) {
    return prisma.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
  },

  /**
   * Aplica um atraso reportado no agendamento `sourceId` e propaga a cascata
   * para os agendamentos seguintes do mesmo barbeiro/dia — tudo dentro de uma
   * única transação (critério 11: tudo ou nada). Re-busca o estado da agenda
   * de dentro da transação (nunca confia em dados de uma simulação anterior),
   * o que já resolve sozinho os casos de cancelamento no meio (some do filtro
   * de status) e de novo agendamento criado depois da simulação (entra na
   * busca fresca).
   */
  async applyDelay(params: { sourceId: string; newSourceEndAt: Date; actorUserId: string | null }): Promise<ApplyDelayResult> {
    return prisma.$transaction(async (tx) => {
      const source = await tx.appointment.findUnique({
        where: { id: params.sourceId },
        include: { customer: true, barber: true },
      });
      if (!source) throw new NotFoundError("Agendamento");

      const day = source.startAt;
      const sameDayActive = await tx.appointment.findMany({
        where: {
          barberId: source.barberId,
          status: { in: ACTIVE_STATUSES },
          startAt: { gte: startOfDay(day), lte: endOfDay(day) },
          id: { not: source.id },
        },
        include: { customer: true },
        orderBy: { startAt: "asc" },
      });

      const following = sameDayActive.filter((a) => a.startAt.getTime() > source.startAt.getTime());
      const before = sameDayActive.filter((a) => a.startAt.getTime() <= source.startAt.getTime());

      const simulation = simulateDelay({ source, newSourceEndAt: params.newSourceEndAt, following });

      // Validação defensiva de conflito real (critério 11): monta a posição
      // final de tudo (origem + afetados recalculados + os demais do dia sem
      // mudança) e garante que nenhum par se sobrepõe antes de gravar
      // qualquer coisa. Pela construção do algoritmo isso nunca deveria
      // disparar, mas é a rede de segurança que garante "tudo ou nada".
      const affectedIds = new Set(simulation.affected.map((c) => c.id));
      const finalPositions = [
        { id: source.id, startAt: simulation.source.newStartAt, endAt: simulation.source.newEndAt },
        ...simulation.affected.map((c) => ({ id: c.id, startAt: c.newStartAt, endAt: c.newEndAt })),
        ...following
          .filter((a) => !affectedIds.has(a.id))
          .map((a) => ({ id: a.id, startAt: a.startAt, endAt: a.endAt })),
        ...before.map((a) => ({ id: a.id, startAt: a.startAt, endAt: a.endAt })),
      ];

      for (let i = 0; i < finalPositions.length; i++) {
        for (let j = i + 1; j < finalPositions.length; j++) {
          if (hasOverlap(finalPositions[i], finalPositions[j])) {
            throw new DomainError(
              "Não foi possível reajustar toda a agenda automaticamente. Existem horários que precisam de intervenção da recepção. Nenhuma alteração foi aplicada.",
            );
          }
        }
      }

      const byId = new Map(sameDayActive.map((a) => [a.id, a]));

      // Ordem DESCENDENTE de novo horário: como existe @@unique([barberId,
      // startAt]), mover em ordem crescente pode colidir com o startAt antigo
      // de quem ainda não migrou (ex.: atraso de +30min com slots de 30min
      // back-to-back). Em ordem decrescente, cada slot-alvo já está livre.
      const affectedDesc = [...simulation.affected].sort((a, b) => b.newStartAt.getTime() - a.newStartAt.getTime());

      for (const change of affectedDesc) {
        const original = byId.get(change.id);
        if (!original) continue;
        await tx.appointment.update({
          where: { id: change.id },
          data: {
            startAt: change.newStartAt,
            endAt: change.newEndAt,
            originalStartAt: original.originalStartAt ?? original.startAt,
            originalEndAt: original.originalEndAt ?? original.endAt,
          },
        });
      }

      await tx.appointment.update({
        where: { id: source.id },
        data: {
          endAt: simulation.source.newEndAt,
          delayMinutes: source.delayMinutes + simulation.additionalMinutes,
          originalStartAt: source.originalStartAt ?? source.startAt,
          originalEndAt: source.originalEndAt ?? source.endAt,
        },
      });

      const affectedCustomers = simulation.affected.map((change) => {
        const original = byId.get(change.id)!;
        return {
          appointmentId: change.id,
          customerId: original.customerId,
          customerName: original.customer.name,
          customerPhone: original.customer.phone,
          previousStartAt: change.oldStartAt,
          previousEndAt: change.oldEndAt,
          newStartAt: change.newStartAt,
          newEndAt: change.newEndAt,
        };
      });

      await recordAuditLog(
        {
          userId: params.actorUserId,
          action: "ATRASO_AGENDAMENTO",
          entity: "Appointment",
          entityId: source.id,
          metadata: {
            barberId: source.barberId,
            barberName: source.barber.name,
            customerName: source.customer.name,
            previousStartAt: simulation.source.oldStartAt.toISOString(),
            previousEndAt: simulation.source.oldEndAt.toISOString(),
            newEndAt: simulation.source.newEndAt.toISOString(),
            additionalMinutes: simulation.additionalMinutes,
            affected: affectedCustomers.map((c) => ({
              appointmentId: c.appointmentId,
              customerId: c.customerId,
              customerName: c.customerName,
              previousStartAt: c.previousStartAt.toISOString(),
              previousEndAt: c.previousEndAt.toISOString(),
              newStartAt: c.newStartAt.toISOString(),
              newEndAt: c.newEndAt.toISOString(),
              notifyPending: true,
            })),
          },
        },
        tx,
      );

      return {
        additionalMinutes: simulation.additionalMinutes,
        barberId: source.barberId,
        barberName: source.barber.name,
        sourceCustomerName: source.customer.name,
        source: {
          id: source.id,
          previousStartAt: simulation.source.oldStartAt,
          previousEndAt: simulation.source.oldEndAt,
          newStartAt: simulation.source.newStartAt,
          newEndAt: simulation.source.newEndAt,
        },
        affectedCustomers,
      };
    });
  },
};
