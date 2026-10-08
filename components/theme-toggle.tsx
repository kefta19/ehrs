"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Sparkles, Palette, Check } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";

const THEMES: { id: Theme; label: string; desc: string; iconColor: string; bgBadge: string }[] = [
  {
    id: "light",
    label: "Clean Light",
    desc: "Bright & crisp white/slate",
    iconColor: "text-amber-500",
    bgBadge: "bg-slate-100 border-slate-300",
  },
  {
    id: "dark",
    label: "Deep Dark",
    desc: "Modern low-light dark slate",
    iconColor: "text-blue-400",
    bgBadge: "bg-[#090d16] border-slate-700",
  },
  {
    id: "midnight",
    label: "Midnight Navy",
    desc: "Deep ocean night blue",
    iconColor: "text-indigo-400",
    bgBadge: "bg-[#070d1e] border-indigo-900",
  },
  {
    id: "warm",
    label: "Warm Paper",
    desc: "Cozy sepia reading tone",
    iconColor: "text-amber-600",
    bgBadge: "bg-[#fbf8f2] border-amber-200",
  },
];

export function ThemeToggle({
  showLabel = false,
  className = "",
}: {
  showLabel?: boolean;
  className?: string;
}) {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-1 shadow-sm backdrop-blur-md transition-colors">
        {/* Quick 1-click Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          {isDark ? (
            <Moon size={15} className="text-blue-400 animate-in spin-in-180 duration-200" />
          ) : (
            <Sun size={15} className="text-amber-500 animate-in spin-in-180 duration-200" />
          )}
          {showLabel && <span>{isDark ? "Dark" : "Light"}</span>}
        </button>

        {/* Palette Selector Button */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Select background color theme"
          title="Customize background theme"
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-all cursor-pointer ${
            menuOpen ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400" : ""
          }`}
        >
          <Palette size={14} />
        </button>
      </div>

      {/* Palette Dropdown */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl backdrop-blur-lg z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Background Theme
          </div>

          <div className="space-y-1">
            {THEMES.map((item) => {
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTheme(item.id);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                    active
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-4 w-4 rounded-full border shadow-xs ${item.bgBadge}`}
                    />
                    <div>
                      <div className="text-xs">{item.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                  {active && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Floating bottom-right toggle accessible on any view */
export function FloatingThemeToggle() {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 print:hidden"
    >
      {open && (
        <div className="mb-1 w-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Background Tone
          </div>
          <div className="space-y-1">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTheme(item.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                  theme === item.id
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-3.5 w-3.5 rounded-full border ${item.bgBadge}`} />
                  <span>{item.label}</span>
                </div>
                {theme === item.id && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Toggle theme and background color"
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 shadow-lg shadow-black/10 backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
        title="Toggle background color / theme"
      >
        {isDark ? (
          <Moon size={18} className="text-blue-400" />
        ) : (
          <Sun size={18} className="text-amber-500" />
        )}
      </button>
    </div>
  );
}
