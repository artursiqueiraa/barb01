import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { requirePermission } from "@/lib/permissions/guard";
import { reportsService } from "@/modules/reports/service";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermission("reports", "read");
  const { from, to } = await searchParams;

  const filters = {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(`${to}T23:59:59`) : undefined,
  };

  const [production, byService, financial, delays] = await Promise.all([
    reportsService.production(filters),
    reportsService.byService(filters),
    reportsService.financialSummary(filters),
    reportsService.delays(filters),
  ]);

  const withAttendances = production.filter((p) => p.totalAttendances > 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Relatórios</h1>

      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <Field label="De" htmlFor="from">
            <Input id="from" name="from" type="date" defaultValue={from} />
          </Field>
          <Field label="Até" htmlFor="to">
            <Input id="to" name="to" type="date" defaultValue={to} />
          </Field>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Receita (valor de referência)</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{formatCurrency(financial.revenue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Comissões</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{formatCurrency(financial.commissions)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Saldo operacional</p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">{formatCurrency(financial.balance)}</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Produção e comissão por barbeiro</h2>
        {withAttendances.length === 0 ? (
          <EmptyState title="Nenhum atendimento no período selecionado" />
        ) : (
          <div className="flex flex-col gap-4">
            {withAttendances.map((barber) => (
              <Card key={barber.barberId}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-medium text-zinc-900">{barber.barberName}</h3>
                  <span className="text-sm text-zinc-500">{barber.totalAttendances} atendimentos</span>
                </div>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Serviço</Th>
                      <Th>Qtd</Th>
                      <Th>Comissão</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {barber.byService.map((service) => (
                      <Tr key={service.serviceName}>
                        <Td>{service.serviceName}</Td>
                        <Td>{service.count}</Td>
                        <Td>{formatCurrency(service.commission)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <p className="mt-3 text-right text-sm font-semibold text-zinc-900">
                  Total: {formatCurrency(barber.totalCommission)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Atendimentos por serviço</h2>
        {byService.length === 0 ? (
          <EmptyState title="Sem dados no período selecionado" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Serviço</Th>
                <Th>Quantidade</Th>
              </Tr>
            </Thead>
            <Tbody>
              {byService.map((service) => (
                <Tr key={service.serviceName}>
                  <Td>{service.serviceName}</Td>
                  <Td>{service.count}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Atrasos</h2>
        {delays.length === 0 ? (
          <EmptyState title="Nenhum atraso registrado no período selecionado" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Barbeiro</Th>
                <Th>Atrasos</Th>
                <Th>Total (min)</Th>
                <Th>Média (min)</Th>
                <Th>Clientes afetados</Th>
              </Tr>
            </Thead>
            <Tbody>
              {delays.map((delay) => (
                <Tr key={delay.barberId}>
                  <Td>{delay.barberName}</Td>
                  <Td>{delay.count}</Td>
                  <Td>{delay.totalMinutes}</Td>
                  <Td>{delay.averageMinutes}</Td>
                  <Td>{delay.affectedCustomers}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
