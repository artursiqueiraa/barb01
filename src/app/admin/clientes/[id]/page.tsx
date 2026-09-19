import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCpf, formatPhone } from "@/lib/format/currency";
import { paymentTypeLabels, subscriptionStatusLabels } from "@/lib/format/labels";
import { requirePermission } from "@/lib/permissions/guard";
import { customersService } from "@/modules/customers/service";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("customers", "read");
  const { id } = await params;
  const { customer, attendances, subscription, stats } = await customersService.getProfile(id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{customer.name}</h1>
        <p className="text-sm text-zinc-500">
          {formatCpf(customer.cpf)} · {formatPhone(customer.phone)}
          {customer.email ? ` · ${customer.email}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">Plano</p>
          <p className="mt-1 font-medium text-zinc-900">{subscription?.plan.name ?? "Sem assinatura"}</p>
          {subscription ? (
            <Badge tone={subscription.status === "ACTIVE" ? "success" : "neutral"} className="mt-2">
              {subscriptionStatusLabels[subscription.status]}
            </Badge>
          ) : null}
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Total de atendimentos</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.totalAttendances}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Total de cortes</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.totalCortes}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Total de barbas</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.totalBarbas}</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Histórico de atendimentos</h2>
        {attendances.length === 0 ? (
          <EmptyState title="Nenhum atendimento registrado" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Data</Th>
                <Th>Serviço</Th>
                <Th>Barbeiro</Th>
                <Th>Pagamento</Th>
              </Tr>
            </Thead>
            <Tbody>
              {attendances.map((attendance) => (
                <Tr key={attendance.id}>
                  <Td>{format(attendance.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}</Td>
                  <Td>{attendance.service.name}</Td>
                  <Td>{attendance.barber.name}</Td>
                  <Td>{paymentTypeLabels[attendance.paymentType]}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
