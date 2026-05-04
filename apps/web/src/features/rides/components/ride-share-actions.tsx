"use client";

import { useState } from "react";

import { Button } from "@/features/shared/ui/button";
import {
  buildRideShareFilename,
  buildRideShareSummary,
  downloadBlob,
  generateRideSharePng,
  type RideShareData
} from "@/features/rides/lib/ride-share-export";

interface RideShareActionsProps {
  data: RideShareData;
  onClose: () => void;
}

export function RideShareActions({ data, onClose }: RideShareActionsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function withGeneratedImage(action: (blob: Blob, filename: string) => Promise<void> | void): Promise<void> {
    if (isGenerating) return;
    setIsGenerating(true);
    setFeedback("Generando imagen…");
    setError(null);

    try {
      const blob = await generateRideSharePng(data);
      await action(blob, buildRideShareFilename(data));
    } catch (err) {
      console.error("[RideShare] Export failed", err);
      setError("No se pudo generar la imagen. Intenta descargar el resumen.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownload(): Promise<void> {
    await withGeneratedImage((blob, filename) => {
      downloadBlob(blob, filename);
      setFeedback("Imagen descargada.");
    });
  }

  async function handleShare(): Promise<void> {
    await withGeneratedImage(async (blob, filename) => {
      const file = new File([blob], filename, { type: blob.type });
      const shareData = {
        title: "Rodada completada · Apex Ride",
        text: buildRideShareSummary(data),
        files: [file]
      };

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
        setFeedback("Resumen compartido.");
        return;
      }

      downloadBlob(blob, filename);
      setFeedback("Tu navegador no permite compartir archivos; descargamos la imagen.");
    });
  }

  async function handleCopySummary(): Promise<void> {
    setError(null);
    try {
      await navigator.clipboard.writeText(buildRideShareSummary(data));
      setFeedback("Resumen copiado.");
    } catch (err) {
      console.error("[RideShare] Clipboard failed", err);
      setError("No se pudo copiar el resumen. Probá descargar la imagen.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <Button type="button" onClick={handleDownload} disabled={isGenerating} className="w-full">
          Descargar imagen
        </Button>
        <Button type="button" onClick={handleShare} disabled={isGenerating} variant="secondary" className="w-full">
          Compartir
        </Button>
        <Button type="button" onClick={handleCopySummary} disabled={isGenerating} variant="ghost" className="w-full bg-white/80">
          Copiar resumen
        </Button>
        <Button type="button" onClick={onClose} disabled={isGenerating} variant="ghost" className="w-full bg-white/80">
          Cerrar
        </Button>
      </div>
      {(feedback || isGenerating) && <p className="text-sm font-semibold text-slate-700">{feedback ?? "Generando imagen…"}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
