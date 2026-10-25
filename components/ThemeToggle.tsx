"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("gstlens_theme") as Theme | null;
    if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
      setTheme(saved);
      applyTheme(saved);
    } else {
      applyTheme("system");
    }
  }, []);

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
    } else if (t === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  };

  const handleSelect = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("gstlens_theme", t);
    applyTheme(t);
  };

  // Next toggle cycle: light -> dark -> system -> light
  const cycleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    handleSelect(next);
  };

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />
    );
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Theme: ${theme.toUpperCase()} (Click to change)`}
      aria-label="Toggle theme"
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
        theme === "dark"
          ? "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700"
          : theme === "light"
          ? "bg-white border-slate-200 text-amber-500 shadow-xs hover:bg-slate-50"
          : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-slate-200 dark:hover:bg-slate-700"
      } ${className}`}
    >
      {theme === "light" && <Sun className="w-4 h-4 transition-transform rotate-0" />}
      {theme === "dark" && <Moon className="w-4 h-4 transition-transform rotate-0" />}
      {theme === "system" && <Monitor className="w-4 h-4 transition-transform rotate-0" />}
    </button>
  );
}
