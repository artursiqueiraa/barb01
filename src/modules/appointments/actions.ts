"use server";

import { revalidatePath } from "next/cache";

import { toActionErrorMessage } from "@/lib/actions/errors";
import { DomainError, NotFoundError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions/guard";
import type { Role } from "@/lib/permissions/matrix";
import { recordAuditLog } from "@/modules/audit/service";
import { appointmentsRepository } from "@/repositories/appointments";

import { appointmentsService } from "./service";

export type AppointmentActionState = { success: boolean; error?: string };

/**
 * BARBEIRO só pode agir sobre os próprios agendamentos, CLIENTE só sobre os
 * próprios — nunca confiar no client para decidir isso. ADMIN/GERENTE/
 * RECEPCAO mantêm o acesso amplo que já tinham (nenhuma restrição extra).
 */
async function assertCanActOnAppointment(
  session: { user: { role: Role; barberId?: string | null; customerId?: string | null } },
  appointmentId: string,
) {
  if (session.user.role !== "BARBEIRO" && session.user.role !== "CLIENTE") return;

  const appointment = await appointmentsRepository.findById(appointmentId);
  if (!appointment) throw new NotFoundError("Agendamento");

  if (session.user.role === "BARBEIRO" && appointment.barberId !== session.user.barberId) {
    throw new DomainError("Você só pode gerenciar os próprios agendamentos");
  }
  if (session.user.role === "CLIENTE" && appointment.customerId !== session.user.customerId) {
    throw new DomainError("Você só pode gerenciar os próprios agendamentos");
  }
}

export async function createAppointmentAction(
  _prevState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const session = await requirePermission("appointments", "create");

  try {
    const raw = Object.fromEntries(formData.entries());
    const appointment = await appointmentsService.create(raw);

    await recordAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Appointment",
      entityId: appointment.id,
    });

    revalidatePath("/admin/agendamentos");

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function cancelAppointmentAction(appointmentId: string): Promise<void> {
  const session = await requirePermission("appointments", "update");
  await assertCanActOnAppointment(session, appointmentId);

  // Busca antes de cancelar só para enriquecer a auditoria (quem/quando já
  // vêm do próprio recordAuditLog; aqui registramos o que foi cancelado).
  const appointment = await appointmentsRepository.findById(appointmentId);

  await appointmentsService.cancel(appointmentId);

  await recordAuditLog({
    userId: session.user.id,
    action: "CANCEL",
    entity: "Appointment",
    entityId: appointmentId,
    metadata: appointment
      ? {
          cancelledByRole: session.user.role,
          customerId: appointment.customerId,
          customerName: appointment.customer.name,
          barberId: appointment.barberId,
          startAt: appointment.startAt.toISOString(),
          endAt: appointment.endAt.toISOString(),
        }
      : undefined,
  });

  revalidatePath("/admin/agendamentos");
  revalidatePath("/perfil");
}

export type DelaySimulationDTO = {
  additionalMinutes: number;
  source: { id: string; customerName: string; oldStartAt: string; oldEndAt: string; newStartAt: string; newEndAt: string };
  affected: {
    id: string;
    customerName: string;
    oldStartAt: string;
    oldEndAt: string;
    newStartAt: string;
    newEndAt: string;
  }[];
};

export type DelayActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type ReportDelayPayload = { mode: "preset" | "custom"; minutes?: number; newEndAt?: string };

/** Pré-visualização (não grava nada): mostra o impacto antes do barbeiro confirmar. */
export async function simulateDelayAction(
  appointmentId: string,
  payload: ReportDelayPayload,
): Promise<DelayActionResult<DelaySimulationDTO>> {
  const session = await requirePermission("appointments", "update");

  try {
    await assertCanActOnAppointment(session, appointmentId);

    const simulation = await appointmentsService.simulateDelay(appointmentId, payload);

    return {
      ok: true,
      data: {
        additionalMinutes: simulation.additionalMinutes,
        source: {
          id: simulation.source.id,
          customerName: simulation.source.customerName,
          oldStartAt: simulation.source.oldStartAt.toISOString(),
          oldEndAt: simulation.source.oldEndAt.toISOString(),
          newStartAt: simulation.source.newStartAt.toISOString(),
          newEndAt: simulation.source.newEndAt.toISOString(),
        },
        affected: simulation.affected.map((change) => ({
          id: change.id,
          customerName: change.customerName,
          oldStartAt: change.oldStartAt.toISOString(),
          oldEndAt: change.oldEndAt.toISOString(),
          newStartAt: change.newStartAt.toISOString(),
          newEndAt: change.newEndAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    return { ok: false, error: toActionErrorMessage(error) };
  }
}

export type DelayAppliedDTO = {
  additionalMinutes: number;
  affectedCount: number;
  notifications: { customerName: string; message: string; whatsappLink: string }[];
};

/** Confirma o reajuste: aplica (transacional), audita e prepara as notificações dos clientes deslocados. */
export async function applyDelayAction(
  appointmentId: string,
  payload: ReportDelayPayload,
): Promise<DelayActionResult<DelayAppliedDTO>> {
  const session = await requirePermission("appointments", "update");

  try {
    await assertCanActOnAppointment(session, appointmentId);

    const result = await appointmentsService.applyDelay(appointmentId, payload, { userId: session.user.id });

    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin/relatorios");
    revalidatePath("/perfil");

    return {
      ok: true,
      data: {
        additionalMinutes: result.additionalMinutes,
        affectedCount: result.affectedCustomers.length,
        notifications: result.notifications.map((n) => ({
          customerName: n.customerName,
          message: n.message,
          whatsappLink: n.whatsappLink,
        })),
      },
    };
  } catch (error) {
    return { ok: false, error: toActionErrorMessage(error) };
  }
}

export type SimpleActionResult = { success: boolean; error?: string };

/**
 * O cliente MANIFESTA interesse em antecipar o próprio agendamento — isso
 * nunca altera o horário. Só o barbeiro decide (accept/reject).
 */
export async function requestAnticipationAction(appointmentId: string): Promise<SimpleActionResult> {
  const session = await requirePermission("appointments", "update");

  try {
    if (session.user.role !== "CLIENTE" || !session.user.customerId) {
      throw new DomainError("Apenas o cliente pode solicitar antecipação do próprio agendamento");
    }
    await assertCanActOnAppointment(session, appointmentId);

    const result = await appointmentsService.requestAnticipation(appointmentId, { customerId: session.user.customerId });

    await recordAuditLog({
      userId: session.user.id,
      action: "SOLICITACAO_ANTECIPACAO",
      entity: "Appointment",
      entityId: appointmentId,
      metadata: {
        barberId: result.barberId,
        customerId: session.user.customerId,
        customerName: result.customerName,
        currentStartAt: result.currentStartAt.toISOString(),
        currentEndAt: result.currentEndAt.toISOString(),
        requestedStartAt: result.requestedStartAt.toISOString(),
        requestedEndAt: result.requestedEndAt.toISOString(),
      },
    });

    revalidatePath("/perfil");
    revalidatePath("/admin/agendamentos");

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export type AnticipationDecisionResult = {
  success: boolean;
  error?: string;
  notification?: { message: string; whatsappLink: string };
};

/** Barbeiro aceita a solicitação: só agora o horário muda de fato (transacional). */
export async function acceptAnticipationAction(appointmentId: string): Promise<AnticipationDecisionResult> {
  const session = await requirePermission("appointments", "update");

  try {
    await assertCanActOnAppointment(session, appointmentId);

    const result = await appointmentsService.acceptAnticipation(appointmentId, { userId: session.user.id });

    revalidatePath("/admin/agendamentos");
    revalidatePath("/admin/relatorios");
    revalidatePath("/perfil");

    return { success: true, notification: { message: result.notification.message, whatsappLink: result.notification.whatsappLink } };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

/** Barbeiro recusa: mantém o horário original, só registra a decisão e avisa o cliente. */
export async function rejectAnticipationAction(appointmentId: string): Promise<AnticipationDecisionResult> {
  const session = await requirePermission("appointments", "update");

  try {
    await assertCanActOnAppointment(session, appointmentId);

    const result = await appointmentsService.rejectAnticipation(appointmentId, { userId: session.user.id });

    revalidatePath("/admin/agendamentos");
    revalidatePath("/perfil");

    return { success: true, notification: { message: result.notification.message, whatsappLink: result.notification.whatsappLink } };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}
