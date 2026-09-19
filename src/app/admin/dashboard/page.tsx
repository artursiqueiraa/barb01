import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format/currency";
import { requirePermission } from "@/lib/permissions/guard";
import { dashboardService } from "@/modules/dashboard/service";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </Card>
  );
}

export default async function DashboardPage() {
  await requirePermission("reports", "read");
  const summary = await dashboardService.getSummary();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clientes ativos" value={summary.totalCustomers} />
        <StatCard label="Assinantes ativos" value={summary.activeSubscriptions} />
        <StatCard label="Atendimentos hoje" value={summary.attendancesToday} />
        <StatCard label="Atendimentos no mês" value={summary.attendancesMonth} />
        <StatCard label="Novas assinaturas (mês)" value={summary.newSubscriptionsMonth} />
        <StatCard label="Cancelamentos (mês)" value={summary.cancelledSubscriptionsMonth} />
        <StatCard label="Comissões (mês)" value={formatCurrency(summary.commissionsMonth)} />
        <StatCard label="Receita (mês)" value={formatCurrency(summary.revenueMonth)} />
      </div>
    </div>
  );
}
