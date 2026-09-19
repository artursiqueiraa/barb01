import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { paymentTypeLabels } from "@/lib/format/labels";
import { requirePermission } from "@/lib/permissions/guard";
import { CommissionRuleForm } from "@/modules/barbers/CommissionRuleForm";
import { barbersService } from "@/modules/barbers/service";
import { servicesService } from "@/modules/services/service";

export default async function BarberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("barbers", "read");
  const { id } = await params;
  const { barber, attendances, stats } = await barbersService.getProfile(id);
  const canManageCommission = session.user.role === "ADMIN" || session.user.role === "GERENTE";
  const services = canManageCommission ? await servicesService.list() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{barber.name}</h1>
        <p className="text-sm text-zinc-500">
          Comissão padrão: {Number(barber.defaultCommissionPercentage)}%
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-zinc-500">Total de atendimentos</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.totalAttendances}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Cortes</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.totalCortes}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Barbas</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.totalBarbas}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Outros serviços</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.totalOutros}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Valor de referência</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{formatCurrency(stats.totalPriceReference)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Total de comissão</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{formatCurrency(stats.totalCommission)}</p>
        </Card>
      </div>

      {canManageCommission ? (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">Comissão por serviço</h2>
          <CommissionRuleForm
            barberId={barber.id}
            services={services.map((s) => ({ id: s.id, name: s.name }))}
          />
          {barber.commissionRules.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-1 text-sm text-zinc-600">
              {barber.commissionRules.map((rule) => (
                <li key={rule.id}>
                  {rule.service.name}: {Number(rule.percentage)}%
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Nenhuma regra específica — usando a comissão padrão para todos os serviços.
            </p>
          )}
        </Card>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Histórico de atendimentos</h2>
        {attendances.length === 0 ? (
          <EmptyState title="Nenhum atendimento registrado" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Data</Th>
                <Th>Cliente</Th>
                <Th>Serviço</Th>
                <Th>Pagamento</Th>
                <Th>Comissão</Th>
              </Tr>
            </Thead>
            <Tbody>
              {attendances.map((attendance) => (
                <Tr key={attendance.id}>
                  <Td>{format(attendance.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}</Td>
                  <Td>{attendance.customer.name}</Td>
                  <Td>{attendance.service.name}</Td>
                  <Td>{paymentTypeLabels[attendance.paymentType]}</Td>
                  <Td>{formatCurrency(attendance.commissionValue.toString())}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
