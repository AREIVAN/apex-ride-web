"use client";

import { useState } from "react";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { createClient } from "@/lib/supabase/browser";
import { createSettingsService } from "../services/settings-service";
import type { UserSettings } from "../services/settings-service";

interface SettingsPanelProps {
  userId: string;
  initialSettings: UserSettings | null;
}

const defaultSettings: UserSettings = {
  unitSystem: "metric",
  activityVisibility: "public",
  notificationsSegments: true
};

function unitLabel(system: string): string {
  return system === "metric" ? "Metrico" : "Imperial";
}

function visibilityLabel(visibility: string): string {
  switch (visibility) {
    case "public":
      return "Publica";
    case "club":
      return "Solo mi club";
    case "private":
      return "Privada";
    default:
      return visibility;
  }
}

export function SettingsPanel({ userId, initialSettings }: SettingsPanelProps) {
  const settings = initialSettings ?? defaultSettings;
  const service = createSettingsService(createClient());

  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">(settings.unitSystem ?? "metric");
  const [activityVisibility, setActivityVisibility] = useState<"public" | "club" | "private">(settings.activityVisibility ?? "public");
  const [notificationsSegments, setNotificationsSegments] = useState(settings.notificationsSegments ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      await service.updateSettings(userId, {
        unitSystem,
        activityVisibility,
        notificationsSegments
      });
      setMessage("Configuracion guardada correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar configuracion.");
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges =
    unitSystem !== (settings.unitSystem ?? "metric") ||
    activityVisibility !== (settings.activityVisibility ?? "public") ||
    notificationsSegments !== (settings.notificationsSegments ?? true);

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Preferencias</h2>
        <p className="text-sm text-slate-600">Personaliza tu experiencia en Apex Ride.</p>
      </div>

      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Unidad de medida</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUnitSystem("metric")}
              className={`focus-ring min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                unitSystem === "metric"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Metrico (km)
            </button>
            <button
              type="button"
              onClick={() => setUnitSystem("imperial")}
              className={`focus-ring min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                unitSystem === "imperial"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Imperial (mi)
            </button>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Privacidad de actividad</legend>
            <select
              value={activityVisibility ?? "public"}
              onChange={(e) => setActivityVisibility(e.target.value as "public" | "club" | "private")}
              className="focus-ring min-h-11 w-full rounded-xl border border-slate-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:shadow-[0_0_0_3px_rgba(20,136,198,0.14)]"
            >
            <option value="public">Publica</option>
            <option value="club">Solo mi club</option>
            <option value="private">Privada</option>
          </select>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">Notificaciones</legend>
          <label className="focus-ring flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-700">Notificaciones de segmentos</span>
            <input
              type="checkbox"
              checked={notificationsSegments}
              onChange={(e) => setNotificationsSegments(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
          </label>
        </fieldset>
      </div>

      {message && (
        <p role="status" className={`text-sm ${message.includes("correctamente") ? "text-emerald-600" : "text-rose-600"}`}>
          {message}
        </p>
      )}

      <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
        {isSaving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </Card>
  );
}
