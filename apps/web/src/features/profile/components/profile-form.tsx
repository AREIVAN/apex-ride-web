"use client";

import { useMemo, useState } from "react";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { Input } from "@/features/shared/ui/input";
import { createClient } from "@/lib/supabase/browser";
import type { RiderProfile } from "@/types/domain";

import { updateProfileSchema, type UpdateProfileValues } from "../schemas/profile-schemas";
import { createProfileService } from "../services/profile-service";

interface ProfileFormProps {
  profile: RiderProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const service = useMemo(() => createProfileService(createClient()), []);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    const parsed = updateProfileSchema.safeParse({
      fullName: formData.get("fullName"),
      username: formData.get("username"),
      city: formData.get("city"),
      country: formData.get("country"),
      bio: formData.get("bio"),
      preferredVehicleType: formData.get("preferredVehicleType"),
      vehicleModel: formData.get("vehicleModel"),
      vehicleYear: formData.get("vehicleYear") || null,
      vehicleEngineCc: formData.get("vehicleEngineCc") || null
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "No pudimos validar tu perfil.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: UpdateProfileValues = parsed.data;
      await service.updateOwnProfile(profile.id, payload);
      setSuccess("Perfil actualizado correctamente.");
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : "No pudimos guardar tus cambios.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Perfil de rider moto</h2>
        <p className="text-sm text-slate-600">Actualiza identidad, moto principal y preferencias de rodadas.</p>
      </div>
      <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Nombre completo</span>
          <Input name="fullName" defaultValue={profile.fullName} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Username</span>
          <Input name="username" defaultValue={profile.username} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Ciudad</span>
          <Input name="city" defaultValue={profile.city} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Pais</span>
          <Input name="country" defaultValue={profile.country} />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Tipo de moto</span>
          <select
            name="preferredVehicleType"
            defaultValue={profile.preferredVehicleType}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
          >
            <option value="motorcycle">Motorcycle</option>
            <option value="scooter">Scooter</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Modelo</span>
          <Input name="vehicleModel" defaultValue={profile.vehicleModel} placeholder="Yamaha MT-07" />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Ano</span>
          <Input
            name="vehicleYear"
            type="number"
            defaultValue={profile.vehicleYear ?? ""}
            min={1980}
            max={2100}
            placeholder="2023"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">Cilindrada (cc)</span>
          <Input
            name="vehicleEngineCc"
            type="number"
            defaultValue={profile.vehicleEngineCc ?? ""}
            min={50}
            max={2500}
            placeholder="689"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Bio</span>
          <Input name="bio" defaultValue={profile.bio} />
        </label>
        {success ? <p className="sm:col-span-2 text-sm font-semibold text-emerald-600">{success}</p> : null}
        {error ? <p className="sm:col-span-2 text-sm font-semibold text-rose-600">{error}</p> : null}
        <div className="sm:col-span-2 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
          <StatLabel label="Distancia total" value={`${profile.totalDistanceKm.toFixed(0)} km`} />
          <StatLabel label="Elevacion total" value={`${profile.totalElevationM.toFixed(0)} m`} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function StatLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
