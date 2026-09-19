"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";

import { requestAnticipationAction } from "./actions";

export function RequestAnticipationButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await requestAnticipationAction(appointmentId);
      if (!result.success) {
        setError(result.error ?? "Não foi possível enviar a solicitação");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <Button type="button" size="sm" onClick={handleClick} disabled={pending}>
        {pending ? "Enviando..." : "Solicitar antecipação"}
      </Button>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
