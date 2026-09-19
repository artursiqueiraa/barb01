"use server";

import { revalidatePath } from "next/cache";

import { toActionErrorMessage } from "@/lib/actions/errors";
import { requirePermission } from "@/lib/permissions/guard";
import { recordAuditLog } from "@/modules/audit/service";

import { barbersService } from "./service";

export type BarberActionState = { success: boolean; error?: string };

export async function createBarberAction(
  _prevState: BarberActionState,
  formData: FormData,
): Promise<BarberActionState> {
  const session = await requirePermission("barbers", "create");

  try {
    const raw = Object.fromEntries(formData.entries());
    const barber = await barbersService.create(raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Barber",
      entityId: barber.id,
    });
    revalidatePath("/admin/barbeiros");
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function updateBarberAction(
  id: string,
  _prevState: BarberActionState,
  formData: FormData,
): Promise<BarberActionState> {
  const session = await requirePermission("barbers", "update");

  try {
    const raw = Object.fromEntries(formData.entries());
    await barbersService.update(id, raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Barber",
      entityId: id,
    });
    revalidatePath("/admin/barbeiros");
    revalidatePath(`/admin/barbeiros/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function deactivateBarberAction(id: string) {
  const session = await requirePermission("barbers", "delete");
  await barbersService.deactivate(id);
  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entity: "Barber",
    entityId: id,
  });
  revalidatePath("/admin/barbeiros");
}

export type CommissionRuleActionState = { success: boolean; error?: string };

export async function setCommissionRuleAction(
  _prevState: CommissionRuleActionState,
  formData: FormData,
): Promise<CommissionRuleActionState> {
  const session = await requirePermission("commissionRules", "update");

  try {
    const raw = Object.fromEntries(formData.entries());
    const rule = await barbersService.setCommissionRule(raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "COMMISSION_CHANGE",
      entity: "CommissionRule",
      entityId: rule.id,
      metadata: { barberId: rule.barberId, serviceId: rule.serviceId, percentage: rule.percentage.toString() },
    });
    revalidatePath(`/admin/barbeiros/${rule.barberId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}
