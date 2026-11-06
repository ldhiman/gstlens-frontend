"use client";

import { User, LogOut, ChevronDown, Sparkles } from "lucide-react";
import { useState } from "react";
import { loginWithGoogle, logout } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

export default function LoginButton() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />;
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
        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
      >
        Sign In
      </button>
    );
  }

  const displayName = user.displayName || "User";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="relative">
      {/* Sleek, Minimalist Avatar Trigger (No Bulky Pill) */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="relative flex items-center gap-1.5 p-0.5 rounded-full ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-indigo-500/70 dark:hover:ring-indigo-400/70 bg-white dark:bg-slate-900 transition-all duration-150 active:scale-95 cursor-pointer shadow-xs group"
        aria-label="User account menu"
      >
        <div className="relative shrink-0">
          <UserAvatar user={user} />
          {/* Active Cloud Sync Status Dot */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
        </div>
        <span className="hidden lg:block text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white pl-0.5 pr-1 max-w-[90px] truncate">
          {firstName}
        </span>
        <ChevronDown
          className={`hidden lg:block h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-200 pr-1 ${
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

          {/* Minimalist Floating Card (Linear / Stripe Style) */}
          <div className="absolute right-0 mt-2.5 w-64 origin-top-right overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl z-50 animate-in p-1">
            {/* User Details Header */}
            <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-900 dark:text-white text-xs truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                {user.email}
              </p>
              {userProfile?.primary_gstin && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                    {userProfile.primary_gstin}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="py-1 space-y-0.5">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/settings?tab=account");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Account & Settings</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  router.push("/credits");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span>AI Credits & Plan</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {userProfile?.credits ?? 0}
                  </span>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

            {/* Sign Out */}
            <div className="p-0.5">
              <button
                onClick={async () => {
                  setDropdownOpen(false);
                  await logout();
                  router.push("/");
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(-6px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-in {
          animation: animate-in 0.15s ease-out;
        }
      `}</style>
    </div>
  );
}
