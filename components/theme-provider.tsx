"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

export type Theme = "light" | "dark" | "midnight" | "warm";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "ethome_theme_preference";
const THEMES: Theme[] = ["light", "dark", "midnight", "warm"];

function isTheme(value: string | null): value is Theme {
  return THEMES.includes(value as Theme);
}

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useLayoutEffect(() => {
    let initialTheme: Theme;
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      initialTheme = isTheme(stored)
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    } catch {
      initialTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    // Keep the saved theme and toggle state in sync before the first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initialTheme);
    applyThemeClass(initialTheme);
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && isTheme(e.newValue)) {
        setThemeState(e.newValue);
        applyThemeClass(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

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
