"use client";

import { User, LogOut, ChevronDown, Sparkles, LogIn } from "lucide-react";
import { useState } from "react";
import { loginWithGoogle, logout } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

export default function LoginButton() {
  const { user, userProfile, loading, isSandboxMode, exitOfflineMode } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={async () => {
          try {
            await loginWithGoogle();
            router.push("/dashboard");
          } catch (e) {
            console.error(e);
          }
        }}
        className="px-3.5 py-1.5 rounded-xl bg-[#047857] hover:bg-[#065f46] active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
      >
        Sign in
      </button>
    );
  }

  const isGuestOrOffline = Boolean(user?.isOffline);
  const displayName = isGuestOrOffline
    ? isSandboxMode
      ? "Sandbox Guest"
      : user.displayName || "Offline Business"
    : user.displayName || "User";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="relative">
      {/* Sleek, Minimalist Avatar Trigger */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="relative flex items-center gap-1.5 p-0.5 rounded-full ring-1 ring-stone-200 dark:ring-stone-700 hover:ring-[#047857]/70 dark:hover:ring-emerald-400/70 bg-white dark:bg-[#161513] transition-all duration-150 active:scale-95 cursor-pointer shadow-xs group"
        aria-label="User account menu"
      >
        <div className="relative shrink-0">
          <UserAvatar user={user} />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-stone-900 ${
              isGuestOrOffline ? "bg-amber-500" : "bg-emerald-500"
            }`}
          />
        </div>
        <span className="hidden lg:block text-xs font-semibold text-stone-700 dark:text-stone-200 group-hover:text-stone-900 dark:group-hover:text-white pl-0.5 pr-1 max-w-[110px] truncate">
          {firstName}
        </span>
        <ChevronDown
          className={`hidden lg:block h-3.5 w-3.5 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-transform duration-200 pr-1 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {dropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />

          {/* Floating Account Card */}
          <div className="absolute right-0 mt-2.5 w-64 origin-top-right overflow-hidden rounded-2xl bg-white/95 dark:bg-[#161513]/95 border border-stone-200/80 dark:border-white/[0.08] shadow-xl backdrop-blur-xl z-50 animate-in p-1">
            {/* User Details Header */}
            <div className="px-3 py-2.5 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-stone-900 dark:text-stone-100 text-xs truncate">
                  {displayName}
                </p>
                {isGuestOrOffline && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider shrink-0">
                    {isSandboxMode ? "Sandbox" : "Offline"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono truncate mt-0.5">
                {user.email}
              </p>
              {userProfile?.primary_gstin && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#047857] dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                    {userProfile.primary_gstin}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="py-1 space-y-0.5">
              {isGuestOrOffline && (
                <button
                  onClick={async () => {
                    setDropdownOpen(false);
                    exitOfflineMode();
                    try {
                      await loginWithGoogle();
                      router.push("/dashboard");
                    } catch {
                      router.push("/login");
                    }
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#047857] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Sign in with Google (save cloud)</span>
                </button>
              )}

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/settings?tab=account");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <User className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0" />
                <span>Account & settings</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/credits");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span>AI credits & plan</span>
                  <span className="text-[10px] font-mono font-bold text-[#047857] dark:text-emerald-400">
                    {isGuestOrOffline ? "Demo" : userProfile?.credits ?? 0}
                  </span>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-stone-100 dark:border-stone-800 my-1" />

            {/* Sign Out / Exit Sandbox */}
            <div className="p-0.5">
              <button
                onClick={async () => {
                  setDropdownOpen(false);
                  if (isGuestOrOffline) {
                    exitOfflineMode();
                    router.push("/");
                  } else {
                    await logout();
                    router.push("/");
                  }
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>{isGuestOrOffline ? "Exit demo sandbox" : "Sign out"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
