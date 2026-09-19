import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { paymentTypeLabels } from "@/lib/format/labels";
import { requirePermission } from "@/lib/permissions/guard";
import { AttendanceForm } from "@/modules/attendances/AttendanceForm";
import { attendancesService } from "@/modules/attendances/service";
import { barbersService } from "@/modules/barbers/service";
import { customersService } from "@/modules/customers/service";
import { servicesService } from "@/modules/services/service";

export default async function AttendancesPage() {
  const session = await requirePermission("attendances", "read");
  const isBarber = session.user.role === "BARBEIRO";

  const [customers, barbers, services] = await Promise.all([
    customersService.list(),
    barbersService.list(),
    servicesService.list(),
  ]);

  const lockedBarber = isBarber ? barbers.find((b) => b.id === session.user.barberId) : undefined;

  const attendances = await attendancesService.list(
    isBarber ? { barberId: session.user.barberId ?? undefined } : {},
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Atendimentos</h1>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">Registrar atendimento</h2>
        <AttendanceForm
          // Componentes client só podem receber props serializáveis — nunca
          // passar o objeto Prisma inteiro (tem campos Decimal/Date).
          customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
          services={services.map((s) => ({ id: s.id, name: s.name }))}
          lockedBarber={lockedBarber ? { id: lockedBarber.id, name: lockedBarber.name } : undefined}
        />
      </Card>

      {attendances.length === 0 ? (
        <EmptyState title="Nenhum atendimento registrado" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Data</Th>
              <Th>Cliente</Th>
              <Th>Barbeiro</Th>
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
                <Td>{attendance.barber.name}</Td>
                <Td>{attendance.service.name}</Td>
                <Td>{paymentTypeLabels[attendance.paymentType]}</Td>
                <Td>{formatCurrency(attendance.commissionValue.toString())}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
