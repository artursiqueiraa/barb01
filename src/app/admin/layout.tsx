import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { auth } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <AdminSidebar role={session.user.role} />
      <div className="flex flex-1 flex-col">
        <AdminHeader name={session.user.name ?? session.user.email ?? ""} role={session.user.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
