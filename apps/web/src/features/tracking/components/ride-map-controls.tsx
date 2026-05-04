"use client";

interface RideMapControlsProps {
  isPaused: boolean;
  isSaving: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onRecenter: () => void;
}

export function RideMapControls({
  isPaused,
  isSaving,
  onPause,
  onResume,
  onFinish,
  onRecenter,
}: RideMapControlsProps) {
  return (
    <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-[rgba(10,15,25,0.94)] p-1.5 text-white shadow-[0_18px_42px_rgba(0,0,0,0.5),0_3px_10px_rgba(0,0,0,0.35)]">
      <ControlButton onClick={isPaused ? onResume : onPause} disabled={isSaving}>
        {isPaused ? "Reanudar" : "Pausar"}
      </ControlButton>
      <ControlButton onClick={onRecenter} disabled={isSaving}>
        Recentrar
      </ControlButton>
      <ControlButton tone="danger" onClick={onFinish} disabled={isSaving}>
        {isSaving ? "Guardando" : "Finalizar"}
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  disabled,
  onClick,
  tone = "neutral",
}: {
  children: string;
  disabled?: boolean;
  onClick: () => void;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        tone === "danger"
          ? "focus-ring min-h-12 rounded-xl border border-red-400/30 bg-red-600 px-4 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] transition hover:bg-red-500 active:bg-red-700 disabled:cursor-not-allowed disabled:opacity-55 landscape:min-h-11 landscape:px-3"
          : "focus-ring min-h-12 rounded-xl border border-white/10 bg-slate-800/95 px-4 text-xs font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] transition hover:bg-slate-700 active:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-55 landscape:min-h-11 landscape:px-3"
      }
    >
      {children}
    </button>
  );
}
