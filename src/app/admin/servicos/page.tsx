import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DeactivateForm } from "@/components/ui/DeactivateForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format/currency";
import { requirePermission } from "@/lib/permissions/guard";
import { deactivateServiceAction } from "@/modules/services/actions";
import { ServiceCreateForm } from "@/modules/services/ServiceCreateForm";
import { servicesService } from "@/modules/services/service";

export default async function ServicesPage() {
  const session = await requirePermission("services", "read");
  const canManage = session.user.role === "ADMIN" || session.user.role === "GERENTE";
  const services = await servicesService.list();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Serviços</h1>

      {canManage ? (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">Novo serviço</h2>
          <ServiceCreateForm />
        </Card>
      ) : null}

      {services.length === 0 ? (
        <EmptyState title="Nenhum serviço cadastrado" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Nome</Th>
              <Th>Preço</Th>
              <Th>Duração</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {services.map((service) => (
              <Tr key={service.id}>
                <Td className="font-medium text-zinc-900">{service.name}</Td>
                <Td>{formatCurrency(service.price.toString())}</Td>
                <Td>{service.durationMinutes} min</Td>
                <Td>
                  <Badge tone={service.active ? "success" : "neutral"}>
                    {service.active ? "Ativo" : "Inativo"}
                  </Badge>
                </Td>
                <Td>
                  {canManage && service.active ? (
                    <DeactivateForm action={deactivateServiceAction.bind(null, service.id)} />
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
