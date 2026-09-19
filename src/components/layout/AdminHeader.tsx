import { signOut } from "@/lib/auth";

export function AdminHeader({ name, role }: { name: string; role: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-zinc-900">{name}</p>
          <p className="text-xs text-zinc-500">{role}</p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="text-sm text-zinc-500 hover:text-zinc-900" type="submit">
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
