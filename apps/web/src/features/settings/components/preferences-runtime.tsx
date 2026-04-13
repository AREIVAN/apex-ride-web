"use client";

import { useEffect } from "react";

import { applyThemeMode, readLocalPreferences } from "@/features/settings/lib/local-preferences";

export function PreferencesRuntime() {
  useEffect(() => {
    const applyStoredMode = () => {
      const preferences = readLocalPreferences();
      applyThemeMode(preferences.themeMode);
    };

    applyStoredMode();
    window.addEventListener("storage", applyStoredMode);

    return () => window.removeEventListener("storage", applyStoredMode);
  }, []);

  return null;
}
