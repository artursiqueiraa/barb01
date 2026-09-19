"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { confirmPaymentAction, type SubscriptionActionState } from "./actions";

const initialState: SubscriptionActionState = { success: false };

const selectClass =
  "h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900";

export function ConfirmPaymentForm({ subscriptionId, defaultAmount }: { subscriptionId: string; defaultAmount: string }) {
  const [state, formAction, pending] = useActionState(confirmPaymentAction, initialState);

  if (state.success) {
    return <span className="text-sm text-emerald-600">Pagamento confirmado.</span>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <Input
        name="amount"
        type="number"
        step="0.01"
        min={0}
        defaultValue={defaultAmount}
        required
        className="h-9 w-24"
      />
      <select name="paymentType" defaultValue="PIX" className={selectClass}>
        <option value="PIX">Pix</option>
        <option value="CASH">Dinheiro</option>
        <option value="CARD">Cartão</option>
        <option value="OTHER">Outro</option>
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Confirmando..." : "Confirmar pagamento"}
      </Button>
      {state.error ? <span className="w-full text-xs text-red-600">{state.error}</span> : null}
    </form>
  );
}
