import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { requireGuest } from "@/features/auth/services/auth-server";

export default async function RegisterPage() {
  await requireGuest();

  return (
    <AuthShell
      badge="Comunidad Apex Ride"
      title="Crea tu perfil y sali a rodar."
      description="Configura tus datos base para empezar a guardar rutas y entrar en los leaderboards."
      footer={
        <>
          Ya tenes cuenta?{" "}
          <Link href="/login" className="font-semibold text-brand-300 hover:text-brand-200">
            Inicia sesion
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
