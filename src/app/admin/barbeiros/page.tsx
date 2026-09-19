import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DeactivateForm } from "@/components/ui/DeactivateForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { requirePermission } from "@/lib/permissions/guard";
import { BarberCreateForm } from "@/modules/barbers/BarberCreateForm";
import { deactivateBarberAction } from "@/modules/barbers/actions";
import { barbersService } from "@/modules/barbers/service";

export default async function BarbersPage() {
  const session = await requirePermission("barbers", "read");
  const canCreate = session.user.role === "ADMIN" || session.user.role === "GERENTE";
  const barbers = await barbersService.list();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Barbeiros</h1>

      {canCreate ? (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">Novo barbeiro</h2>
          <BarberCreateForm />
        </Card>
      ) : null}

      {barbers.length === 0 ? (
        <EmptyState title="Nenhum barbeiro cadastrado" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Nome</Th>
              <Th>Comissão padrão</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {barbers.map((barber) => (
              <Tr key={barber.id}>
                <Td>
                  <Link href={`/admin/barbeiros/${barber.id}`} className="font-medium text-zinc-900 hover:underline">
                    {barber.name}
                  </Link>
                </Td>
                <Td>{Number(barber.defaultCommissionPercentage)}%</Td>
                <Td>
                  <Badge tone={barber.active ? "success" : "neutral"}>
                    {barber.active ? "Ativo" : "Inativo"}
                  </Badge>
                </Td>
                <Td>
                  {canCreate && barber.active ? (
                    <DeactivateForm action={deactivateBarberAction.bind(null, barber.id)} />
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
