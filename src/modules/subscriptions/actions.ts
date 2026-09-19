"use server";

import { revalidatePath } from "next/cache";

import { toActionErrorMessage } from "@/lib/actions/errors";
import { DomainError } from "@/lib/errors";
import { requirePermission, requireSession } from "@/lib/permissions/guard";
import { recordAuditLog } from "@/modules/audit/service";
import { confirmPaymentSchema } from "@/schemas/subscription";

import { subscriptionsRepository } from "@/repositories/subscriptions";
import { subscriptionsService } from "./service";

export type SubscriptionActionState = { success: boolean; error?: string };

/** CLIENTE inicia o checkout de um plano para si mesmo. */
export async function createCheckoutAction(
  _prevState: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const session = await requirePermission("subscriptions", "create");

  if (!session.user.customerId) {
    return { success: false, error: "Apenas clientes podem assinar um plano" };
  }

  try {
    const raw = Object.fromEntries(formData.entries());
    const { subscription } = await subscriptionsService.createCheckout(session.user.customerId, raw);

    await recordAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Subscription",
      entityId: subscription.id,
    });

    revalidatePath("/perfil/assinatura");
    revalidatePath("/admin/assinaturas");
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

/** ADMIN/GERENTE confirma que o pagamento (Pix/dinheiro/cartão) foi recebido. */
export async function confirmPaymentAction(
  _prevState: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const session = await requirePermission("payments", "update");

  try {
    const raw = Object.fromEntries(formData.entries());
    const data = confirmPaymentSchema.parse(raw);

    await subscriptionsService.confirmPayment(data.subscriptionId, {
      amount: data.amount,
      paymentType: data.paymentType,
    });

    await recordAuditLog({
      userId: session.user.id,
      action: "PAYMENT_CONFIRMED",
      entity: "Subscription",
      entityId: data.subscriptionId,
      metadata: { amount: data.amount, paymentType: data.paymentType },
    });

    revalidatePath("/admin/assinaturas");
    revalidatePath("/admin/financeiro");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false, error: toActionErrorMessage(error) };
  }
}

/** Cliente cancela a própria assinatura, ou ADMIN/GERENTE cancela em nome dele. */
export async function cancelSubscriptionAction(subscriptionId: string, formData: FormData) {
  const session = await requirePermission("subscriptions", "update");

  if (session.user.role === "CLIENTE") {
    const subscription = await subscriptionsRepository.findById(subscriptionId);
    if (!subscription || subscription.customerId !== session.user.customerId) {
      throw new DomainError("Você só pode cancelar sua própria assinatura");
    }
  }

  const reasonValue = formData.get("reason");
  const reason = typeof reasonValue === "string" && reasonValue.trim() ? reasonValue.trim() : undefined;

  await subscriptionsService.cancel(subscriptionId, { reason });

  await recordAuditLog({
    userId: session.user.id,
    action: "CANCEL",
    entity: "Subscription",
    entityId: subscriptionId,
    metadata: reason ? { reason } : undefined,
  });

  revalidatePath("/perfil/assinatura");
  revalidatePath("/admin/assinaturas");
}

/** Uso administrativo: simula/registra falha de cobrança recorrente (ACTIVE -> PAST_DUE). */
export async function markPaymentFailedAction(subscriptionId: string, reason?: string) {
  const session = await requireSession();
  const canManage = session.user.role === "ADMIN" || session.user.role === "GERENTE";
  if (!canManage) throw new DomainError("Sem permissão para esta ação");

  await subscriptionsService.markPaymentFailed(subscriptionId, reason);

  await recordAuditLog({
    userId: session.user.id,
    action: "PAYMENT_FAILED",
    entity: "Subscription",
    entityId: subscriptionId,
    metadata: reason ? { reason } : undefined,
  });

  revalidatePath("/admin/assinaturas");
}
