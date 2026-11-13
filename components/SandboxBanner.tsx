"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Trash2, X } from "lucide-react";
import {
  isSandboxModeActive,
  seedSandboxData,
  deactivateSandboxMode,
  clearAllSandboxData,
} from "@/lib/sandboxData";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

export default function SandboxBanner() {
  const { isSandboxMode, exitOfflineMode } = useAuth();
  const [isSandbox, setIsSandbox] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsSandbox(isSandboxMode || isSandboxModeActive());
  }, [isSandboxMode]);

  if (!isSandbox || isDismissed) return null;

  const handleReloadSampleData = async () => {
    try {
      setLoading(true);
      await seedSandboxData();
      toast.success("Sample business bills loaded");
      setTimeout(() => window.location.reload(), 300);
    } catch (e: any) {
      toast.error("Failed to load sample data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSandbox = async () => {
    if (!confirm("Clear all sandbox invoices and purchases to start with a blank ledger?")) return;
    try {
      setLoading(true);
      await clearAllSandboxData();
      toast.success("Sandbox ledger cleared");
      setTimeout(() => window.location.reload(), 300);
    } catch (e: any) {
      toast.error("Failed to clear: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExitSandbox = () => {
    deactivateSandboxMode();
    exitOfflineMode();
    window.location.href = "/login";
  };

  return (
    <aside
      aria-label="Guest sandbox status"
      className="bg-[#f5f4f0] dark:bg-[#1a1917] border-b border-black/[0.08] dark:border-white/[0.08] text-stone-800 dark:text-stone-200 px-4 py-2 text-xs z-40 sticky top-0 transition-colors"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/70 dark:border-emerald-700/60">
            Guest sandbox
          </span>
          <span className="text-stone-600 dark:text-stone-400 hidden sm:inline">
            Zero signup required. Invoices, GSTR returns, and Tally export run locally in your browser.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReloadSampleData}
            disabled={loading}
            className="px-2 py-1 bg-white dark:bg-[#23211e] hover:bg-stone-100 dark:hover:bg-[#2b2926] text-stone-800 dark:text-stone-200 rounded text-xs font-normal border border-black/[0.08] dark:border-white/[0.08] transition flex items-center gap-1 cursor-pointer"
            title="Restore sample bills"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            <span>Load sample bills</span>
          </button>

          <button
            type="button"
            onClick={handleClearSandbox}
            disabled={loading}
            className="px-2 py-1 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 rounded text-xs font-normal transition flex items-center gap-1 cursor-pointer"
            title="Clear all sandbox data"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden md:inline">Clear</span>
          </button>

          <button
            type="button"
            onClick={handleExitSandbox}
            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded text-xs font-medium transition cursor-pointer"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 ml-0.5"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
