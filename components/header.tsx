"use client";

import { useState, useEffect } from "react";
import {
  Receipt,
  FileText,
  Settings,
  Menu,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import LoginButton from "./LoginButton";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { getSyncStatus } from "@/lib/sync";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, userProfile } = useAuth();
  const [creditToShow, setCreditToShow] = useState(0);
  const pathname = usePathname();

  // Track if we've already shown low credit warning this session
  const [hasShownLowCreditWarning, setHasShownLowCreditWarning] =
    useState(false);

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Update sync time every 5 seconds if user has cloud sync
  useEffect(() => {
    if (!userProfile?.subscription?.active) {
      setLastSyncTime(null);
      return;
    }

    // Initial load
    getSyncStatus().then((res) => {
      setLastSyncTime(res);
    });

    // Poll for changes
    const interval = setInterval(() => {
      getSyncStatus().then((res) => {
        setLastSyncTime(res);
      });
    }, 15000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [userProfile?.subscription?.active]);

  // Show low credit warning only once per session
  useEffect(() => {
    let credits = userProfile?.credits || 0;

    if (user && credits > 0 && credits < 5 && !hasShownLowCreditWarning) {
      toast(
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-600" />
          <div>
            <p className="font-medium text-gray-900">Low on credits!</p>
            <p className="text-sm text-gray-600">
              You have only {credits} credit{credits > 1 ? "s" : ""} left. Top
              up to continue processing invoices.
            </p>
          </div>
        </div>,
        {
          duration: 20000,
          position: "bottom-right",
          style: {
            background: "#fff8e1",
            border: "1px solid #fbbf24",
            borderRadius: "12px",
            padding: "12px",
          },
          icon: "⚠️",
        }
      );
      setHasShownLowCreditWarning(true);
    }
  }, [userProfile?.credits, user, hasShownLowCreditWarning]);

  useEffect(() => {
    setCreditToShow(userProfile?.credits || 0);
  }, [userProfile]);

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
    label: "Profile",
    href: "/profile",
    icon: <Settings className="w-4 h-4" />,
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className="sticky inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">GSTLens</h1>
                <p className="text-xs text-gray-500 leading-none">
                  Smart GST Filing
                </p>
              </div>
            </a>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {mainNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    isActive(item.href)
                      ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                      : "text-gray-700 hover:bg-gray-100 hover:text-indigo-600"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              ))}

              <div className="w-px h-6 bg-gray-300 mx-3" />

              {/* Desktop: Sync Status + Credits */}
              {userProfile && (
                <>
                  {/* Live Sync Status */}
                  {userProfile.subscription?.active && (
                    <span className="text-xs text-gray-600 font-medium px-3 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      {lastSyncTime}
                    </span>
                  )}

                  {/* Credits Badge */}
                  <a
                    href="/credits"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 transition"
                  >
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full shadow-sm"
                      title="Available Credits"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600 fill-amber-400" />
                      <span className="font-bold text-amber-800">
                        {creditToShow}
                      </span>
                      <span className="text-xs text-amber-700 hidden lg:inline">
                        credits
                      </span>
                    </div>
                  </a>
                </>
              )}

              <LoginButton />
            </nav>

            {/* Mobile: Credits + Menu */}
            <div className="flex items-center gap-3 md:hidden">
              {userProfile && (
                <a
                  href="/credits"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 transition"
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-full shadow-sm"
                    title="Available Credits"
                  >
                    <Sparkles className="w-4 h-4 text-amber-600 fill-amber-400" />
                    <span className="font-bold text-amber-800 text-lg">
                      {creditToShow}
                    </span>
                  </div>
                </a>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl hover:bg-gray-100 transition"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-x-0 top-16 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-2xl z-50 md:hidden">
            <div className="px-4 py-6 space-y-3">
              {mainNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all ${
                    isActive(item.href)
                      ? "bg-indigo-100 text-indigo-700"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center text-indigo-600">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">
                      {item.label === "GSTR-1" && "Outward supplies return"}
                      {item.label === "GSTR-3B" && "Monthly tax summary"}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </a>
              ))}

              <a
                href={mobileOnlyNavItem.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all ${
                  isActive(mobileOnlyNavItem.href)
                    ? "bg-indigo-100 text-indigo-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center text-indigo-600">
                  {mobileOnlyNavItem.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {mobileOnlyNavItem.label}
                  </p>
                  <p className="text-xs text-gray-500">Settings & GSTIN</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </a>

              {/* Mobile Sync Status */}
              {userProfile?.subscription?.active && (
                <div className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  {lastSyncTime}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <LoginButton />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
