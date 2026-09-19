"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { createBarberAction, type BarberActionState } from "./actions";

const initialState: BarberActionState = { success: false };

export function BarberCreateForm() {
  const [state, formAction, pending] = useActionState(createBarberAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" required />
      </Field>
      <Field label="Telefone" htmlFor="phone">
        <Input id="phone" name="phone" placeholder="(00) 00000-0000" />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" />
      </Field>
      <Field label="Foto (URL)" htmlFor="photo">
        <Input id="photo" name="photo" type="url" />
      </Field>
      <Field label="Comissão padrão (%)" htmlFor="defaultCommissionPercentage" hint="Usada quando não há regra específica por serviço">
        <Input
          id="defaultCommissionPercentage"
          name="defaultCommissionPercentage"
          type="number"
          step="0.01"
          min={0}
          max={100}
          required
          defaultValue={50}
        />
      </Field>

      {state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-600 sm:col-span-2">Barbeiro cadastrado com sucesso.</p>
      ) : null}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Cadastrar barbeiro"}
        </Button>
      </div>
    </form>
  );
}
