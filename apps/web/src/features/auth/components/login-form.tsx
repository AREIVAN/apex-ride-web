"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction } from "@/features/auth/actions/auth-actions";
import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { Input } from "@/features/shared/ui/input";

interface LoginFormProps {
  nextPath?: string;
  infoMessage?: string;
}

interface AuthState {
  error: string | null;
}

export function LoginForm({ nextPath, infoMessage }: LoginFormProps) {
  const [state, formAction] = useActionState<AuthState, FormData>(loginAction, { error: null });

  return (
    <Card className="mx-auto w-full max-w-md">
      <h2 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h2>
      <p className="mt-1 text-sm text-slate-600">Inicia sesion para registrar salidas y competir en segmentos.</p>
      {infoMessage ? <p className="mt-3 text-sm font-medium text-emerald-700">{infoMessage}</p> : null}
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={nextPath ?? "/dashboard"} />
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          <span>Email</span>
          <Input name="email" type="email" placeholder="rider@apexride.com" required />
        </label>
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          <span>Clave</span>
          <Input name="password" type="password" placeholder="********" required />
        </label>
        {state?.error ? <p className="text-sm font-medium text-rose-600" role="alert">{state.error}</p> : null}
        <SubmitButton />
      </form>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} className="w-full">
      {pending ? "Ingresando..." : "Entrar"}
    </Button>
  );
}
