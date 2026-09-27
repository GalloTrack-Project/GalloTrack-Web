"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type ThemeName = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeName;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function normalize(value: string | null | undefined, fallback: ThemeName = "dark"): ThemeName {
  return value === "light" || value === "dark" || value === "system" ? value : fallback;
}

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: ThemeName): ResolvedTheme {
  return theme === "system" ? systemTheme() : theme;
}

function readStoredTheme(fallback: ThemeName): ThemeName {
  try {
    return normalize(localStorage.getItem("theme"), fallback);
  } catch {
    return fallback;
  }
}

function applyThemeClass(theme: ThemeName) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolveTheme(theme));
}

export function ThemeProvider({ children, defaultTheme = "dark" }: { children: React.ReactNode; defaultTheme?: string }) {
  const initialTheme = normalize(defaultTheme);
  const [theme, setThemeState] = useState<ThemeName>(() => readStoredTheme(initialTheme));
  const [systemPref, setSystemPref] = useState<ResolvedTheme>(() => systemTheme());

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemPref : theme;

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const next = mql.matches ? "dark" : "light";
      setSystemPref(next);
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(next);
    };
    handleChange();
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = useCallback((value: string) => {
    const next = normalize(value);
    setThemeState(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
