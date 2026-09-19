"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import { registerCustomerAction, type RegisterActionState } from "./actions";

const initialState: RegisterActionState = { success: false };

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerCustomerAction, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm text-emerald-600">Conta criada com sucesso!</p>
        <Link href="/login" className="text-sm font-medium text-zinc-900 hover:underline">
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Nome" htmlFor="name">
        <Input id="name" name="name" required autoComplete="name" />
      </Field>
      <Field label="CPF" htmlFor="cpf">
        <Input id="cpf" name="cpf" required placeholder="000.000.000-00" />
      </Field>
      <Field label="Telefone" htmlFor="phone">
        <Input id="phone" name="phone" required placeholder="(00) 00000-0000" />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres">
        <Input id="password" name="password" type="password" required autoComplete="new-password" />
      </Field>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
