import { EmptyState } from "@/components/ui/EmptyState";
import { requirePermission } from "@/lib/permissions/guard";

export default async function AppointmentsPage() {
  await requirePermission("appointments", "read");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Agendamentos</h1>
      <EmptyState
        title="Agendamento online — Etapa 6"
        description="O modelo de dados (Appointment) já existe no banco; a tela de agenda e as regras de conflito de horário entram na Etapa 6 do roadmap (docs/IMPLEMENTATION-PLAN.md)."
      />
    </div>
  );
}
