import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DeactivateForm } from "@/components/ui/DeactivateForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { formatCpf, formatPhone } from "@/lib/format/currency";
import { requirePermission } from "@/lib/permissions/guard";
import { CustomerCreateForm } from "@/modules/customers/CustomerCreateForm";
import { deactivateCustomerAction } from "@/modules/customers/actions";
import { customersService } from "@/modules/customers/service";

export default async function CustomersPage() {
  const session = await requirePermission("customers", "read");
  const canDelete = session.user.role === "ADMIN" || session.user.role === "GERENTE";
  const customers = await customersService.list();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Clientes</h1>

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-zinc-700">Novo cliente</h2>
        <CustomerCreateForm />
      </Card>

      {customers.length === 0 ? (
        <EmptyState title="Nenhum cliente cadastrado" description="Cadastre o primeiro cliente acima." />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Nome</Th>
              <Th>CPF</Th>
              <Th>Telefone</Th>
              <Th>Status</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {customers.map((customer) => (
              <Tr key={customer.id}>
                <Td>
                  <Link href={`/admin/clientes/${customer.id}`} className="font-medium text-zinc-900 hover:underline">
                    {customer.name}
                  </Link>
                </Td>
                <Td>{formatCpf(customer.cpf)}</Td>
                <Td>{formatPhone(customer.phone)}</Td>
                <Td>
                  <Badge tone={customer.active ? "success" : "neutral"}>
                    {customer.active ? "Ativo" : "Inativo"}
                  </Badge>
                </Td>
                <Td>
                  {canDelete && customer.active ? (
                    <DeactivateForm action={deactivateCustomerAction.bind(null, customer.id)} />
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
