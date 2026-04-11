import Link from "next/link";

import { RegisterForm } from "@/features/auth/components/register-form";
import { requireGuest } from "@/features/auth/services/auth-server";

export default async function RegisterPage() {
  await requireGuest();

  return (
    <main className="page-enter mx-auto min-h-screen max-w-5xl px-4 py-10 sm:py-12">
      <RegisterForm />
      <p className="mt-4 text-center text-sm text-slate-600">
        Ya tenes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-600">
          Inicia sesion
        </Link>
      </p>
    </main>
  );
}
