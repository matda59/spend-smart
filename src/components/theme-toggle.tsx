"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export const THEME_KEY = "theme";
export type ThemeMode = "light" | "dark";

const LABEL: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
};

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

function storedTheme(): ThemeMode {
  return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const next = storedTheme();
    setMode(next);
    applyTheme(next);
  }, []);

  function choose(next: ThemeMode) {
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    setMode(next);
  }

  return (
    <div className="no-print flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label="Colour scheme">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={mode === "light"}
        className={mode === "light" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}
        onClick={() => choose("light")}
      >
        <Sun />
        {LABEL.light}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={mode === "dark"}
        className={mode === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}
        onClick={() => choose("dark")}
      >
        <Moon />
        {LABEL.dark}
      </Button>
    </div>
  );
}
