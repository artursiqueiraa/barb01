"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";
import type { Resource, Role } from "@/lib/permissions/matrix";
import { can } from "@/lib/permissions/matrix";

interface NavItem {
  href: string;
  label: string;
  resource: Resource;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", resource: "reports" },
  { href: "/admin/clientes", label: "Clientes", resource: "customers" },
  { href: "/admin/barbeiros", label: "Barbeiros", resource: "barbers" },
  { href: "/admin/servicos", label: "Serviços", resource: "services" },
  { href: "/admin/planos", label: "Planos", resource: "plans" },
  { href: "/admin/assinaturas", label: "Assinaturas", resource: "subscriptions" },
  { href: "/admin/atendimentos", label: "Atendimentos", resource: "attendances" },
  { href: "/admin/agendamentos", label: "Agendamentos", resource: "appointments" },
  { href: "/admin/relatorios", label: "Relatórios", resource: "reports" },
  { href: "/admin/financeiro", label: "Financeiro", resource: "financial" },
  { href: "/admin/configuracoes", label: "Configurações", resource: "settings" },
];

export function AdminSidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const items = NAV_ITEMS.filter((item) => can(role, item.resource, "read"));

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col gap-1 border-r border-zinc-200 bg-white p-4">
      <div className="mb-4 px-2 text-lg font-semibold text-zinc-900">Barbearia</div>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
