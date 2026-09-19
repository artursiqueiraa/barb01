"use server";

import { revalidatePath } from "next/cache";

import { toActionErrorMessage } from "@/lib/actions/errors";
import { DomainError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions/guard";
import { recordAuditLog } from "@/modules/audit/service";

import { attendancesService } from "./service";

export type AttendanceActionState = { success: boolean; error?: string };

export async function registerAttendanceAction(
  _prevState: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const session = await requirePermission("attendances", "create");

  try {
    const raw = Object.fromEntries(formData.entries());

    // BARBEIRO só pode registrar atendimento para si mesmo — nunca confiar
    // no valor de barberId vindo do client sem checar contra a sessão.
    if (session.user.role === "BARBEIRO" && raw.barberId !== session.user.barberId) {
      throw new DomainError("Você só pode registrar atendimentos para si mesmo");
    }

    const attendance = await attendancesService.register(raw);

    await recordAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Attendance",
      entityId: attendance.id,
    });

    revalidatePath("/admin/atendimentos");
    revalidatePath(`/admin/clientes/${attendance.customerId}`);
    revalidatePath(`/admin/barbeiros/${attendance.barberId}`);
    revalidatePath("/admin/dashboard");

    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}
