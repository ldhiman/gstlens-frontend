"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  Sparkles,
  Receipt,
  Plus,
  ShieldCheck,
  Search,
  Camera,
} from "lucide-react";
import LoginButton from "./LoginButton";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { getSyncStatus } from "@/lib/sync";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { user, userProfile } = useAuth();
  const sub = userProfile?.subscription;
  const isUnlimited = Boolean(
    userProfile?.unlimited_credits ||
    (sub?.active && (sub?.unlimited_credits === true || sub?.unlimited_credits === "true")) ||
    (sub?.active && sub?.plan?.toLowerCase().includes("unlimited"))
  );
  const creditToShow = isUnlimited ? "∞" : (userProfile?.credits || 0);
  const pathname = usePathname();

  const [hasShownLowCreditWarning, setHasShownLowCreditWarning] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.subscription?.active) {
      setLastSyncTime(null);
      return;
    }

    getSyncStatus().then((res) => {
      setLastSyncTime(res);
    });

    const interval = setInterval(() => {
      getSyncStatus().then((res) => {
        setLastSyncTime(res);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [userProfile?.subscription?.active]);

  useEffect(() => {
    if (isUnlimited) return;
    let credits = userProfile?.credits || 0;
    if (user && credits > 0 && credits < 5 && !hasShownLowCreditWarning) {
      toast(
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">Low on credits!</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              You have {credits} credit{credits > 1 ? "s" : ""} left. Top up to continue processing.
            </p>
          </div>
        </div>,
        {
          duration: 10000,
          position: "bottom-right",
          className: "bg-amber-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-700/50 shadow-lg rounded-2xl",
          icon: "⚠️",
        }
      );
      setHasShownLowCreditWarning(true);
    }
  }, [userProfile?.credits, user, hasShownLowCreditWarning, isUnlimited]);

  const openSidebar = () => {
    window.dispatchEvent(new Event("TOGGLE_APP_SIDEBAR"));
  };

  // Derive human-readable breadcrumb from pathname
  const pageTitle = (() => {
    if (pathname.includes("/invoices/new")) return "New Invoice";
    if (pathname.includes("/invoices/edit")) return "Edit Invoice";
    if (pathname.includes("/invoices")) return "Invoices & Sales";
    if (pathname.includes("/purchases")) return "Purchase Bills";
    if (pathname.includes("/clients")) return "Parties & Ledgers";
    if (pathname.includes("/inventory")) return "Inventory Catalog";
    if (pathname.includes("/receipts")) return "Payment Vouchers";
    if (pathname.includes("/expenses")) return "Expense Tracker";
    if (pathname.includes("/gstr-1")) return "GSTR-1 Outward Return";
    if (pathname.includes("/gstr-2b") || pathname.includes("/reconcile")) return "GSTR-2B Reconcile";
    if (pathname.includes("/gstr-3b")) return "GSTR-3B Summary";
    if (pathname.includes("/returns")) return "GSTR-2B Reconcile";
    if (pathname.includes("/reports")) return "Financial Reports";
    if (pathname.includes("/settings")) return "Settings & Backup";
    if (pathname.includes("/credits")) return "OCR Credit Packs";
    return "Dashboard";
  })();

  return (
    <header className="sticky inset-x-0 top-0 z-30 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Sidebar Trigger + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={openSidebar}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Toggle Sidebar Menu"
              title="Toggle Sidebar (Ctrl+B)"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-white">GSTLens</span>
            </div>

            {/* Desktop Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Workspace</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{pageTitle}</span>
            </div>
          </div>

          {/* Right: Quick Action, Credits, Theme & Avatar */}
          <div className="flex items-center gap-2">
            {/* 📸 Scan Bill */}
            <Link
              href="/purchases"
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-98"
              title="Scan or upload a purchase bill"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Scan Bill</span>
            </Link>

            {/* ➕ New Bill */}
            <Link
              href="/invoices/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition active:scale-98 shrink-0"
              title="Create a new invoice"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New Bill</span>
            </Link>

            {/* Live Cloud Sync status indicator */}
            {userProfile?.subscription?.active && (
              <span
                className="hidden lg:flex text-xs text-slate-500 dark:text-slate-400 font-medium px-2 items-center gap-1.5"
                title={lastSyncTime ? `Last synced: ${lastSyncTime}` : "Saved to cloud"}
              >
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Saved to cloud
              </span>
            )}

            {/* Processing Credits */}
            {userProfile && (
              <Link
                href="/credits"
                className="bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200 transition"
                title={isUnlimited ? "Unlimited AI Scans Active" : "Available Credits"}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {isUnlimited ? (
                  <span className="font-semibold text-xs flex items-center gap-1">
                    <span className="font-mono font-bold">∞</span>
                    <span className="hidden sm:inline">Unlimited scans</span>
                  </span>
                ) : (
                  <span className="font-medium text-xs flex items-center gap-1">
                    <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                      {userProfile?.credits ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                      scans left
                    </span>
                  </span>
                )}
              </Link>
            )}

            <ThemeToggle />
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
}
