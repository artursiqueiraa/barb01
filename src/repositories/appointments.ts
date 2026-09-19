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

  /** Horários liberados (cancelados) do barbeiro no mesmo dia, antes de um horário de referência. */
  findCancelledSlotsSameDay(barberId: string, day: Date, beforeStartAt: Date) {
    return prisma.appointment.findMany({
      where: { barberId, status: "CANCELLED", startAt: { gte: startOfDay(day), lt: beforeStartAt } },
      orderBy: { startAt: "asc" },
    });
  },

  create(data: Prisma.AppointmentCreateInput) {
    return prisma.appointment.create({ data });
  },

  /**
   * Cancela o agendamento e, se havia uma solicitação de antecipação
   * pendente NELE (o cliente pediu para antecipar este agendamento e
   * desistiu ao cancelá-lo), invalida essa solicitação — regra 6: não pode
   * ser aceita depois. Transação curta só para ler o estado atual antes de
   * decidir se precisa tocar `anticipationStatus`.
   */
  cancel(id: string) {
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id } });
      if (!appointment) throw new NotFoundError("Agendamento");

      return tx.appointment.update({
        where: { id },
        data: {
          status: "CANCELLED",
          ...(appointment.anticipationStatus === "PENDING" ? { anticipationStatus: "CANCELLED" } : {}),
        },
      });
    });
  },

  /** Solicitação de antecipação: o cliente só manifesta interesse — nada muda até o barbeiro decidir. */
  requestAnticipation(params: { appointmentId: string; requestedStartAt: Date }) {
    return prisma.appointment.update({
      where: { id: params.appointmentId },
      data: { anticipationStatus: "PENDING", anticipationRequestedStartAt: params.requestedStartAt },
    });
  },

  /** O barbeiro recusa: mantém o horário original, só registra a decisão. */
  async rejectAnticipation(params: { appointmentId: string; actorUserId: string | null }) {
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: params.appointmentId },
        include: { customer: true, barber: true },
      });
      if (!appointment) throw new NotFoundError("Agendamento");
      if (appointment.anticipationStatus !== "PENDING") {
        throw new DomainError("Não há solicitação pendente para este agendamento");
      }

      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: { anticipationStatus: "REJECTED" },
      });

      await recordAuditLog(
        {
          userId: params.actorUserId,
          action: "ANTECIPACAO_RECUSADA",
          entity: "Appointment",
          entityId: appointment.id,
          metadata: {
            barberId: appointment.barberId,
            barberName: appointment.barber.name,
            customerId: appointment.customerId,
            customerName: appointment.customer.name,
            requestedStartAt: appointment.anticipationRequestedStartAt?.toISOString() ?? null,
            keptStartAt: appointment.startAt.toISOString(),
            keptEndAt: appointment.endAt.toISOString(),
          },
        },
        tx,
      );

      return { appointment: updated, customer: appointment.customer };
    });
  },

  /**
   * O barbeiro aceita uma solicitação de antecipação: move o agendamento
   * para o horário solicitado — só agora, nunca antes. Transacional pelo
   * mesmo motivo do `applyDelay` (critério "tudo ou nada" + concorrência):
   * revalida tudo com dados frescos dentro da transação, nunca confia em
   * dados de uma tela já aberta. Duas aceitações concorrentes para o mesmo
   * horário: a validação de sobreposição pega o caso comum, e o índice
   * único parcial (barberId+startAt entre ativos) é a rede de segurança
   * final contra corrida real — a segunda `update` falha com P2002.
   */
  async acceptAnticipation(params: { appointmentId: string; actorUserId: string | null }) {
    return prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: params.appointmentId },
        include: { customer: true, barber: true },
      });
      if (!appointment) throw new NotFoundError("Agendamento");
      if (appointment.anticipationStatus !== "PENDING" || !appointment.anticipationRequestedStartAt) {
        throw new DomainError("Não há solicitação pendente para este agendamento");
      }

      const newStartAt = appointment.anticipationRequestedStartAt;
      const durationMs = appointment.endAt.getTime() - appointment.startAt.getTime();
      const newEndAt = new Date(newStartAt.getTime() + durationMs);

      const sameDayActive = await tx.appointment.findMany({
        where: {
          barberId: appointment.barberId,
          status: { in: ACTIVE_STATUSES },
          startAt: { gte: startOfDay(appointment.startAt), lte: endOfDay(appointment.startAt) },
          id: { not: appointment.id },
        },
      });

      const conflict = sameDayActive.some((other) => hasOverlap({ startAt: newStartAt, endAt: newEndAt }, other));
      if (conflict) {
        throw new DomainError("Este horário não está mais disponível.");
      }

      const updated = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          startAt: newStartAt,
          endAt: newEndAt,
          anticipationStatus: "ACCEPTED",
          originalStartAt: appointment.originalStartAt ?? appointment.startAt,
          originalEndAt: appointment.originalEndAt ?? appointment.endAt,
        },
      });

      // Outras solicitações pendentes do mesmo barbeiro/dia que pediam um
      // horário que agora colide com o que acabou de ser ocupado ficam
      // "indisponíveis" — reaproveitamos REJECTED, conforme autorizado pelo
      // pedido como a solução mais simples (evita o barbeiro tentar aceitar
      // algo que já não é mais possível).
      const otherPending = await tx.appointment.findMany({
        where: {
          barberId: appointment.barberId,
          status: { in: ACTIVE_STATUSES },
          anticipationStatus: "PENDING",
          id: { not: appointment.id },
          startAt: { gte: startOfDay(appointment.startAt), lte: endOfDay(appointment.startAt) },
        },
      });

      for (const other of otherPending) {
        if (!other.anticipationRequestedStartAt) continue;
        const otherDuration = other.endAt.getTime() - other.startAt.getTime();
        const otherCandidateEnd = new Date(other.anticipationRequestedStartAt.getTime() + otherDuration);
        if (hasOverlap({ startAt: other.anticipationRequestedStartAt, endAt: otherCandidateEnd }, { startAt: newStartAt, endAt: newEndAt })) {
          await tx.appointment.update({ where: { id: other.id }, data: { anticipationStatus: "REJECTED" } });
        }
      }

      await recordAuditLog(
        {
          userId: params.actorUserId,
          action: "ANTECIPACAO_ACEITA",
          entity: "Appointment",
          entityId: appointment.id,
          metadata: {
            barberId: appointment.barberId,
            barberName: appointment.barber.name,
            customerId: appointment.customerId,
            customerName: appointment.customer.name,
            previousStartAt: appointment.startAt.toISOString(),
            previousEndAt: appointment.endAt.toISOString(),
            newStartAt: newStartAt.toISOString(),
            newEndAt: newEndAt.toISOString(),
          },
        },
        tx,
      );

      return {
        appointment: updated,
        customer: appointment.customer,
        previousStartAt: appointment.startAt,
        previousEndAt: appointment.endAt,
      };
    });
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

      // Ordem DESCENDENTE de novo horário: como existe um índice único
      // parcial (barberId+startAt entre agendamentos ativos), mover em ordem
      // crescente pode colidir com o startAt antigo de quem ainda não migrou
      // (ex.: atraso de +30min com slots de 30min back-to-back). Em ordem
      // decrescente, cada slot-alvo já está livre.
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
