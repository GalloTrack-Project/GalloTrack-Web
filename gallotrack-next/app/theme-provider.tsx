"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ThemeContextValue {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children, defaultTheme = "dark" }: { children: React.ReactNode; defaultTheme?: string }) {
  const [theme, setThemeState] = useState(defaultTheme);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored) {
        setThemeState(stored);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(stored);
      }
    } catch {}
  }, []);

  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme);
    try { localStorage.setItem("theme", newTheme); } catch {}
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
