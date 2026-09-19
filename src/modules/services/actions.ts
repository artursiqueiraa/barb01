"use server";

import { revalidatePath } from "next/cache";

import { toActionErrorMessage } from "@/lib/actions/errors";
import { requirePermission } from "@/lib/permissions/guard";
import { recordAuditLog } from "@/modules/audit/service";

import { servicesService } from "./service";

export type ServiceActionState = { success: boolean; error?: string };

export async function createServiceAction(
  _prevState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const session = await requirePermission("services", "create");

  try {
    const raw = Object.fromEntries(formData.entries());
    const service = await servicesService.create(raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Service",
      entityId: service.id,
    });
    revalidatePath("/admin/servicos");
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function updateServiceAction(
  id: string,
  _prevState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const session = await requirePermission("services", "update");

  try {
    const raw = Object.fromEntries(formData.entries());
    await servicesService.update(id, raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Service",
      entityId: id,
      metadata: { price: raw.price },
    });
    revalidatePath("/admin/servicos");
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function deactivateServiceAction(id: string) {
  const session = await requirePermission("services", "delete");
  await servicesService.deactivate(id);
  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entity: "Service",
    entityId: id,
  });
  revalidatePath("/admin/servicos");
}
