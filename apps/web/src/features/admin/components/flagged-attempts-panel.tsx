"use client";

import { useState } from "react";

import { Button } from "@/features/shared/ui/button";
import { Card } from "@/features/shared/ui/card";
import { createClient } from "@/lib/supabase/browser";
import { createAdminService } from "../services/admin-service";
import type { FlaggedAttemptWithDetails } from "../services/admin-service";

interface FlaggedAttemptsPanelProps {
  initialAttempts: FlaggedAttemptWithDetails[];
  userId: string;
}

const reasonLabels: Record<string, string> = {
  cheating: "Trampa",
  wrong_segment: "Segmento incorrecto",
  wrong_data: "Datos incorrectos",
  other: "Otro"
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  reviewed: "bg-blue-100 text-blue-800 border-blue-200",
  resolved: "bg-red-100 text-red-800 border-red-200"
};

export function FlaggedAttemptsPanel({ initialAttempts, userId }: FlaggedAttemptsPanelProps) {
  const [attempts, setAttempts] = useState(initialAttempts);
  const [filter, setFilter] = useState<string>("pending");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredAttempts =
    filter === "all" ? attempts : attempts.filter((a) => a.status === filter);

  const service = createAdminService(createClient());

  async function handleResolve(id: string, status: "reviewed" | "resolved") {
    setUpdating(id);
    setError(null);

    try {
      const result = await service.updateFlaggedAttempt(id, status, userId);

      setAttempts((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: result.status
              }
            : a
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setUpdating(null);
    }
  }

  const pendingCount = attempts.filter((a) => a.status === "pending").length;

  return (
    <Card className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Moderacion de reportes</h2>
        <p className="text-sm text-slate-600">
          Revisa y resuelve reportes de intentos invalidos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`focus-ring min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Todos ({attempts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`focus-ring min-h-11 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            filter === "pending"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Pendientes ({pendingCount})
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {filteredAttempts.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-500">
          {filter === "pending"
            ? "No hay reportes pendientes."
            : "No hay reportes para mostrar."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAttempts.map((attempt) => (
            <div key={attempt.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">
                    {attempt.attempt_segment_name ?? "Segmento desconocido"}
                  </p>
                  <p className="text-sm text-slate-600">
                    Reportado por {attempt.reporter_username ?? "desconocido"} el{" "}
                    {new Date(attempt.created_at).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                    statusColors[attempt.status] ?? "bg-slate-100"
                  }`}
                >
                  {attempt.status === "pending"
                    ? "Pendiente"
                    : attempt.status === "reviewed"
                      ? "Revisado"
                      : "Resuelto"}
                </span>
              </div>

              <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span>
                  <span className="font-medium">Razon:</span>{" "}
                  {reasonLabels[attempt.reason] ?? attempt.reason}
                </span>
                {attempt.attempt_distance_km && (
                  <span>
                    <span className="font-medium">Distancia:</span>{" "}
                    {attempt.attempt_distance_km.toFixed(2)} km
                  </span>
                )}
                {attempt.attempt_time_sec && (
                  <span>
                    <span className="font-medium">Tiempo:</span>{" "}
                    {Math.floor(attempt.attempt_time_sec / 60)} min
                  </span>
                )}
              </div>

              {attempt.attempt_rider_username && (
                <p className="mb-3 text-sm text-slate-600">
                  <span className="font-medium">Rider:</span>{" "}
                  {attempt.attempt_rider_full_name ?? attempt.attempt_rider_username}
                </p>
              )}

              {attempt.status === "pending" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleResolve(attempt.id, "reviewed")}
                    disabled={updating === attempt.id}
                    className="w-full"
                  >
                    {updating === attempt.id ? "Marcando..." : "Marcar revisado"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleResolve(attempt.id, "resolved")}
                    disabled={updating === attempt.id}
                    className="w-full"
                  >
                    {updating === attempt.id ? "Marcando..." : "Confirmar trampa"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
