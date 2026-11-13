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
  ScanLine,
  FileCheck2,
  Printer,
  ChevronRight,
  Loader2,
  HelpCircle,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { loginWithGoogle, logout } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";

export default function LoginPage() {
  const { user, loading, isOnline, enterSandboxMode, exitOfflineMode } = useAuth();
  const [isLaunchingSandbox, setIsLaunchingSandbox] = useState(false);
  const router = useRouter();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"invoice" | "ocr" | "returns" | "pos">("invoice");
  const [showFaq, setShowFaq] = useState(false);

  const handleLaunchSandbox = async () => {
    try {
      setIsLaunchingSandbox(true);
      setAuthError(null);
      await enterSandboxMode();
      router.push("/dashboard");
    } catch (err: any) {
      setAuthError(err?.message || "Unable to launch sandbox.");
    } finally {
      setIsLaunchingSandbox(false);
    }
  };

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
      if (user?.isOffline) {
        exitOfflineMode();
      } else {
        await logout();
      }
      router.refresh();
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.08] dark:border-white/[0.08] bg-[#fafaf9]/90 dark:bg-[#141415]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-700 text-white rounded-lg flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                GST<span className="text-emerald-700 dark:text-emerald-400">Lens</span>
              </span>
              <span className="text-xs text-stone-400 font-normal hidden sm:inline">
                Authentication &amp; ledger
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/"
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Product Overview */}
          <div className="lg:col-span-7 flex flex-col space-y-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-normal bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-black/[0.08] dark:border-white/[0.08] w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>GST Rule 46 &amp; Section 170 compliant</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight leading-tight">
                Statutory billing and automated GST returns
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-xl">
                Create compliant tax invoices with NPCI UPI QR codes, capture paper purchase bills with local OCR, and export portal-ready GSTR-1 and GSTR-3B offline tool JSON files.
              </p>
            </div>

            {/* Feature Tabs */}
            <div className="bg-white dark:bg-[#161513] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 border-b border-black/[0.06] dark:border-white/[0.06] pb-2 text-xs font-normal overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("invoice")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeTab === "invoice"
                      ? "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
                >
                  Rule 46 invoice
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("ocr")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeTab === "ocr"
                      ? "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
                >
                  Bill OCR
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("returns")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeTab === "returns"
                      ? "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
                >
                  GSTR-1 &amp; 3B
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pos")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    activeTab === "pos"
                      ? "bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
                >
                  80mm POS
                </button>
              </div>

              {activeTab === "invoice" && (
                <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
                  <p className="font-medium text-stone-900 dark:text-stone-100">Intra-state and inter-state tax split</p>
                  <p className="text-[11px] leading-normal">
                    Automates CGST + SGST vs. IGST calculations, trade discounts, and Section 170 rupee rounding.
                  </p>
                </div>
              )}

              {activeTab === "ocr" && (
                <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
                  <p className="font-medium text-stone-900 dark:text-stone-100">Local purchase bill extraction</p>
                  <p className="text-[11px] leading-normal">
                    Scans vendor GSTIN, invoice dates, HSN codes, and input tax credit lines directly from paper or PDF bills.
                  </p>
                </div>
              )}

              {activeTab === "returns" && (
                <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
                  <p className="font-medium text-stone-900 dark:text-stone-100">Schema-compliant government JSON</p>
                  <p className="text-[11px] leading-normal">
                    Exports official offline tool JSON for direct upload on the GST portal without exposing login credentials.
                  </p>
                </div>
              )}

              {activeTab === "pos" && (
                <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1">
                  <p className="font-medium text-stone-900 dark:text-stone-100">Retail counter thermal printing</p>
                  <p className="text-[11px] leading-normal">
                    Instant 80mm slip generation with shop header, item lines, and dynamic UPI payment QR code.
                  </p>
                </div>
              )}
            </div>

            {/* Practitioner Note */}
            <div className="p-3.5 bg-stone-100/70 dark:bg-[#1a1917] rounded-lg border border-black/[0.06] dark:border-white/[0.06] text-xs">
              <p className="text-stone-600 dark:text-stone-400 leading-normal">
                &ldquo;GSTLens cut our firm&apos;s monthly filing prep from three days to under an hour. GSTR-1 JSON files upload to the GST portal with zero schema errors, and clients love the WhatsApp UPI QR invoices.&rdquo;
              </p>
              <p className="mt-1.5 text-[11px] font-medium text-stone-800 dark:text-stone-200">
                — CA Rajesh K. Sharma, FCA, Senior Tax Practitioner
              </p>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-5 w-full max-w-sm mx-auto">
            <div className="bg-white dark:bg-[#161513] rounded-xl p-6 border border-black/[0.08] dark:border-white/[0.08] shadow-sm space-y-4">
              
              {/* Card Header */}
              <div className="text-center">
                <div className="w-10 h-10 bg-emerald-700 text-white rounded-lg flex items-center justify-center mx-auto mb-2.5">
                  <Receipt className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  {user ? "Session authenticated" : "Sign in to GSTLens"}
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {user
                    ? "Your session is authenticated and ready"
                    : "Access your cloud invoices, GSTR returns, and ledgers"}
                </p>
              </div>

              {/* Error Alert */}
              {authError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-[11px]">{authError}</p>
                </div>
              )}

              {/* Authenticated State */}
              {user ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-stone-50 dark:bg-[#1f1d1a] border border-black/[0.06] dark:border-white/[0.06] flex items-center gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-xs text-stone-900 dark:text-stone-100 truncate">
                        {user.displayName || "User"}
                      </p>
                      <p className="text-[11px] text-stone-500 font-mono truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/dashboard"
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>Open dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full py-2 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-normal text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-[#1f1d1a] transition cursor-pointer"
                  >
                    Sign out / switch account
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {!isOnline && (
                    <div className="p-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-black/[0.08] dark:border-white/[0.08] text-xs text-stone-700 dark:text-stone-300 flex items-start gap-2">
                      <WifiOff className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                      <p className="text-[11px]">
                        Offline mode active. All records are saved locally to this device.
                      </p>
                    </div>
                  )}

                  {/* Google Sign-in */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn || loading || !isOnline}
                    className="w-full py-2.5 px-3 rounded-lg bg-white dark:bg-[#1a1917] hover:bg-stone-50 dark:hover:bg-[#23211e] border border-black/[0.12] dark:border-white/[0.12] text-stone-800 dark:text-stone-200 font-medium text-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting with Google...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      </>
                    )}
                  </button>

                  {/* Sandbox Guest Option */}
                  <button
                    type="button"
                    onClick={handleLaunchSandbox}
                    disabled={isLaunchingSandbox || isSigningIn}
                    className="w-full py-2.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {isLaunchingSandbox ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Launching sandbox...</span>
                      </>
                    ) : (
                      <>
                        <span>Try live sandbox (zero signup)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Security Points */}
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>No GST portal passwords required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>Local client-side JSON generation</span>
                </div>
              </div>

              {/* FAQ Accordion */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowFaq(!showFaq)}
                  className="w-full flex items-center justify-between text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Frequently asked questions</span>
                  </span>
                  <span className="text-[10px] text-stone-400">{showFaq ? "Hide" : "Show"}</span>
                </button>

                {showFaq && (
                  <div className="mt-2 space-y-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    <div className="p-2 bg-stone-50 dark:bg-[#1a1917] rounded">
                      <p className="font-medium text-stone-800 dark:text-stone-200">Do I need a GSTIN to start?</p>
                      <p className="mt-0.5">No, you can generate Bill of Supply, estimates, and retail cash memos without a GSTIN.</p>
                    </div>
                    <div className="p-2 bg-stone-50 dark:bg-[#1a1917] rounded">
                      <p className="font-medium text-stone-800 dark:text-stone-200">How does GSTR-1 export work?</p>
                      <p className="mt-0.5">GSTLens generates an official JSON file adhering to the GSTN offline tool schema for direct upload on gst.gov.in.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-black/[0.08] dark:border-white/[0.08] py-3.5 px-4 bg-white dark:bg-[#12110f] text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <p>© {new Date().getFullYear()} GSTLens. Compliant with CGST Rules 2017 &amp; Section 170.</p>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-stone-900 dark:hover:text-stone-100">Home</Link>
            <Link href="/terms" className="hover:text-stone-900 dark:hover:text-stone-100">Terms</Link>
            <Link href="/privacy" className="hover:text-stone-900 dark:hover:text-stone-100">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
