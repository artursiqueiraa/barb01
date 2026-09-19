import type { Appointment, AppointmentStatus } from "@prisma/client";
import { addMinutes } from "date-fns";

import { findAnticipationOpportunity } from "@/lib/appointments/anticipation";
import { hasOverlap } from "@/lib/appointments/conflict";
import { simulateDelay as simulateDelayPure } from "@/lib/appointments/rescheduleDelay";
import { DomainError, NotFoundError } from "@/lib/errors";
import { notifyAnticipationRejected, notifyAppointmentChanged } from "@/lib/notifications/appointmentChanged";
import { type AppointmentFilters, appointmentsRepository } from "@/repositories/appointments";
import { barbersRepository } from "@/repositories/barbers";
import { customersRepository } from "@/repositories/customers";
import { servicesRepository } from "@/repositories/services";
import { appointmentSchema, reportDelaySchema, type ReportDelayInput } from "@/schemas/appointment";

const ACTIVE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED"];

function resolveNewEndAt(currentEndAt: Date, input: ReportDelayInput): Date {
  return input.mode === "preset" ? addMinutes(currentEndAt, input.minutes as number) : (input.newEndAt as Date);
}

/**
 * O barbeiro só pode informar atraso de um horário que já começou (ou já
 * deveria ter começado) — nunca de um compromisso futuro do dia. Evita
 * alteração acidental de toda a agenda antes da hora (validado de novo aqui,
 * nunca só na UI).
 */
