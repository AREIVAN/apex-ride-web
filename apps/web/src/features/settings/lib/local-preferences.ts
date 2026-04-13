export type ThemeMode = "system" | "light";
export type TrackingQuality = "balanced" | "max" | "battery";

export interface LocalPreferences {
  weeklyDigest: boolean;
  trackingQuality: TrackingQuality;
  themeMode: ThemeMode;
}

export const defaultLocalPreferences: LocalPreferences = {
  weeklyDigest: true,
  trackingQuality: "balanced",
  themeMode: "system"
};

const STORAGE_KEY = "apex:local-settings";

export function readLocalPreferences(): LocalPreferences {
  if (typeof window === "undefined") return defaultLocalPreferences;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultLocalPreferences;

  try {
    const parsed = JSON.parse(raw) as Partial<LocalPreferences>;
    return {
      weeklyDigest: typeof parsed.weeklyDigest === "boolean" ? parsed.weeklyDigest : defaultLocalPreferences.weeklyDigest,
      trackingQuality:
        parsed.trackingQuality === "max" || parsed.trackingQuality === "battery" || parsed.trackingQuality === "balanced"
          ? parsed.trackingQuality
          : defaultLocalPreferences.trackingQuality,
      themeMode: parsed.themeMode === "light" || parsed.themeMode === "system" ? parsed.themeMode : defaultLocalPreferences.themeMode
    };
  } catch {
    return defaultLocalPreferences;
  }
}

export function persistLocalPreferences(preferences: LocalPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (mode === "light") {
    root.setAttribute("data-theme-mode", "light");
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme-mode", prefersDark ? "system-dark" : "system-light");
}

export function getTrackingQualityLabel(quality: TrackingQuality): string {
  if (quality === "max") return "Maxima precision";
  if (quality === "battery") return "Ahorro de bateria";
  return "Balanceado";
}
