"use server";

import { revalidatePath } from "next/cache";

import { toActionErrorMessage } from "@/lib/actions/errors";
import { requirePermission } from "@/lib/permissions/guard";
import { recordAuditLog } from "@/modules/audit/service";

import { customersService } from "./service";

export type CustomerActionState = { success: boolean; error?: string };

export async function createCustomerAction(
  _prevState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const session = await requirePermission("customers", "create");

  try {
    const raw = Object.fromEntries(formData.entries());
    const customer = await customersService.create(raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Customer",
      entityId: customer.id,
    });
    revalidatePath("/admin/clientes");
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function updateCustomerAction(
  id: string,
  _prevState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const session = await requirePermission("customers", "update");

  try {
    const raw = Object.fromEntries(formData.entries());
    await customersService.update(id, raw);
    await recordAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
    });
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

export async function deactivateCustomerAction(id: string) {
  const session = await requirePermission("customers", "delete");
  await customersService.deactivate(id);
  await recordAuditLog({
    userId: session.user.id,
    action: "DELETE",
    entity: "Customer",
    entityId: id,
  });
  revalidatePath("/admin/clientes");
}
