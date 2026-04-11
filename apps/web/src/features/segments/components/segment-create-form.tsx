"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { Input } from "@/features/shared/ui/input";

import { createSegmentAction, initialCreateSegmentActionState } from "../actions/create-segment-action";

export function SegmentCreateForm() {
  const [state, formAction] = useActionState(createSegmentAction, initialCreateSegmentActionState);

  return (
    <Card className="max-w-3xl space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Crear segmento</h2>
      <form action={formAction} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Nombre</span>
          <Input name="name" placeholder="Col de la Niebla" required />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Descripcion</span>
          <Input name="description" placeholder="Subida corta y explosiva" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Distancia (m)</span>
          <Input name="distanceM" type="number" min={1} required />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Desnivel (m)</span>
          <Input name="elevationGainM" type="number" min={0} required />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Visibilidad</span>
          <select
            name="visibility"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            defaultValue="public"
          >
            <option value="public">Publico</option>
            <option value="club">Club</option>
            <option value="private">Privado</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Inicio lat</span>
          <Input name="startLat" type="number" step="any" required />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Inicio lng</span>
          <Input name="startLng" type="number" step="any" required />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Fin lat</span>
          <Input name="endLat" type="number" step="any" required />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Fin lng</span>
          <Input name="endLng" type="number" step="any" required />
        </label>
        {state.error ? <p className="sm:col-span-2 text-sm font-semibold text-rose-600">{state.error}</p> : null}
        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : "Guardar segmento"}
    </Button>
  );
}
