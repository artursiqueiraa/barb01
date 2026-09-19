import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DeactivateForm } from "@/components/ui/DeactivateForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { requirePermission } from "@/lib/permissions/guard";
import { deactivatePlanAction } from "@/modules/plans/actions";
import { PlanCreateForm } from "@/modules/plans/PlanCreateForm";
import { plansService } from "@/modules/plans/service";

const billingPeriodLabels: Record<string, string> = { MONTHLY: "Mensal", YEARLY: "Anual" };

export default async function PlansPage() {
  const session = await requirePermission("plans", "read");
  const canManage = session.user.role === "ADMIN" || session.user.role === "GERENTE";
  const plans = await plansService.list();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Planos</h1>

      {canManage ? (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">Novo plano</h2>
          <PlanCreateForm />
        </Card>
      ) : null}

      {plans.length === 0 ? (
        <EmptyState title="Nenhum plano cadastrado" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Nome</Th>
              <Th>Preço</Th>
              <Th>Periodicidade</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {plans.map((plan) => (
              <Tr key={plan.id}>
                <Td className="font-medium text-zinc-900">{plan.name}</Td>
                <Td>{formatCurrency(plan.price.toString())}</Td>
                <Td>{billingPeriodLabels[plan.billingPeriod]}</Td>
                <Td>
                  <Badge tone={plan.active ? "success" : "neutral"}>{plan.active ? "Ativo" : "Inativo"}</Badge>
                </Td>
                <Td>
                  {canManage && plan.active ? (
                    <DeactivateForm action={deactivatePlanAction.bind(null, plan.id)} />
                  ) : null}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
