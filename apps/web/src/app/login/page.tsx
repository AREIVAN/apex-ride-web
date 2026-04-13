import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { requireGuest } from "@/features/auth/services/auth-server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string }> }) {
  await requireGuest();
  const params = await searchParams;
  const infoMessage = params.registered === "1" ? "Cuenta creada. Si te lo pidio Supabase, confirma tu email antes de entrar." : undefined;

  return (
    <AuthShell
      badge="Apex Ride Platform"
      title="Datos en ruta, decisiones al instante."
      description="Inicia sesion para registrar tus rodadas, seguir metricas en vivo y competir en segmentos."
      footer={
        <>
          No tenes cuenta?{" "}
          <Link href="/register" className="font-semibold text-brand-300 hover:text-brand-200">
            Registrate
          </Link>
        </>
      }
    >
      <LoginForm nextPath={params.next} infoMessage={infoMessage} />
    </AuthShell>
  );
}
