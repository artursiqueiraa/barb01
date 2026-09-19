"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";

import { cancelAppointmentAction } from "./actions";

export function CancelAppointmentDialog({
  appointmentId,
  startAt,
  barberName,
  onClose,
}: {
  appointmentId: string;
  /** ISO */
  startAt: string;
  barberName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const date = new Date(startAt);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await cancelAppointmentAction(appointmentId);
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível cancelar o agendamento");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-zinc-900">Tem certeza que deseja cancelar este agendamento?</h2>

        <div className="mt-4 flex flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          <p>Data: {format(date, "dd/MM/yyyy", { locale: ptBR })}</p>
          <p>Horário: {format(date, "HH:mm", { locale: ptBR })}</p>
          <p>Barbeiro: {barberName}</p>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Voltar
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={pending}>
            {pending ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}
