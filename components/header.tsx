"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  ScanLine,
  Receipt,
  Plus,
  Camera,
  AlertCircle,
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
    const credits = userProfile?.credits || 0;
    if (user && credits > 0 && credits < 5 && !hasShownLowCreditWarning) {
      toast(
        <div className="flex items-center gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100">Low OCR credits</p>
            <p className="text-stone-500 dark:text-stone-400">
              {credits} scan{credits > 1 ? "s" : ""} remaining in your balance
            </p>
          </div>
        </div>,
        {
          duration: 8000,
          position: "bottom-right",
          className: "bg-white dark:bg-[#1c1a18] border border-black/[0.08] dark:border-white/[0.08] shadow-md rounded-lg",
        }
      );
      setHasShownLowCreditWarning(true);
    }
  }, [userProfile?.credits, user, hasShownLowCreditWarning, isUnlimited]);

  const openSidebar = () => {
    window.dispatchEvent(new Event("TOGGLE_APP_SIDEBAR"));
  };

  const pageTitle = (() => {
    if (pathname.includes("/invoices/new")) return "New invoice";
    if (pathname.includes("/invoices/edit")) return "Edit invoice";
    if (pathname.includes("/invoices")) return "Invoices & sales";
    if (pathname.includes("/purchases")) return "Purchase bills";
    if (pathname.includes("/clients")) return "Parties & ledgers";
    if (pathname.includes("/inventory")) return "Inventory";
    if (pathname.includes("/receipts")) return "Payment receipts";
    if (pathname.includes("/expenses")) return "Expenses";
    if (pathname.includes("/gstr-1")) return "GSTR-1 outward";
    if (pathname.includes("/gstr-2b") || pathname.includes("/reconcile")) return "GSTR-2B reconcile";
    if (pathname.includes("/gstr-3b")) return "GSTR-3B summary";
    if (pathname.includes("/returns")) return "Returns";
    if (pathname.includes("/reports")) return "Reports";
    if (pathname.includes("/settings")) return "Settings";
    if (pathname.includes("/credits")) return "OCR credits";
    return "Dashboard";
  })();

  return (
    <header className="sticky inset-x-0 top-0 z-30 bg-[#fafaf9]/90 dark:bg-[#12110f]/90 backdrop-blur-md border-b border-black/[0.08] dark:border-white/[0.08] transition-colors">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Left: Mobile sidebar trigger & breadcrumbs */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={openSidebar}
              className="p-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition cursor-pointer"
              aria-label="Toggle sidebar menu"
              title="Toggle sidebar (Ctrl+B)"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Mobile Brand */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-7 h-7 bg-emerald-700 rounded-md flex items-center justify-center text-white">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">GSTLens</span>
            </div>

            {/* Desktop Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="text-stone-400 dark:text-stone-500 font-normal">Ledger</span>
              <span className="text-stone-300 dark:text-stone-700">/</span>
              <span className="font-medium text-stone-900 dark:text-stone-100">{pageTitle}</span>
            </div>
          </div>

          {/* Right: Quick actions, credits, theme & avatar */}
          <div className="flex items-center gap-2">
            <Link
              href="/purchases"
              className="bg-white dark:bg-[#1a1917] hover:bg-stone-100 dark:hover:bg-[#23211e] text-stone-800 dark:text-stone-200 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              title="Scan or upload purchase bills"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Scan bill</span>
            </Link>

            <Link
              href="/invoices/new"
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shrink-0"
              title="Create a new tax invoice"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>New invoice</span>
            </Link>

            {/* Live cloud sync status */}
            {userProfile?.subscription?.active && (
              <span
                className="hidden lg:flex text-[11px] text-stone-500 dark:text-stone-400 font-normal px-2 items-center gap-1.5"
                title={lastSyncTime ? `Last synced: ${lastSyncTime}` : "Saved to cloud"}
              >
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                Cloud sync active
              </span>
            )}

            {/* OCR Credits indicator */}
            {userProfile && (
              <Link
                href="/credits"
                className="bg-stone-100 dark:bg-stone-900 hover:bg-stone-200 dark:hover:bg-stone-800/80 border border-black/[0.08] dark:border-white/[0.08] px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 font-normal text-stone-700 dark:text-stone-300 transition"
                title={isUnlimited ? "Unlimited OCR scans active" : "Available scan credits"}
              >
                <ScanLine className="w-3.5 h-3.5 text-stone-400" />
                {isUnlimited ? (
                  <span className="font-mono font-medium text-xs">∞</span>
                ) : (
                  <span className="font-mono font-medium text-xs text-stone-900 dark:text-stone-100 tabular-nums">
                    {userProfile?.credits ?? 0}
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-1 font-sans font-normal hidden sm:inline">
                      scans
                    </span>
                  </span>
                )}
              </Link>
            )}

            <ThemeToggle />
            <div className="w-px h-4 bg-black/[0.08] dark:border-white/[0.08] mx-0.5 hidden sm:block" />
            <LoginButton />
          </div>
        </div>
      </div>
    </header>
  );
}
