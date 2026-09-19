"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { InformarAtrasoDialog } from "./InformarAtrasoDialog";

export function InformarAtrasoButton({
  appointmentId,
  customerName,
  currentEndAt,
}: {
  appointmentId: string;
  customerName: string;
  /** ISO */
  currentEndAt: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        ⏱️ Informar atraso
      </Button>
      {open ? (
        <InformarAtrasoDialog
          appointmentId={appointmentId}
          customerName={customerName}
          currentEndAt={currentEndAt}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
