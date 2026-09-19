"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { createServiceAction, type ServiceActionState } from "./actions";

const initialState: ServiceActionState = { success: false };

export function ServiceCreateForm() {
  const [state, formAction, pending] = useActionState(createServiceAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" required />
      </Field>
      <Field label="Preço (R$)" htmlFor="price">
        <Input id="price" name="price" type="number" step="0.01" min={0} required />
      </Field>
      <Field label="Duração (minutos)" htmlFor="durationMinutes">
        <Input id="durationMinutes" name="durationMinutes" type="number" min={1} required />
      </Field>
      <Field label="Descrição" htmlFor="description">
        <Input id="description" name="description" />
      </Field>

      {state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-600 sm:col-span-2">Serviço cadastrado com sucesso.</p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Cadastrar serviço"}
        </Button>
      </div>
    </form>
  );
}
