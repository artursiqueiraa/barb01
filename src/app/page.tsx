import Link from "next/link";

import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/format/currency";
import { buildWhatsAppLink } from "@/lib/whatsapp/service";
import { plansService } from "@/modules/plans/service";
import { servicesService } from "@/modules/services/service";
import { settingsService } from "@/modules/settings/service";

// Nota: esta página não pode ficar puramente estática, pois o CTA de
// assinatura depende de sessão — ver `session` abaixo.

export default async function HomePage() {
  const [session, settings, plans, services] = await Promise.all([
    auth(),
    settingsService.get(),
    plansService.list(),
    servicesService.list(),
  ]);

  const businessName = settings?.name ?? "Barbearia";
  const whatsappLink = settings?.whatsapp
    ? buildWhatsAppLink(settings.whatsapp, `Olá! Gostaria de agendar um horário na ${businessName}.`)
    : undefined;

  const isCustomer = Boolean(session?.user?.customerId);
  const subscribeHref = isCustomer ? "/perfil/assinatura" : "/cadastro";
  const accountHref = session?.user ? (isCustomer ? "/perfil" : "/admin/dashboard") : "/cadastro";
  const accountLabel = session?.user ? (isCustomer ? "Minha conta" : "Painel") : "Criar conta";

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-semibold">{businessName}</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="#servicos" className="hidden text-zinc-600 hover:text-zinc-900 sm:inline">
              Serviços
            </Link>
            <Link href="#planos" className="hidden text-zinc-600 hover:text-zinc-900 sm:inline">
              Planos
            </Link>
            {!session?.user ? (
              <Link href="/login" className="text-zinc-600 hover:text-zinc-900">
                Entrar
              </Link>
            ) : null}
            <Link
              href={accountHref}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              {accountLabel}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Estilo, precisão e assinatura ilimitada na {businessName}.
          </h1>
          <p className="max-w-xl text-lg text-zinc-600">
            Assine um plano e tenha cortes ilimitados, ou agende seu horário avulso em poucos cliques.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="#planos" className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700">
              Assinar plano
            </Link>
            <Link
              href="/cadastro"
              className="rounded-lg border border-zinc-300 px-6 py-3 font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Agendar horário
            </Link>
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-emerald-600 px-6 py-3 font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Falar no WhatsApp
              </a>
            ) : null}
          </div>
        </section>

        <section id="servicos" className="border-t border-zinc-100 bg-zinc-50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-8 text-2xl font-semibold">Nossos serviços</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <div key={service.id} className="rounded-xl border border-zinc-200 bg-white p-5">
                  <h3 className="font-medium text-zinc-900">{service.name}</h3>
                  <p className="mt-2 text-sm text-zinc-500">{service.durationMinutes} min</p>
                  <p className="mt-3 text-lg font-semibold text-zinc-900">
                    {formatCurrency(service.price.toString())}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="planos" className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-2 text-2xl font-semibold">Planos de assinatura</h2>
            <p className="mb-8 text-zinc-600">Pague um valor fixo por mês e não se preocupe mais com o corte.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="flex flex-col rounded-xl border border-zinc-200 p-6">
                  <h3 className="font-semibold text-zinc-900">{plan.name}</h3>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">
                    {formatCurrency(plan.price.toString())}
                    <span className="text-sm font-normal text-zinc-500">/mês</span>
                  </p>
                  <Link
                    href={subscribeHref}
                    className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700"
                  >
                    Assinar
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {settings?.address ? (
          <section className="border-t border-zinc-100 bg-zinc-50 py-16">
            <div className="mx-auto max-w-6xl px-4">
              <h2 className="mb-4 text-2xl font-semibold">Onde estamos</h2>
              <p className="text-zinc-600">{settings.address}</p>
            </div>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-zinc-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-sm text-zinc-500">
          <p>{businessName}</p>
          {settings?.phone ? <p>{settings.phone}</p> : null}
        </div>
      </footer>
    </div>
  );
}
