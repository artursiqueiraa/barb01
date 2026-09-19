"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { createAppointmentAction, type AppointmentActionState } from "./actions";

const initialState: AppointmentActionState = { success: false };

const selectClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900";

export function AppointmentForm({
  customers,
  barbers,
  services,
  defaultDate,
  lockedBarber,
}: {
  customers: { id: string; name: string }[];
  barbers: { id: string; name: string }[];
  services: { id: string; name: string }[];
  /** yyyy-MM-dd — usado só para pré-preencher o campo de data/horário. */
  defaultDate: string;
  lockedBarber?: { id: string; name: string };
}) {
  const [state, formAction, pending] = useActionState(createAppointmentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Cliente" htmlFor="customerId">
        <select id="customerId" name="customerId" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            Selecione...
          </option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Serviço" htmlFor="serviceId">
        <select id="serviceId" name="serviceId" required defaultValue="" className={selectClass}>
          <option value="" disabled>
            Selecione...
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Barbeiro" htmlFor="barberId">
        {lockedBarber ? (
          <>
            <input type="hidden" name="barberId" value={lockedBarber.id} />
            <p className="flex h-11 items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700">
              {lockedBarber.name}
            </p>
          </>
        ) : (
          <select id="barberId" name="barberId" required defaultValue="" className={selectClass}>
            <option value="" disabled>
              Selecione...
            </option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Data e horário" htmlFor="startAt">
        <Input id="startAt" name="startAt" type="datetime-local" required defaultValue={`${defaultDate}T09:00`} />
      </Field>

      {state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600 sm:col-span-2">Agendamento criado com sucesso.</p> : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar agendamento"}
        </Button>
      </div>
    </form>
  );
}
