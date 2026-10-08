"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "midnight" | "warm";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "ethome_theme_preference";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored && ["light", "dark", "midnight", "warm"].includes(stored)) {
        setThemeState(stored);
        applyThemeClass(stored);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial = prefersDark ? "dark" : "light";
        setThemeState(initial);
        applyThemeClass(initial);
      }
    } catch {
      // fallback
    }
    setMounted(true);
  }, []);

  function applyThemeClass(t: Theme) {
    const root = document.documentElement;
    root.classList.remove("dark", "theme-midnight", "theme-warm", "theme-light");

    if (t === "dark") {
      root.classList.add("dark");
    } else if (t === "midnight") {
      root.classList.add("dark", "theme-midnight");
    } else if (t === "warm") {
      root.classList.add("theme-warm");
    } else {
      root.classList.add("theme-light");
    }

    root.setAttribute("data-theme", t);
  }

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    applyThemeClass(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // fallback
    }
  }

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  }

  const isDark = theme === "dark" || theme === "midnight";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "light" as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
      isDark: false,
    };
  }
  return context;
}
