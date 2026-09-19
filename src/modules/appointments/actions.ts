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

/** BARBEIRO só pode agir sobre os próprios agendamentos — nunca confiar no client para decidir isso. */
async function assertCanActOnAppointment(session: { user: { role: Role; barberId?: string | null } }, appointmentId: string) {
  if (session.user.role !== "BARBEIRO") return;
  const appointment = await appointmentsRepository.findById(appointmentId);
  if (!appointment) throw new NotFoundError("Agendamento");
  if (appointment.barberId !== session.user.barberId) {
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

  await appointmentsService.cancel(appointmentId);

  await recordAuditLog({
    userId: session.user.id,
    action: "CANCEL",
    entity: "Appointment",
    entityId: appointmentId,
  });

  revalidatePath("/admin/agendamentos");
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
