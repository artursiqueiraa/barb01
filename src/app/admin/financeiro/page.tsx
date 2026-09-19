import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/format/currency";
import { requirePermission } from "@/lib/permissions/guard";
import { reportsService } from "@/modules/reports/service";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function FinancialPage() {
  await requirePermission("financial", "read");
  const summary = await reportsService.financialSummary({ from: startOfMonth() });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900">Financeiro</h1>
      <p className="text-sm text-zinc-500">Resumo do mês corrente, calculado a partir dos atendimentos registrados.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Receita (valor de referência)</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatCurrency(summary.revenue)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Comissões a pagar</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatCurrency(summary.commissions)}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Saldo operacional</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatCurrency(summary.balance)}</p>
        </Card>
      </div>

      <p className="text-xs text-zinc-400">
        Este saldo é operacional (receita de serviços menos comissões) e não substitui o controle de
        pagamentos reais — ver `docs/IMPLEMENTATION-PLAN.md`, Etapa 5, para a conciliação com o gateway
        de pagamento.
      </p>
    </div>
  );
}
