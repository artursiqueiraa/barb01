import { RegisterForm } from "@/modules/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900">Criar conta</h1>
        <p className="mb-6 text-sm text-zinc-500">Cadastre-se para assinar um plano e agendar horários.</p>
        <RegisterForm />
      </div>
    </div>
  );
}
