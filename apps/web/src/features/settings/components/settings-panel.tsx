"use client";

import { useEffect, useState } from "react";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { createClient } from "@/lib/supabase/browser";
import {
  applyThemeMode,
  defaultLocalPreferences,
  getTrackingQualityLabel,
  persistLocalPreferences,
  readLocalPreferences,
  type LocalPreferences,
  type ThemeMode,
  type TrackingQuality
} from "@/features/settings/lib/local-preferences";
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

export function SettingsPanel({ userId, initialSettings }: SettingsPanelProps) {
  const settings = initialSettings ?? defaultSettings;
  const service = createSettingsService(createClient());

  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">(settings.unitSystem ?? "metric");
  const [activityVisibility, setActivityVisibility] = useState<"public" | "club" | "private">(settings.activityVisibility ?? "public");
  const [notificationsSegments, setNotificationsSegments] = useState(settings.notificationsSegments ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [trackingQuality, setTrackingQuality] = useState<TrackingQuality>("balanced");
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [initialLocal, setInitialLocal] = useState<LocalPreferences>(defaultLocalPreferences);
  const [initialRemote, setInitialRemote] = useState({
    unitSystem: settings.unitSystem ?? "metric",
    activityVisibility: settings.activityVisibility ?? "public",
    notificationsSegments: settings.notificationsSegments ?? true
  });

  useEffect(() => {
    const stored = readLocalPreferences();
    setWeeklyDigest(stored.weeklyDigest);
    setTrackingQuality(stored.trackingQuality);
    setThemeMode(stored.themeMode);
    setInitialLocal(stored);
  }, []);

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      await service.updateSettings(userId, {
        unitSystem,
        activityVisibility,
        notificationsSegments
      });
      persistLocalPreferences({ weeklyDigest, trackingQuality, themeMode });
      setInitialRemote({ unitSystem, activityVisibility, notificationsSegments });
      setInitialLocal({ weeklyDigest, trackingQuality, themeMode });
      setMessage("Configuracion guardada correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar configuracion.");
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges =
    unitSystem !== initialRemote.unitSystem ||
    activityVisibility !== initialRemote.activityVisibility ||
    notificationsSegments !== initialRemote.notificationsSegments ||
    weeklyDigest !== initialLocal.weeklyDigest ||
    trackingQuality !== initialLocal.trackingQuality ||
    themeMode !== initialLocal.themeMode;

  return (
    <div className="space-y-4">
      <Card className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Preferencias operativas</h2>
        <p className="text-sm text-slate-600">Configuracion agrupada por categorias para mantener una experiencia consistente.</p>
      </div>

      <div className="space-y-4">
        <fieldset className="space-y-2 rounded-xl border border-slate-200/80 bg-white/80 p-3.5">
          <legend className="text-sm font-medium text-slate-700">Unidad de medida</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUnitSystem("metric")}
              className={`focus-ring min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-[0.99] ${
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
              className={`focus-ring min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-[0.99] ${
                unitSystem === "imperial"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Imperial (mi)
            </button>
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded-xl border border-slate-200/80 bg-white/80 p-3.5">
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

        <fieldset className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 p-3.5">
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
          <label className="focus-ring flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <span className="text-sm text-slate-700">Resumen semanal de progreso</span>
            <input
              type="checkbox"
              checked={weeklyDigest}
              onChange={(e) => setWeeklyDigest(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
          </label>
          <p className={`rounded-lg px-3 py-2 text-xs font-medium ${weeklyDigest ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-slate-200 bg-slate-50 text-slate-600"}`}>
            {weeklyDigest
              ? "Recibiras un resumen semanal con distancia, PB y progreso de segmentos."
              : "Resumen semanal pausado. Seguira activo solo el feedback dentro de la app."}
          </p>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 p-3.5">
          <legend className="text-sm font-medium text-slate-700">Calidad de tracking</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <QualityButton active={trackingQuality === "balanced"} onClick={() => setTrackingQuality("balanced")} title="Balanceado" subtitle="Uso diario" />
            <QualityButton active={trackingQuality === "max"} onClick={() => setTrackingQuality("max")} title="Maxima precision" subtitle="Entrenos" />
            <QualityButton active={trackingQuality === "battery"} onClick={() => setTrackingQuality("battery")} title="Ahorro bateria" subtitle="Rutas largas" />
          </div>
          <p className="rounded-lg border border-brand-200 bg-brand-50/80 px-3 py-2 text-xs text-brand-800">
            Perfil activo: <span className="font-semibold">{getTrackingQualityLabel(trackingQuality)}</span>. Se aplica en Grabar para ajustar precision GPS y consumo.
          </p>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-slate-200/80 bg-white/80 p-3.5">
          <legend className="text-sm font-medium text-slate-700">Apariencia</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setThemeMode("system")}
              className={`focus-ring min-h-11 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-[0.99] ${themeMode === "system" ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            >
              Sistema
            </button>
            <button
              type="button"
              onClick={() => setThemeMode("light")}
              className={`focus-ring min-h-11 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-[0.99] ${themeMode === "light" ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            >
              Claro
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {themeMode === "light" ? "Tema claro forzado activo en toda la app." : "Tema sistema activo: se adapta a tu preferencia del dispositivo."}
          </p>
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

      <Card className="space-y-2 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Cuenta y seguridad</h3>
        <p className="text-sm text-slate-600">Para cambios sensibles de credenciales o eliminacion de cuenta, contacta soporte hasta habilitar flujo self-service.</p>
      </Card>
    </div>
  );
}

function QualityButton({
  active,
  onClick,
  title,
  subtitle
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`focus-ring rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.99] ${active ? "border-brand-300 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="text-xs text-slate-600">{subtitle}</p>
    </button>
  );
}
