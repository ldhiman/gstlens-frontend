"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import OnboardingTour from "@/components/OnboardingTour";
import BusinessOnboardingModal from "@/components/BusinessOnboardingModal";
import AppSidebar, { SIDEBAR_COLLAPSE_EVENT } from "@/components/AppSidebar";
import { WifiOff, Database, ShieldCheck, RefreshCw } from "lucide-react";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const {
    user,
    userProfile,
    loading,
    isOnline,
    isOfflineMode,
    enterOfflineMode,
    exitOfflineMode,
  } = useAuth();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
        // If device is offline, automatically enter offline local workspace
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          enterOfflineMode();
        } else {
          router.replace("/login");
        }
      } else if (!userProfile?.primary_gstin && !user.isOffline) {
        router.replace("/settings?tab=profile");
      }
    }
  }, [loading, user, userProfile, router, enterOfflineMode]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Offline Status Bar Alert when working offline */}
      {(!isOnline || isOfflineMode) && (
        <div className="bg-amber-500/90 dark:bg-amber-600/90 text-slate-950 font-bold text-xs py-1.5 px-4 flex items-center justify-between z-50 sticky top-0 shadow-xs backdrop-blur-sm transition-all">
          <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 justify-center sm:justify-start">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> All invoices, POS receipts, inventory, and clients are safely saved in local IndexedDB.
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] opacity-90">
              <Database className="w-3 h-3" /> Zero data loss guaranteed
            </span>
          </div>

          {isOnline && isOfflineMode && (
            <button
              onClick={() => exitOfflineMode()}
              className="text-[11px] bg-slate-950 text-white px-2.5 py-0.5 rounded-lg hover:bg-slate-800 transition shrink-0 ml-2"
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
