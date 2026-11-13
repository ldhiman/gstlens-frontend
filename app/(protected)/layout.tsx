"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import OnboardingTour from "@/components/OnboardingTour";
import BusinessOnboardingModal from "@/components/BusinessOnboardingModal";
import AppSidebar, { SIDEBAR_COLLAPSE_EVENT } from "@/components/AppSidebar";
import SandboxBanner from "@/components/SandboxBanner";
import { isSandboxModeActive } from "@/lib/sandboxData";
import { WifiOff, Database } from "lucide-react";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const {
    user,
    userProfile,
    loading,
    isOnline,
    isOfflineMode,
    isSandboxMode,
    enterOfflineMode,
    enterSandboxMode,
    exitOfflineMode,
  } = useAuth();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isSandbox = isSandboxMode || isSandboxModeActive();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSidebarCollapsed(localStorage.getItem("gstlens_sidebar_collapsed") === "true");

      const handleCollapse = (e: any) => {
        setIsSidebarCollapsed(e.detail?.isCollapsed ?? false);
      };

      window.addEventListener(SIDEBAR_COLLAPSE_EVENT, handleCollapse);
      return () => window.removeEventListener(SIDEBAR_COLLAPSE_EVENT, handleCollapse);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        const hasSandboxParam =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).get("sandbox") === "true";
        const isSandboxSaved =
          typeof window !== "undefined" &&
          localStorage.getItem("gstlens_sandbox_mode") === "true";
        const isOfflineSaved =
          typeof window !== "undefined" &&
          localStorage.getItem("gstlens_offline_mode") === "true";
        const isDeviceOffline = typeof navigator !== "undefined" && !navigator.onLine;

        if (hasSandboxParam || isSandboxSaved) {
          enterSandboxMode();
        } else if (isOfflineSaved || isDeviceOffline) {
          enterOfflineMode();
        } else {
          router.replace("/login");
        }
      } else if (!userProfile?.primary_gstin && !user.isOffline) {
        router.replace("/settings?tab=profile");
      }
    }
  }, [loading, user, userProfile, router, enterOfflineMode, enterSandboxMode]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Sandbox Banner when in Guest Sandbox Mode */}
      <SandboxBanner />

      {/* Offline Status Bar Alert when working offline (and not in sandbox) */}
      {(!isOnline || isOfflineMode) && !isSandbox && (
        <div className="bg-stone-800 text-stone-100 border-b border-stone-700 font-medium text-xs py-1.5 px-4 flex items-center justify-between z-50 sticky top-0 shadow-xs backdrop-blur-sm transition-all">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 justify-center sm:justify-start">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> Invoices, receipts, inventory, and clients are saved in local storage.
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-stone-400">
              <Database className="w-3 h-3" /> Zero data loss guaranteed
            </span>
          </div>

          {isOnline && isOfflineMode && (
            <button
              onClick={() => exitOfflineMode()}
              className="text-[11px] bg-stone-700 hover:bg-stone-600 text-stone-100 px-2.5 py-0.5 rounded-md transition shrink-0 ml-2 cursor-pointer"
            >
              Switch to Cloud Mode
            </button>
          )}
        </div>
      )}

      <div className="flex-1 flex">
        {/* Persistent Left Sidebar */}
        <AppSidebar />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${
            isSidebarCollapsed ? "md:pl-16" : "md:pl-64"
          } transition-all duration-300 ease-in-out pb-20 md:pb-0`}
        >
          <main className="flex-1 min-w-0">{children}</main>
          <BottomNav />
          <OnboardingTour />
          <BusinessOnboardingModal />
        </div>
      </div>
    </div>
  );
}
