"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { setCommissionRuleAction, type CommissionRuleActionState } from "./actions";

const initialState: CommissionRuleActionState = { success: false };

export function CommissionRuleForm({
  barberId,
  services,
}: {
  barberId: string;
  services: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(setCommissionRuleAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="barberId" value={barberId} />

      <Field label="Serviço" htmlFor="serviceId">
        <select
          id="serviceId"
          name="serviceId"
          required
          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Comissão (%)" htmlFor="percentage">
        <Input id="percentage" name="percentage" type="number" step="0.01" min={0} max={100} required className="w-28" />
      </Field>

      <Button type="submit" disabled={pending} size="md">
        {pending ? "Salvando..." : "Definir comissão"}
      </Button>

      {state.error ? <p className="w-full text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
