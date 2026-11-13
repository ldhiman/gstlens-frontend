"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));

    const onThemeChange = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    window.addEventListener("gstlens_theme_change", onThemeChange);
    window.addEventListener("storage", onThemeChange);

    return () => {
      window.removeEventListener("gstlens_theme_change", onThemeChange);
      window.removeEventListener("storage", onThemeChange);
    };
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextDark = !root.classList.contains("dark");
    if (nextDark) {
      root.classList.add("dark");
      localStorage.setItem("gstlens_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("gstlens_theme", "light");
    }
    setIsDark(nextDark);
    window.dispatchEvent(
      new CustomEvent("gstlens_theme_change", {
        detail: nextDark ? "dark" : "light",
      })
    );
  };

  if (!mounted) {
    return (
      <div
        className={`w-8 h-8 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800 animate-pulse ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 active:scale-95 cursor-pointer ${
        isDark
          ? "bg-stone-800 border-stone-700 text-amber-300 hover:bg-stone-700 shadow-xs"
          : "bg-white border-stone-200 text-amber-500 shadow-xs hover:bg-stone-50"
      } ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
