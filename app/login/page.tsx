"use client";

import Link from "next/link";
import {
  Receipt,
  Zap,
  FileCheck,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Clock,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import LoginButton from "@/components/LoginButton";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" /> Secure Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column: Indian Fintech Trust & Capabilities (Desktop) */}
          <div className="hidden lg:flex flex-col space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-full w-fit">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                AI GST Return Automation
              </span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              File GST Returns in{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                Under 60 Seconds
              </span>
            </h1>

            <p className="text-sm lg:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
              No manual data entry or Excel headaches. Snap invoice photos or upload PDFs — our AI extracts numbers, verifies GSTINs, and generates portal-ready GSTR-1 & GSTR-3B JSON files.
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
                <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">15,000+</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Invoices Processed</p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">97%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Time Saved on Filing</p>
              </div>
            </div>

            {/* Key Guarantees */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <span>Zero GST portal credentials required — 100% audit-proof</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <span>Official government GSTR-1 & GSTR-3B offline tool JSON</span>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <span>Section 16(2) duplicate invoice detection to prevent penalties</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sleek Login Card */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-7 sm:p-9 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
              <div className="text-center mb-7">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-indigo-500/25">
                  <Receipt className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Welcome to GSTLens
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                  Sign in to access your invoices, returns, and credits
                </p>
              </div>

              {/* Mobile value points */}
              <div className="lg:hidden space-y-2 mb-6 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2 font-medium">
                  <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Instant AI OCR from phone camera
                </p>
                <p className="flex items-center gap-2 font-medium">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  GSTR-1 & GSTR-3B offline JSON
                </p>
              </div>

              {/* Login Button */}
              <div className="space-y-4">
                <LoginButton />

                {user && (
                  <Link
                    href="/dashboard"
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    Go to Dashboard <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {/* Security Badges */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-6 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  256-bit Encrypted
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  No Password Needed
                </span>
              </div>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-6 leading-relaxed">
                By continuing, you agree to our Terms of Service and Privacy Policy. All tax invoices remain private and confidential.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} GSTLens. Built for Indian MSMEs & Tax Professionals.
      </footer>
    </div>
  );
}
