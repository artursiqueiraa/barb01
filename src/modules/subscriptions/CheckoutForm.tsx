"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format/currency";

import { createCheckoutAction, type SubscriptionActionState } from "./actions";

const initialState: SubscriptionActionState = { success: false };

export function CheckoutForm({
  plans,
}: {
  plans: { id: string; name: string; price: string; billingPeriod: string }[];
}) {
  const [state, formAction, pending] = useActionState(createCheckoutAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <label
            key={plan.id}
            className="flex cursor-pointer flex-col gap-1 rounded-lg border border-zinc-200 p-4 has-[:checked]:border-zinc-900 has-[:checked]:ring-1 has-[:checked]:ring-zinc-900"
          >
            <input type="radio" name="planId" value={plan.id} required className="sr-only" />
            <span className="font-medium text-zinc-900">{plan.name}</span>
            <span className="text-lg font-semibold text-zinc-900">
              {formatCurrency(plan.price)}
              <span className="text-sm font-normal text-zinc-500">
                /{plan.billingPeriod === "YEARLY" ? "ano" : "mês"}
              </span>
            </span>
          </label>
        ))}
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">
          Assinatura criada! Aguarde as instruções de pagamento e a confirmação da recepção.
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Processando..." : "Assinar plano selecionado"}
      </Button>
    </form>
  );
}
