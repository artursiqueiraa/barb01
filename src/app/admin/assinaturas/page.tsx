import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SubscriptionStatus } from "@prisma/client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { subscriptionStatusLabels } from "@/lib/format/labels";
import { can } from "@/lib/permissions/matrix";
import { requirePermission } from "@/lib/permissions/guard";
import { plansService } from "@/modules/plans/service";
import { CancelSubscriptionForm } from "@/modules/subscriptions/CancelSubscriptionForm";
import { ConfirmPaymentForm } from "@/modules/subscriptions/ConfirmPaymentForm";
import { subscriptionsService } from "@/modules/subscriptions/service";

const statusTone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PENDING: "neutral",
  PAST_DUE: "warning",
  CANCELLED: "danger",
  EXPIRED: "danger",
};

const STATUS_OPTIONS: SubscriptionStatus[] = ["PENDING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"];

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; planId?: string; from?: string; to?: string }>;
}) {
  const session = await requirePermission("subscriptions", "read");
  const { status, planId, from, to } = await searchParams;

  const [subscriptions, plans] = await Promise.all([
    subscriptionsService.list({
      status: status ? (status as SubscriptionStatus) : undefined,
      planId: planId || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(`${to}T23:59:59`) : undefined,
    }),
    plansService.list(),
  ]);

  const canConfirmPayment = can(session.user.role, "payments", "update");
  const canCancel = can(session.user.role, "subscriptions", "update") && session.user.role !== "CLIENTE";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Assinaturas</h1>

      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <Field label="Status" htmlFor="status">
            <select
              id="status"
              name="status"
              defaultValue={status ?? ""}
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {subscriptionStatusLabels[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Plano" htmlFor="planId">
            <select
              id="planId"
              name="planId"
              defaultValue={planId ?? ""}
              className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="">Todos</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="De" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={from} />
          </Field>
          <Field label="Até" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={to} />
          </Field>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      {subscriptions.length === 0 ? (
        <EmptyState title="Nenhuma assinatura encontrada" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Cliente</Th>
              <Th>Plano</Th>
              <Th>Preço</Th>
              <Th>Status</Th>
              <Th>Início</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {subscriptions.map((subscription) => (
              <Tr key={subscription.id}>
                <Td>{subscription.customer.name}</Td>
                <Td>{subscription.plan.name}</Td>
                <Td>{formatCurrency(subscription.price.toString())}</Td>
                <Td>
                  <Badge tone={statusTone[subscription.status]}>
                    {subscriptionStatusLabels[subscription.status]}
                  </Badge>
                </Td>
                <Td>
                  {subscription.startedAt
                    ? format(subscription.startedAt, "dd/MM/yyyy", { locale: ptBR })
                    : "-"}
                </Td>
                <Td>
                  <div className="flex flex-col gap-2">
                    {canConfirmPayment && (subscription.status === "PENDING" || subscription.status === "PAST_DUE") ? (
                      <ConfirmPaymentForm
                        subscriptionId={subscription.id}
                        defaultAmount={subscription.price.toString()}
                      />
                    ) : null}
                    {canCancel &&
                    (subscription.status === "PENDING" ||
                      subscription.status === "ACTIVE" ||
                      subscription.status === "PAST_DUE") ? (
                      <CancelSubscriptionForm subscriptionId={subscription.id} />
                    ) : null}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
