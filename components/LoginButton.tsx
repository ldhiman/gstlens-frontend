"use client";

import { User, LogOut, ChevronDown } from "lucide-react";
import { useState } from "react";

import { loginWithGoogle, logout } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

export default function LoginButton() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (loading) {
    return <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!user) {
    return (
      <button
        onClick={loginWithGoogle}
        className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95"
      >
        <span className="relative z-10">Sign in with Google</span>
        <div className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0" />
      </button>
    );
  }

  const displayName = user.displayName || "User";
  const firstName = displayName.split(" ")[0];

  return (
    <div className="relative">
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-3 rounded-full bg-white/80 px-4 py-2.5 shadow-sm ring-1 ring-gray-200 backdrop-blur-sm transition-all duration-200 hover:ring-gray-300 hover:shadow-md active:scale-95"
        aria-label="User menu"
      >
        <UserAvatar user={user} />
        <span className="hidden font-medium text-gray-800 md:block">
          {firstName}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${
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

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-3 w-80 origin-top-right overflow-hidden rounded-2xl bg-white/90 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl z-50">
            <div className="animate-in fade-in slide-in-from-top-4 duration-200">
              {/* Header */}
              <div className="border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 px-5 py-4">
                <div className="flex items-center gap-4">
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-gray-900">
                      {displayName}
                    </p>
                    <p className="truncate text-sm text-gray-600">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-gray-100/80"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">My Profile</p>
                    <p className="text-sm text-gray-500">
                      View and edit your profile
                    </p>
                  </div>
                </button>

                <div className="mx-5 my-2 border-t border-gray-200" />

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-red-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                    <LogOut className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-600">Sign Out</p>
                    <p className="text-sm text-red-500">
                      Log out of your account
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-in {
          animation: animate-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