function assertAlreadyStarted(startAt: Date) {
  if (startAt.getTime() > Date.now()) {
    throw new DomainError("Só é possível informar atraso em um atendimento que já começou");
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}

/**
 * Duas aceitações de antecipação concorrentes para o MESMO horário podem
 * colidir de duas formas no Postgres: violação do índice único parcial
 * (P2002, o caso comum) OU, sob concorrência real, um deadlock (40P01) —
 * verificado na prática rodando dois `acceptAnticipation` em paralelo contra
 * o banco real. Os dois significam a mesma coisa do ponto de vista de
 * negócio: "alguém mais ganhou esse horário primeiro" — nunca deve virar um
 * erro cru pro usuário.
 */
function isConcurrencyConflictError(error: unknown): boolean {
  if (isUniqueConstraintError(error)) return true;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("40P01") || message.toLowerCase().includes("deadlock");
}

export const appointmentsService = {
  list(filters: AppointmentFilters = {}) {
    return appointmentsRepository.findMany(filters);
  },

  listDayForBarber(barberId: string, day: Date) {
    return appointmentsRepository.listDayForBarber(barberId, day);
  },

  upcomingForCustomer(customerId: string) {
    return appointmentsRepository.upcomingForCustomer(customerId);
  },

  /**
   * Criação mínima de agendamento (fatia necessária para o recurso de atraso
   * ser testável — a reserva online completa, validação contra horário de
   * funcionamento e bloqueios de agenda continuam pendentes na Etapa 6).
   */
  async create(input: unknown) {
    const data = appointmentSchema.parse(input);

    const [customer, barber, service] = await Promise.all([
      customersRepository.findById(data.customerId),
      barbersRepository.findById(data.barberId),
      servicesRepository.findById(data.serviceId),
    ]);

    if (!customer || !customer.active) throw new DomainError("Cliente inválido ou inativo");
    if (!barber || !barber.active) throw new DomainError("Barbeiro inválido ou inativo");
    if (!service || !service.active) throw new DomainError("Serviço inválido ou inativo");

    const endAt = new Date(data.startAt.getTime() + service.durationMinutes * 60_000);

    // Regra principal de conflito: sobreposição real de intervalo, não só o
    // índice único de startAt (que não pegaria uma sobreposição parcial).
    const sameDayActive = await appointmentsRepository.listActiveSameDay(data.barberId, data.startAt);
    const hasConflict = sameDayActive.some((existing) => hasOverlap(existing, { startAt: data.startAt, endAt }));
    if (hasConflict) throw new DomainError("Horário conflita com outro agendamento do barbeiro");

    try {
      return await appointmentsRepository.create({
        customer: { connect: { id: customer.id } },
        barber: { connect: { id: barber.id } },
        service: { connect: { id: service.id } },
        startAt: data.startAt,
        endAt,
        notes: data.notes,
      });
    } catch (error) {
      // Rede de segurança extra contra duplicidade exata de startAt (@@unique) — não é a regra principal.
      if (isUniqueConstraintError(error)) throw new DomainError("Horário já ocupado para este barbeiro");
      throw error;
    }
  },

  cancel(id: string) {
    return appointmentsRepository.cancel(id);
  },

  /** Somente leitura: pré-visualização do reajuste (seção 4), antes de confirmar. */
  async simulateDelay(appointmentId: string, input: unknown) {
    const parsed = reportDelaySchema.parse({ appointmentId, ...(input as object) });

    const source = await appointmentsRepository.findById(appointmentId);
    if (!source) throw new NotFoundError("Agendamento");
    assertAlreadyStarted(source.startAt);

    const newEndAt = resolveNewEndAt(source.endAt, parsed);

    const sameDayActive = await appointmentsRepository.listActiveSameDay(source.barberId, source.startAt, source.id);
    const following = sameDayActive.filter((a) => a.startAt.getTime() > source.startAt.getTime());

    const simulation = simulateDelayPure({ source, newSourceEndAt: newEndAt, following });
    const byId = new Map(sameDayActive.map((a) => [a.id, a]));

    return {
      additionalMinutes: simulation.additionalMinutes,
      source: {
        id: source.id,
        customerName: source.customer.name,
        oldStartAt: simulation.source.oldStartAt,
        oldEndAt: simulation.source.oldEndAt,
        newStartAt: simulation.source.newStartAt,
        newEndAt: simulation.source.newEndAt,
      },
      affected: simulation.affected.map((change) => ({
        id: change.id,
        customerName: byId.get(change.id)?.customer.name ?? "",
        oldStartAt: change.oldStartAt,
        oldEndAt: change.oldEndAt,
        newStartAt: change.newStartAt,
        newEndAt: change.newEndAt,
      })),
    };
  },

  /** Aplica de fato o reajuste (transacional) e monta as notificações dos clientes deslocados. */
  async applyDelay(appointmentId: string, input: unknown, actor: { userId: string }) {
    const parsed = reportDelaySchema.parse({ appointmentId, ...(input as object) });

    const source = await appointmentsRepository.findById(appointmentId);
    if (!source) throw new NotFoundError("Agendamento");
    assertAlreadyStarted(source.startAt);

    const newEndAt = resolveNewEndAt(source.endAt, parsed);

    const result = await appointmentsRepository.applyDelay({
      sourceId: appointmentId,
      newSourceEndAt: newEndAt,
      actorUserId: actor.userId,
    });

    // Só quem foi de fato deslocado é notificado — o agendamento de origem
    // (o que causou o atraso) nunca entra aqui.
    const notifications = result.affectedCustomers.map((affected) => ({
      customerName: affected.customerName,
      ...notifyAppointmentChanged({
        customerName: affected.customerName,
        customerPhone: affected.customerPhone,
        previousStartAt: affected.previousStartAt,
        previousEndAt: affected.previousEndAt,
        newStartAt: affected.newStartAt,
        newEndAt: affected.newEndAt,
      }),
    }));

    return { ...result, notifications };
  },

  /**
   * Só identifica: horários liberados (cancelados) do mesmo barbeiro/dia,
   * anteriores a este agendamento, que caberiam com a duração dele sem
   * colidir com nada ativo. Não altera nada — é usado tanto para exibir a
   * oportunidade no `/perfil` quanto (revalidado) ao registrar a solicitação.
   */
  async findAnticipationOpportunityFor(appointment: Pick<Appointment, "id" | "barberId" | "startAt" | "endAt">) {
    const [cancelledSlots, activeSlots] = await Promise.all([
      appointmentsRepository.findCancelledSlotsSameDay(appointment.barberId, appointment.startAt, appointment.startAt),
      appointmentsRepository.listActiveSameDay(appointment.barberId, appointment.startAt, appointment.id),
    ]);

    return findAnticipationOpportunity({
      durationMs: appointment.endAt.getTime() - appointment.startAt.getTime(),
      cancelledSlots,
      activeSlots,
      now: new Date(),
    });
  },

  /**
   * O cliente MANIFESTA interesse em antecipar o próprio agendamento — nunca
   * altera o horário. Só o barbeiro decide (accept/reject).
   */
  async requestAnticipation(appointmentId: string, actor: { customerId: string }) {
    const appointment = await appointmentsRepository.findById(appointmentId);
    if (!appointment) throw new NotFoundError("Agendamento");

    if (appointment.customerId !== actor.customerId) {
      throw new DomainError("Você só pode solicitar antecipação para os próprios agendamentos");
    }
    if (!ACTIVE_STATUSES.includes(appointment.status)) {
      throw new DomainError("Este agendamento não está mais ativo");
    }
    if (appointment.anticipationStatus === "PENDING") {
      throw new DomainError("Você já tem uma solicitação pendente para este agendamento");
    }

    // Nunca confia em horário vindo do client — recalcula a oportunidade no servidor.
    const opportunity = await this.findAnticipationOpportunityFor(appointment);
    if (!opportunity) {
      throw new DomainError("Não há mais horário disponível para antecipação");
    }

    const updated = await appointmentsRepository.requestAnticipation({
      appointmentId,
      requestedStartAt: opportunity.startAt,
    });

    return {
      appointment: updated,
      barberId: appointment.barberId,
      customerName: appointment.customer.name,
      currentStartAt: appointment.startAt,
      currentEndAt: appointment.endAt,
      requestedStartAt: opportunity.startAt,
      requestedEndAt: opportunity.endAt,
    };
  },

  /** Barbeiro aceita: só agora o horário muda de fato (transacional, revalida tudo). */
  async acceptAnticipation(appointmentId: string, actor: { userId: string }) {
    let result;
    try {
      result = await appointmentsRepository.acceptAnticipation({ appointmentId, actorUserId: actor.userId });
    } catch (error) {
      // Rede de segurança final contra corrida real (comprovada em teste com
      // dois aceites simultâneos): traduz deadlock/violação de unicidade na
      // mesma mensagem amigável da regra 5, nunca deixa vazar erro cru.
      if (isConcurrencyConflictError(error)) {
        throw new DomainError("Este horário não está mais disponível.");
      }
      throw error;
    }

    return {
      appointment: result.appointment,
      notification: notifyAppointmentChanged({
        customerName: result.customer.name,
        customerPhone: result.customer.phone,
        previousStartAt: result.previousStartAt,
        previousEndAt: result.previousEndAt,
        newStartAt: result.appointment.startAt,
        newEndAt: result.appointment.endAt,
      }),
    };
  },

  /** Barbeiro recusa: mantém o horário original, só registra a decisão e avisa o cliente. */
  async rejectAnticipation(appointmentId: string, actor: { userId: string }) {
    const result = await appointmentsRepository.rejectAnticipation({ appointmentId, actorUserId: actor.userId });

    return {
      appointment: result.appointment,
      notification: notifyAnticipationRejected({
        customerName: result.customer.name,
        customerPhone: result.customer.phone,
        keptStartAt: result.appointment.startAt,
      }),
    };
  },
};
