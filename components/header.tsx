"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  FileText,
  Settings,
  Menu,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import LoginButton from "./LoginButton";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { getSyncStatus } from "@/lib/sync";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, userProfile } = useAuth();
  const creditToShow = userProfile?.credits || 0;
  const pathname = usePathname();

  // Track if we've already shown low credit warning this session
  const [hasShownLowCreditWarning, setHasShownLowCreditWarning] =
    useState(false);

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Update sync time every 15 seconds if user has cloud sync
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

  // Show low credit warning only once per session
  useEffect(() => {
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
  }, [userProfile?.credits, user, hasShownLowCreditWarning]);

  const mainNavItems = [
    {
      label: "GSTR-1",
      href: "/gstr-1",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      label: "GSTR-3B",
      href: "/gstr-3b",
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  const mobileOnlyNavItem = {
    label: "Profile & Settings",
    href: "/profile",
    icon: <Settings className="w-4 h-4" />,
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className="sticky inset-x-0 top-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                    GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" /> GSTN Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none hidden sm:block">
                  Smart GST Invoicing & Compliance
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {mainNavItems.map((item, idx) => (
                <Link
                  key={item.href}
                  id={idx === 0 ? "tour-returns-link" : undefined}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium text-xs transition-all ${
                    isActive(item.href)
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1.5" />

              {/* Take Tour Button */}
              <button
                onClick={() => window.dispatchEvent(new Event("RESTART_TOUR"))}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl border border-indigo-100 dark:border-indigo-900/60 transition-all"
                title="Interactive Guide"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tour
              </button>

              {/* Desktop: Sync Status + Credits */}
              {userProfile && (
                <>
                  {/* Live Sync Status */}
                  {userProfile.subscription?.active && (
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium px-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      {lastSyncTime}
                    </span>
                  )}

                  {/* Credits Badge */}
                  <Link
                    href="/credits"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl hover:shadow-xs transition"
                    title="Available Processing Credits"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-400 dark:fill-amber-500" />
                    <span className="font-extrabold text-xs text-amber-800 dark:text-amber-300 tabular-nums">
                      {creditToShow}
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium hidden lg:inline">
                      credits
                    </span>
                  </Link>
                </>
              )}

              {/* Theme Toggle Button */}
              <ThemeToggle className="ml-1" />

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

              <LoginButton />
            </nav>

            {/* Mobile: Credits + Theme Toggle + Menu */}
            <div className="flex items-center gap-2 md:hidden">
              {userProfile && (
                <Link
                  href="/credits"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl"
                  title="Available Credits"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-400" />
                  <span className="font-extrabold text-xs text-amber-800 dark:text-amber-300 tabular-nums">
                    {creditToShow}
                  </span>
                </Link>
              )}

              <ThemeToggle />

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-x-0 top-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xl z-50 md:hidden animate-slide-up">
            <div className="px-4 py-5 space-y-2.5">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3.5 w-full px-3.5 py-3 rounded-2xl transition-all ${
                    isActive(item.href)
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.label === "GSTR-1" && "Sales & Outward return"}
                      {item.label === "GSTR-3B" && "Tax liability & ITC summary"}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
              ))}

              <Link
                href={mobileOnlyNavItem.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 w-full px-3.5 py-3 rounded-2xl transition-all ${
                  isActive(mobileOnlyNavItem.href)
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl flex items-center justify-center">
                  {mobileOnlyNavItem.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{mobileOnlyNavItem.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">GSTIN, Business Profile & Backup</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              {/* Mobile Sync Status */}
              {userProfile?.subscription?.active && (
                <div className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  {lastSyncTime}
                </div>
              )}

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <LoginButton />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
