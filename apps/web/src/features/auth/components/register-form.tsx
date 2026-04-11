"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { initialAuthActionState, registerAction } from "@/features/auth/actions/auth-actions";
import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { Input } from "@/features/shared/ui/input";

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialAuthActionState);

  return (
    <Card className="mx-auto w-full max-w-md">
      <h2 className="text-2xl font-bold text-slate-900">Crea tu cuenta</h2>
      <p className="mt-1 text-sm text-slate-600">Configura tu perfil y empeza a sumar kilometros.</p>
      <form action={formAction} className="mt-6 space-y-4">
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          <span>Nombre completo</span>
          <Input name="fullName" placeholder="Ari Einstein" required />
        </label>
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          <span>Email</span>
          <Input name="email" type="email" placeholder="rider@apexride.com" required />
        </label>
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          <span>Clave</span>
          <Input name="password" type="password" required />
        </label>
        <label className="block space-y-1 text-sm font-medium text-slate-700">
          <span>Confirmar clave</span>
          <Input name="confirmPassword" type="password" required />
        </label>
        {state.error ? <p className="text-sm font-medium text-rose-600">{state.error}</p> : null}
        <SubmitButton />
      </form>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} className="w-full">
      {pending ? "Creando..." : "Crear cuenta"}
    </Button>
  );
}
