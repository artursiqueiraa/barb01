import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requirePermission } from "@/lib/permissions/guard";
import { settingsService } from "@/modules/settings/service";

export default async function SettingsPage() {
  await requirePermission("settings", "read");
  const settings = await settingsService.get();

  if (!settings) {
    return <EmptyState title="Configurações ainda não inicializadas" description="Rode `npm run db:seed`." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Configurações da barbearia</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edição pela interface entra numa próxima etapa — por ora, estes dados vêm da seed e podem ser
          ajustados diretamente no banco (`business_settings`).
        </p>
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase text-zinc-400">Nome</p>
          <p className="text-sm text-zinc-900">{settings.name}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-400">Telefone</p>
          <p className="text-sm text-zinc-900">{settings.phone ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-400">WhatsApp</p>
          <p className="text-sm text-zinc-900">{settings.whatsapp ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-400">Instagram</p>
          <p className="text-sm text-zinc-900">{settings.instagram ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-400">Endereço</p>
          <p className="text-sm text-zinc-900">{settings.address ?? "-"}</p>
        </div>
      </Card>
    </div>
  );
}
