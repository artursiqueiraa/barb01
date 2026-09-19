"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { createCustomerAction, type CustomerActionState } from "./actions";

const initialState: CustomerActionState = { success: false };

export function CustomerCreateForm() {
  const [state, formAction, pending] = useActionState(createCustomerAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" required />
      </Field>
      <Field label="CPF" htmlFor="cpf">
        <Input id="cpf" name="cpf" required placeholder="000.000.000-00" />
      </Field>
      <Field label="Telefone" htmlFor="phone">
        <Input id="phone" name="phone" required placeholder="(00) 00000-0000" />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" />
      </Field>
      <Field label="Data de nascimento" htmlFor="birthDate">
        <Input id="birthDate" name="birthDate" type="date" />
      </Field>
      <Field label="Observações" htmlFor="notes">
        <Input id="notes" name="notes" />
      </Field>

      {state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-600 sm:col-span-2">Cliente cadastrado com sucesso.</p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Cadastrar cliente"}
        </Button>
      </div>
    </form>
  );
}
