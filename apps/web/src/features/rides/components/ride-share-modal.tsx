"use client";

import { useEffect } from "react";

import { RideShareActions } from "@/features/rides/components/ride-share-actions";
import { RideShareCard } from "@/features/rides/components/ride-share-card";
import type { RideShareData } from "@/features/rides/lib/ride-share-export";

interface RideShareModalProps {
  data: RideShareData;
  open: boolean;
  onClose: () => void;
}

export function RideShareModal({ data, open, onClose }: RideShareModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/76 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="ride-share-title">
      <div className="max-h-[100dvh] w-full overflow-y-auto rounded-t-[2rem] bg-slate-50 p-4 shadow-2xl sm:max-w-5xl sm:rounded-[2rem] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Compartir rodada</p>
            <h2 id="ride-share-title" className="text-2xl font-black tracking-tight text-slate-950">Preview para redes</h2>
            <p className="mt-1 text-sm text-slate-600">Imagen vertical 4:5 generada sin depender del mapa WebGL.</p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm" aria-label="Cerrar modal de compartir">
            Cerrar
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(340px,0.28fr)] lg:items-start">
          <div className="mx-auto w-full max-w-[520px]">
            <RideShareCard data={data} />
          </div>
          <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-base font-black text-slate-900">Acciones</h3>
              <p className="mt-1 text-sm text-slate-600">Descargá el PNG o compartilo si tu dispositivo soporta Web Share con archivos.</p>
            </div>
            <RideShareActions data={data} onClose={onClose} />
          </aside>
        </div>
      </div>
    </div>
  );
}
