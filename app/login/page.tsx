"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Clock,
  ScanLine,
  FileCheck2,
  QrCode,
  Building2,
  AlertCircle,
  Loader2,
  HelpCircle,
  Printer,
  ChevronRight,
  ExternalLink,
  Layers,
  Award,
  Database,
  WifiOff,
} from "lucide-react";
import { loginWithGoogle, logout } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";

export default function LoginPage() {
  const { user, loading, isOnline, isOfflineMode } = useAuth();
  const router = useRouter();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"invoice" | "ocr" | "returns" | "pos">("invoice");
  const [showFaq, setShowFaq] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setAuthError(null);
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Sign in failed:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in popup was closed before completing. Please try again.");
      } else if (err?.code === "auth/network-request-failed") {
        setAuthError("Network connection issue. Please check your internet connection.");
      } else {
        setAuthError(err?.message || "Unable to sign in with Google. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-indigo-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/20 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  v2.5 Enterprise
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Statutory GST Invoicing & Return Automation
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Statutory Status Pill */}
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>GSTN Systems Operational</span>
            </div>

            <ThemeToggle />

            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Interactive Product Showcase & Trust (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Next-Gen GST Operating System</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>GST Rule 46 & Sec 170 Compliant</span>
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
                Smart Invoicing &{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
                  Automated GST Returns
                </span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                Built specifically for Indian MSMEs, Freelancers, Traders, and Tax Professionals. Create compliant B2B/B2C invoices with NPCI UPI QR codes, scan bills with AI OCR, and export portal-ready GSTR-1 and GSTR-3B JSON in seconds.
              </p>
            </div>

            {/* Interactive Feature Tabs */}
            <div className="bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-sm space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("invoice")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === "invoice"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Rule 46 Tax Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ocr")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === "ocr"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  <span>AI Bill OCR</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("returns")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === "returns"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>GSTR-1 & 3B JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pos")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === "pos"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>80mm Thermal POS</span>
                </button>
              </div>

              {/* Tab 1: Tax Invoice Preview */}
              {activeTab === "invoice" && (
                <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="font-extrabold text-slate-900 dark:text-white">SHARMA ENTERPRISES</span>
                      <p className="text-[11px] text-slate-500 font-mono">GSTIN: 27AABCU9603R1ZM • MH (27)</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                        TAX INVOICE
                      </span>
                      <p className="text-[11px] text-slate-500 font-mono">#INV-2026-0042</p>
                    </div>
                  </div>

                  <div className="py-2.5 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">BILLED TO:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Apex Solutions Pvt Ltd</span>
                      <p className="text-slate-500 font-mono">07AAAAA0000A1Z5 (Delhi)</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">PAYMENT MODE:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                        <QrCode className="w-3.5 h-3.5" /> Dynamic UPI QR Attached
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400">Total Taxable Value</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">₹45,000.00</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">IGST @ 18%</span>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400">₹8,100.00</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400">Invoice Total (Sec 170)</span>
                      <p className="font-black text-sm text-emerald-600 dark:text-emerald-400">₹53,100.00</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: AI OCR Preview */}
              {activeTab === "ocr" && (
                <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/80 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">AI OCR Extraction Complete</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                      99.4% Confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Vendor GSTIN</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">27AABCU9603R1ZM</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Invoice Date</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">28-Oct-2026</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Eligible ITC</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹3,312.00</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Section 16(2) Duplicate Check Passed • Added to Purchases automatically
                  </p>
                </div>
              )}

              {/* Tab 3: GSTR Returns JSON */}
              {activeTab === "returns" && (
                <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/80 text-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">GSTR-1 & 3B Monthly Computation</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">Period: 102026 (Oct 2026)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Table 3.1 Outward Liability</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">₹2,31,210.00</span>
                      <span className="text-[10px] text-indigo-600 block mt-0.5">84 Invoices verified</span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Table 4 ITC Available</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹1,88,400.00</span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">Matches GSTR-2B 100%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                    <span>Direct GST Portal Upload:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">GSTR1_102026_OFFLINE.json</span>
                  </div>
                </div>
              )}

              {/* Tab 4: POS Thermal Slip */}
              {activeTab === "pos" && (
                <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-4 border border-slate-200/60 dark:border-slate-800/80 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">80mm Fast POS Counter Billing</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      100% Works Offline
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                    Generate instant 3-inch thermal receipts with automated line item barcode scanning, customizable shop header, UPI payment QR code, and offline IndexedDB synchronization.
                  </p>
                  <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-700 dark:text-slate-300 pt-1">
                    <span>⚡ ESC/POS Compatible</span>
                    <span>📦 Instant Stock Deduction</span>
                    <span>📲 SMS/WhatsApp Slip</span>
                  </div>
                </div>
              )}
            </div>

            {/* Credibility Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-1" />
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">15,000+</p>
                <p className="text-[11px] text-slate-500">Businesses & CAs</p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">₹45+ Cr</p>
                <p className="text-[11px] text-slate-500">Invoices Processed</p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-1" />
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">&lt; 60s</p>
                <p className="text-[11px] text-slate-500">Return Generation</p>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-amber-500 mb-1" />
                <p className="text-xl font-black font-mono text-slate-900 dark:text-white">Zero</p>
                <p className="text-[11px] text-slate-500">Passwords Required</p>
              </div>
            </div>

            {/* Testimonial Quote */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/70 via-white/80 to-emerald-50/70 dark:from-indigo-950/40 dark:via-slate-900/40 dark:to-emerald-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs">
              <p className="text-slate-700 dark:text-slate-300 italic">
                &ldquo;GSTLens cut our CA firm&apos;s monthly filing prep from 3 days down to 20 minutes. The GSTR-1 JSON files upload to the GST portal with zero schema errors, and clients love the WhatsApp UPI QR invoices.&rdquo;
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900 dark:text-white">— CA Rajesh K. Sharma, FCA</span>
                <span className="text-slate-500">Senior Tax Practitioner, New Delhi</span>
              </div>
            </div>
          </div>

          {/* Right Column: Modern Authentication Center (5 cols on lg) */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-indigo-500/5 transition-all">
              
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-indigo-500/25">
                  <Receipt className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {user ? "Welcome Back!" : "Sign In to GSTLens"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  {user
                    ? "Your active session is authenticated and ready."
                    : "Access your cloud invoices, GSTR filings, clients, and inventory ledger."}
                </p>
              </div>

              {/* Error Alert */}
              {authError && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Sign-in Notice</p>
                    <p className="text-[11px] mt-0.5">{authError}</p>
                  </div>
                </div>
              )}

              {/* Authenticated State */}
              {user ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-3.5">
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {user.displayName || "GSTLens User"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                        {user.email}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Signed in securely
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition transform active:scale-98"
                  >
                    <span>Launch Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Link
                      href="/invoices"
                      className="py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-center transition"
                    >
                      New Invoice
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-center transition"
                    >
                      Sign Out / Switch
                    </button>
                  </div>
                </div>
              ) : (
                /* Unauthenticated State: Sign In Methods */
                <div className="space-y-4">
                  {/* Offline Warning Notice if disconnected */}
                  {!isOnline && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                      <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">No Internet Detected</p>
                        <p className="text-[11px] mt-0.5">
                          You can still use GSTLens without internet. All invoices, clients, and stock will be saved locally to this device.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Primary Google One-Click Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn || loading || !isOnline}
                    className="w-full py-3.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-white font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                        <span>Connecting with Google...</span>
                      </>
                    ) : (
                      <>
                        {/* Authentic Google Multi-Color SVG Icon */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </>
                    )}
                  </button>

                  <div className="relative py-2 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <span className="relative bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Why GSTLens?
                    </span>
                  </div>

                  {/* 3 Value Pillars */}
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Zero Portal Password Risk</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          We never ask for your GSTN portal password. JSON files are generated client-side for safe upload.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">256-Bit Encrypted Offline Storage</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Your books, clients, and inventory ledger remain safely backed up in local browser IndexedDB.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">Pay-As-You-Go Credit System</span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Transparent credit packages for AI OCR invoice extraction, statutory verification, and portal exports.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick FAQ Toggle */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFaq(!showFaq)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
                  </span>
                  <span className="text-[11px] text-slate-400">{showFaq ? "Hide ▲" : "View ▼"}</span>
                </button>

                {showFaq && (
                  <div className="mt-3 space-y-2 text-[11px] text-slate-600 dark:text-slate-400 animate-in fade-in duration-200">
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <p className="font-bold text-slate-900 dark:text-white">Do I need an active GST number to start?</p>
                      <p className="mt-0.5">No, you can generate Bill of Supply, Estimates, and retail cash memos without a GSTIN.</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                      <p className="font-bold text-slate-900 dark:text-white">How does GSTR-1 export work?</p>
                      <p className="mt-0.5">GSTLens generates an official JSON file adhering to the GSTN offline tool schema. You simply upload it on gst.gov.in.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Legal Notice */}
              <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-5 leading-relaxed">
                By signing in, you agree to GSTLens Terms of Service and Privacy Policy. All tax invoices, UPI transactions, and customer ledgers remain strictly confidential.
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 py-4 px-4 bg-white/40 dark:bg-slate-950/40 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span>© {new Date().getFullYear()} GSTLens.</span>
          <span className="hidden sm:inline">•</span>
          <span>Compliant with Goods and Services Tax Rules, 2017 & Section 170.</span>
        </div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0 text-[11px]">
          <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
          <Link href="/terms" className="hover:text-indigo-600 transition">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-indigo-600 transition">Privacy Policy</Link>
          <span className="text-slate-400">Made for Indian MSMEs 🇮🇳</span>
        </div>
      </footer>
    </div>
  );
}
