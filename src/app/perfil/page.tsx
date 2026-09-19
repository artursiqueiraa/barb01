import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { auth, signOut } from "@/lib/auth";
import { formatCurrency } from "@/lib/format/currency";
import { paymentTypeLabels, subscriptionStatusLabels } from "@/lib/format/labels";
import { CancelAppointmentButton } from "@/modules/appointments/CancelAppointmentButton";
import { RequestAnticipationButton } from "@/modules/appointments/RequestAnticipationButton";
import { appointmentsService } from "@/modules/appointments/service";
import { customersService } from "@/modules/customers/service";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.customerId) redirect("/login");

  const [{ customer, attendances, subscription }, upcomingAppointments] = await Promise.all([
    customersService.getProfile(session.user.customerId),
    appointmentsService.upcomingForCustomer(session.user.customerId),
  ]);

  // Oportunidade de antecipação só faz sentido quando não há nada
  // pendente/já aceito para este agendamento — recalculada a cada carga da
  // página (nunca persistida como "disponível"; é sempre o estado atual).
  const opportunities = await Promise.all(
    upcomingAppointments.map((appointment) =>
      appointment.anticipationStatus === "PENDING" || appointment.anticipationStatus === "ACCEPTED"
        ? Promise.resolve(null)
        : appointmentsService.findAnticipationOpportunityFor(appointment),
    ),
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Olá, {customer.name}</h1>
          <p className="text-sm text-zinc-500">{customer.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
            Site
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900">
              Sair
            </button>
          </form>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">Assinatura</p>
          <Link href="/perfil/assinatura" className="text-sm font-medium text-zinc-900 hover:underline">
            {subscription ? "Ver detalhes" : "Assinar um plano"}
          </Link>
        </div>
        {subscription ? (
          <div className="mt-2 flex items-center gap-3">
            <p className="font-medium text-zinc-900">{subscription.plan.name}</p>
            <Badge tone={subscription.status === "ACTIVE" ? "success" : "neutral"}>
              {subscriptionStatusLabels[subscription.status]}
            </Badge>
            <span className="text-sm text-zinc-500">{formatCurrency(subscription.price.toString())}/mês</span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">Você ainda não possui uma assinatura.</p>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Meus próximos agendamentos</h2>
        {upcomingAppointments.length === 0 ? (
          <EmptyState title="Nenhum agendamento futuro" />
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingAppointments.map((appointment, index) => {
              const wasRescheduled =
                appointment.originalStartAt !== null &&
                appointment.originalStartAt.getTime() !== appointment.startAt.getTime();
              const adjustedMinutes = wasRescheduled
                ? Math.round((appointment.startAt.getTime() - appointment.originalStartAt!.getTime()) / 60_000)
                : 0;
              const wasAnticipated = appointment.anticipationStatus === "ACCEPTED";
              const opportunity = opportunities[index];

              return (
                <Card key={appointment.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-zinc-900">{appointment.service.name}</p>
                      <p className="text-sm text-zinc-500">Barbeiro: {appointment.barber.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-zinc-900">
                        {format(appointment.startAt, "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {wasRescheduled ? (
                        <Badge tone="warning" className="mt-1">
                          {wasAnticipated ? "✅ Horário antecipado" : "⚠️ Horário alterado"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {wasRescheduled && wasAnticipated ? (
                    <p className="mt-2 text-sm text-emerald-700">✅ Seu horário foi antecipado.</p>
                  ) : wasRescheduled ? (
                    <p className="mt-2 text-sm text-amber-700">
                      Seu atendimento foi reajustado em {adjustedMinutes} minutos.
                    </p>
                  ) : null}

                  {appointment.anticipationStatus === "PENDING" ? (
                    <p className="mt-2 text-sm text-zinc-600">
                      🕐 Solicitação de antecipação enviada. Aguardando o barbeiro.
                    </p>
                  ) : appointment.anticipationStatus === "REJECTED" ? (
                    <p className="mt-2 text-sm text-zinc-600">
                      Sua solicitação de antecipação não foi aprovada. Seu horário permanece às{" "}
                      {format(appointment.startAt, "HH:mm", { locale: ptBR })}.
                    </p>
                  ) : opportunity ? (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-sm font-medium text-emerald-800">
                        🕐 Horário disponível às {format(opportunity.startAt, "HH:mm", { locale: ptBR })}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Seu barbeiro tem um horário mais cedo livre. Você pode solicitar a antecipação — a decisão é
                        sempre do barbeiro.
                      </p>
                      <div className="mt-2">
                        <RequestAnticipationButton appointmentId={appointment.id} />
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 border-t border-zinc-100 pt-3">
                    <CancelAppointmentButton
                      appointmentId={appointment.id}
                      startAt={appointment.startAt.toISOString()}
                      barberName={appointment.barber.name}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Meu histórico</h2>
        {attendances.length === 0 ? (
          <EmptyState title="Nenhum atendimento ainda" />
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
