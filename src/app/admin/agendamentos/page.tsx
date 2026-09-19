import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DeactivateForm } from "@/components/ui/DeactivateForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/Table";
import { appointmentStatusLabels } from "@/lib/format/labels";
import { can } from "@/lib/permissions/matrix";
import { requirePermission } from "@/lib/permissions/guard";
import { AppointmentForm } from "@/modules/appointments/AppointmentForm";
import { acceptAnticipationAction, cancelAppointmentAction, rejectAnticipationAction } from "@/modules/appointments/actions";
import { InformarAtrasoButton } from "@/modules/appointments/InformarAtrasoButton";
import { appointmentsService } from "@/modules/appointments/service";
import { barbersService } from "@/modules/barbers/service";
import { customersService } from "@/modules/customers/service";
import { servicesService } from "@/modules/services/service";

const ACTIVE_STATUSES = new Set(["PENDING", "CONFIRMED"]);

function todayISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; barberId?: string }>;
}) {
  const session = await requirePermission("appointments", "read");
  const isBarber = session.user.role === "BARBEIRO";
  const canCreate = can(session.user.role, "appointments", "create");

  const { date: dateParam, barberId: barberIdParam } = await searchParams;
  const dateISO = dateParam || todayISODate();
  const day = new Date(`${dateISO}T00:00:00`);

  const [customers, barbers, services] = await Promise.all([
    customersService.list(),
    barbersService.list(),
    servicesService.list(),
  ]);

  const targetBarberId = isBarber ? (session.user.barberId ?? undefined) : (barberIdParam || barbers[0]?.id);
  const lockedBarber = isBarber ? barbers.find((b) => b.id === session.user.barberId) : undefined;

  const appointments = targetBarberId ? await appointmentsService.listDayForBarber(targetBarberId, day) : [];

  const now = new Date();
  const hasDelayToday = appointments.some(
    (appointment) =>
      appointment.delayMinutes > 0 ||
      (appointment.originalStartAt !== null && appointment.originalStartAt.getTime() !== appointment.startAt.getTime()),
  );

  // Já vem incluído em `appointments` (mesma consulta do dia) — sem query extra.
  const pendingAnticipations = appointments.filter((appointment) => appointment.anticipationStatus === "PENDING");
  const pendingByRequestedTime = new Map<string, typeof pendingAnticipations>();
  for (const appointment of pendingAnticipations) {
    const key = appointment.anticipationRequestedStartAt?.toISOString() ?? "";
    pendingByRequestedTime.set(key, [...(pendingByRequestedTime.get(key) ?? []), appointment]);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Agendamentos</h1>

      <Card>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <Field label="Data" htmlFor="date">
            <Input id="date" name="date" type="date" defaultValue={dateISO} />
          </Field>
          {!isBarber ? (
            <Field label="Barbeiro" htmlFor="barberId">
              <select
                id="barberId"
                name="barberId"
                defaultValue={targetBarberId ?? ""}
                className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                {barbers.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>

      {canCreate ? (
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-zinc-700">Novo agendamento</h2>
          <AppointmentForm
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
            barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
            services={services.map((s) => ({ id: s.id, name: s.name }))}
            defaultDate={dateISO}
            lockedBarber={lockedBarber ? { id: lockedBarber.id, name: lockedBarber.name } : undefined}
          />
        </Card>
      ) : null}

      {hasDelayToday ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          ⚠️ Agenda com atraso
        </div>
      ) : null}

      {pendingAnticipations.length > 0 ? (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">Solicitações de antecipação</h2>
          <div className="flex flex-col gap-4">
            {Array.from(pendingByRequestedTime.entries()).map(([requestedIso, group]) => (
              <div key={requestedIso} className="rounded-lg border border-zinc-200 p-3">
                {requestedIso ? (
                  <p className="mb-2 text-sm font-medium text-zinc-700">
                    Horário disponível: {format(new Date(requestedIso), "HH:mm", { locale: ptBR })}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2">
                  {group.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between rounded-lg bg-zinc-50 p-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{appointment.customer.name}</p>
                        <p className="text-sm text-zinc-500">
                          {format(appointment.startAt, "HH:mm", { locale: ptBR })}
                          {" → "}
                          {appointment.anticipationRequestedStartAt
                            ? format(appointment.anticipationRequestedStartAt, "HH:mm", { locale: ptBR })
                            : "?"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await acceptAnticipationAction(appointment.id);
                          }}
                        >
                          <Button type="submit" size="sm">
                            Aceitar
                          </Button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await rejectAnticipationAction(appointment.id);
                          }}
                        >
                          <Button type="submit" variant="secondary" size="sm">
                            Recusar
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {!targetBarberId ? (
        <EmptyState title="Nenhum barbeiro cadastrado" description="Cadastre um barbeiro para começar a montar a agenda." />
      ) : appointments.length === 0 ? (
        <EmptyState title="Nenhum agendamento nesta data" />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Horário</Th>
              <Th>Cliente</Th>
              <Th>Serviço</Th>
              <Th>Status</Th>
              <Th>Ações</Th>
            </Tr>
          </Thead>
          <Tbody>
            {appointments.map((appointment) => {
              const isSource = appointment.delayMinutes > 0;
              const wasRescheduled =
                !isSource &&
                appointment.originalStartAt !== null &&
                appointment.originalStartAt.getTime() !== appointment.startAt.getTime();
              const canInformDelay =
                ACTIVE_STATUSES.has(appointment.status) && appointment.startAt.getTime() <= now.getTime();
              const canCancel = ACTIVE_STATUSES.has(appointment.status);

              return (
                <Tr key={appointment.id}>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <span>
                        {format(appointment.startAt, "HH:mm", { locale: ptBR })}–
                        {format(appointment.endAt, "HH:mm", { locale: ptBR })}
                      </span>
                      {isSource ? <Badge tone="warning">+{appointment.delayMinutes} min</Badge> : null}
                      {wasRescheduled ? <Badge tone="warning">⚠️ reajustado</Badge> : null}
                    </div>
                  </Td>
                  <Td>{appointment.customer.name}</Td>
                  <Td>{appointment.service.name}</Td>
                  <Td>{appointmentStatusLabels[appointment.status]}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      {canInformDelay ? (
                        <InformarAtrasoButton
                          appointmentId={appointment.id}
                          customerName={appointment.customer.name}
                          currentEndAt={appointment.endAt.toISOString()}
                        />
                      ) : null}
                      {canCancel ? (
                        <DeactivateForm action={cancelAppointmentAction.bind(null, appointment.id)} label="Cancelar" />
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
