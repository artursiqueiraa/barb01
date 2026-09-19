"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { CancelAppointmentDialog } from "./CancelAppointmentDialog";

export function CancelAppointmentButton({
  appointmentId,
  startAt,
  barberName,
}: {
  appointmentId: string;
  /** ISO */
  startAt: string;
  barberName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setOpen(true)}>
        Cancelar agendamento
      </Button>
      {open ? (
        <CancelAppointmentDialog appointmentId={appointmentId} startAt={startAt} barberName={barberName} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
