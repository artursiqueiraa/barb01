import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format/currency";
import { subscriptionStatusLabels } from "@/lib/format/labels";
import { CancelSubscriptionForm } from "@/modules/subscriptions/CancelSubscriptionForm";
import { CheckoutForm } from "@/modules/subscriptions/CheckoutForm";
import { subscriptionsService } from "@/modules/subscriptions/service";
import { plansService } from "@/modules/plans/service";

const OPEN_STATUSES = new Set(["PENDING", "ACTIVE", "PAST_DUE"]);

const statusTone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  ACTIVE: "success",
  PENDING: "neutral",
  PAST_DUE: "warning",
  CANCELLED: "danger",
  EXPIRED: "danger",
};

export default async function CustomerSubscriptionPage() {
  const session = await auth();
  if (!session?.user?.customerId) redirect("/login");

  const subscriptions = await subscriptionsService.list({ customerId: session.user.customerId });
  const current = subscriptions.find((s) => OPEN_STATUSES.has(s.status));

  if (!current) {
    const plans = await plansService.list();
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Assine um plano</h1>
          <p className="mt-1 text-sm text-zinc-500">Escolha um plano e comece a aproveitar cortes ilimitados.</p>
        </div>
        <Card>
          <CheckoutForm
            plans={plans.map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price.toString(),
              billingPeriod: p.billingPeriod,
            }))}
          />
        </Card>
      </div>
    );
  }

  const detail = await subscriptionsService.getProfile(current.id);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-10">
      <h1 className="text-xl font-semibold text-zinc-900">Minha assinatura</h1>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-zinc-900">{detail.plan.name}</p>
          <Badge tone={statusTone[detail.status]}>{subscriptionStatusLabels[detail.status]}</Badge>
        </div>
        <p className="text-sm text-zinc-500">Valor contratado: {formatCurrency(detail.price.toString())}</p>
        {detail.startedAt ? (
          <p className="text-sm text-zinc-500">
            Início: {format(detail.startedAt, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        ) : null}
        {detail.currentPeriodEnd ? (
          <p className="text-sm text-zinc-500">
            Próxima cobrança: {format(detail.currentPeriodEnd, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        ) : null}

        {detail.status === "PENDING" ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Pagamento pendente — a assinatura será ativada assim que a recepção confirmar o recebimento.
          </p>
        ) : null}
        {detail.status === "PAST_DUE" ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Cobrança em atraso — regularize o pagamento na recepção para manter os benefícios ativos.
          </p>
        ) : null}

        {(detail.status === "PENDING" || detail.status === "ACTIVE" || detail.status === "PAST_DUE") ? (
          <div className="pt-2">
            <CancelSubscriptionForm subscriptionId={detail.id} />
          </div>
        ) : null}
      </Card>

      {detail.payments.length > 0 ? (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">Pagamentos</h2>
          <Table>
            <Thead>
              <Tr>
                <Th>Data</Th>
                <Th>Valor</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {detail.payments.map((payment) => (
                <Tr key={payment.id}>
                  <Td>{format(payment.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}</Td>
                  <Td>{formatCurrency(payment.amount.toString())}</Td>
                  <Td>{payment.status}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
