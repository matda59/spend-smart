"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export const THEME_KEY = "theme";
export type ThemeMode = "light" | "dark" | "system";

const ORDER: ThemeMode[] = ["light", "dark", "system"];

const LABEL: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match this device",
};

export function applyTheme(mode: ThemeMode) {
  const dark =
    mode === "dark" ||
    (mode !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const next: ThemeMode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    setMode(next);
    applyTheme(next);
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length] ?? "system";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    setMode(next);
  }

  const Icon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="no-print"
      onClick={cycle}
      aria-label={`Colour scheme: ${LABEL[mode]}. Change it.`}
    >
      <Icon />
      {LABEL[mode]}
    </Button>
  );
}
