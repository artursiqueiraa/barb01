"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import {
  applyDelayAction,
  simulateDelayAction,
  type DelayAppliedDTO,
  type DelaySimulationDTO,
  type ReportDelayPayload,
} from "./actions";

const PRESET_MINUTES = [5, 10, 15, 20, 30];

function fmtTime(iso: string) {
  return format(new Date(iso), "HH:mm", { locale: ptBR });
}

export function InformarAtrasoDialog({
  appointmentId,
  customerName,
  currentEndAt,
  onClose,
}: {
  appointmentId: string;
  customerName: string;
  /** ISO — usado como base de data para o campo "novo término previsto". */
  currentEndAt: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"pick" | "preview" | "done">("pick");
  const [customMinutes, setCustomMinutes] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [simulation, setSimulation] = useState<DelaySimulationDTO | null>(null);
  const [applied, setApplied] = useState<DelayAppliedDTO | null>(null);
  const [lastPayload, setLastPayload] = useState<ReportDelayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSimulation(payload: ReportDelayPayload) {
    setError(null);
    startTransition(async () => {
      const result = await simulateDelayAction(appointmentId, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLastPayload(payload);
      setSimulation(result.data);
      setStep("preview");
    });
  }

  function handlePreset(minutes: number) {
    runSimulation({ mode: "preset", minutes });
  }

  function handleCustomSubmit(event: FormEvent) {
    event.preventDefault();

    if (customTime) {
      const base = new Date(currentEndAt);
      const [hours, minutes] = customTime.split(":").map(Number);
      base.setHours(hours, minutes, 0, 0);
      runSimulation({ mode: "custom", newEndAt: base.toISOString() });
      return;
    }

    const minutes = Number(customMinutes);
    if (!minutes || minutes <= 0) {
      setError("Informe um valor de minutos ou um novo horário de término");
      return;
    }
    runSimulation({ mode: "preset", minutes });
  }

  function handleConfirm() {
    if (!lastPayload) return;
    setError(null);
    startTransition(async () => {
      const result = await applyDelayAction(appointmentId, lastPayload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setApplied(result.data);
      setStep("done");
    });
  }

  function handleClose() {
    if (applied) router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
        {step === "pick" ? (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">⏱️ Informar atraso</h2>
              <p className="mt-1 text-sm text-zinc-500">Cliente: {customerName}</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Quanto tempo a mais?</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_MINUTES.map((minutes) => (
                  <Button key={minutes} type="button" variant="secondary" size="sm" disabled={pending} onClick={() => handlePreset(minutes)}>
                    +{minutes} min
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
              <Field label="Outro (minutos)" htmlFor="customMinutes">
                <Input
                  id="customMinutes"
                  type="number"
                  min={1}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="Ex.: 25"
                />
              </Field>
              <Field label="Ou novo término previsto" htmlFor="customTime">
                <Input id="customTime" type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
              </Field>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Calculando..." : "Continuar"}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {step === "preview" && simulation ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-zinc-900">Ajuste de agenda</h2>

            <div className="rounded-lg border border-zinc-200 p-3">
              <p className="text-sm font-medium text-zinc-900">{simulation.source.customerName}</p>
              <p className="text-sm text-zinc-500">
                {fmtTime(simulation.source.oldStartAt)}–{fmtTime(simulation.source.oldEndAt)}{" "}
                <span className="mx-1">→</span>{" "}
                <span className="font-medium text-amber-700">
                  {fmtTime(simulation.source.newStartAt)}–{fmtTime(simulation.source.newEndAt)}
                </span>
              </p>
              <Badge tone="warning" className="mt-1">
                +{simulation.additionalMinutes} min
              </Badge>
            </div>

            {simulation.affected.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-zinc-700">Clientes afetados</p>
                {simulation.affected.map((change) => (
                  <div key={change.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                    <p className="text-sm font-medium text-zinc-900">{change.customerName}</p>
                    <p className="text-sm text-zinc-500">
                      {fmtTime(change.oldStartAt)}–{fmtTime(change.oldEndAt)} <span className="mx-1">→</span>{" "}
                      <span className="font-medium text-amber-700">
                        {fmtTime(change.newStartAt)}–{fmtTime(change.newEndAt)}
                      </span>
                    </p>
                  </div>
                ))}
                <p className="text-sm font-semibold text-zinc-900">
                  {simulation.affected.length}{" "}
                  {simulation.affected.length === 1 ? "cliente será avisado" : "clientes serão avisados"}.
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Nenhum outro cliente será afetado — havia folga suficiente na agenda.</p>
            )}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={pending}>
                {pending ? "Aplicando..." : "Confirmar ajuste"}
              </Button>
            </div>
          </div>
        ) : null}

        {step === "done" && applied ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-zinc-900">Agenda reajustada</h2>
            <p className="text-sm text-zinc-600">
              Atraso de +{applied.additionalMinutes} min registrado. {applied.affectedCount}{" "}
              {applied.affectedCount === 1 ? "cliente foi avisado" : "clientes foram avisados"}.
            </p>

            {applied.notifications.length > 0 ? (
              <div className="flex flex-col gap-2">
                {applied.notifications.map((notification, index) => (
                  <a
                    key={index}
                    href={notification.whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-zinc-200 p-3 text-sm hover:bg-zinc-50"
                  >
                    <span className="font-medium text-zinc-900">{notification.customerName}</span>
                    <span className="ml-2 text-emerald-700">Abrir WhatsApp →</span>
                  </a>
                ))}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="button" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
