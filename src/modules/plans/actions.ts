"use server";

import { revalidatePath } from "next/cache";

import { toActionErrorMessage } from "@/lib/actions/errors";
import { requirePermission } from "@/lib/permissions/guard";
import { recordAuditLog } from "@/modules/audit/service";

import { plansService } from "./service";

export type PlanActionState = { success: boolean; error?: string };

export async function createPlanAction(
  _prevState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requirePermission("plans", "create");

  try {
    const raw = Object.fromEntries(formData.entries());
    const plan = await plansService.create(raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Plan",
      entityId: plan.id,
    });
    revalidatePath("/admin/planos");
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function updatePlanAction(
  id: string,
  _prevState: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requirePermission("plans", "update");

  try {
    const raw = Object.fromEntries(formData.entries());
    await plansService.update(id, raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Plan",
      entityId: id,
      metadata: { price: raw.price },
    });
    revalidatePath("/admin/planos");
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function deactivatePlanAction(id: string) {
  const session = await requirePermission("plans", "delete");
  await plansService.deactivate(id);
  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entity: "Plan",
    entityId: id,
  });
  revalidatePath("/admin/planos");
}
