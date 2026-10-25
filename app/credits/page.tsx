"use client";

import { useAuth } from "@/context/AuthContext";
import {
  Coins,
  Zap,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Cloud,
  Infinity,
  BadgeCheck,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sliders,
  Clock,
  Lock,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Check,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { authFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { formatINR } from "@/lib/currency";
import { UPDATE_CREDIT_EVENT } from "@/lib/constants";
import toast from "react-hot-toast";

export default function CreditsPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  const [selectedPackIndex, setSelectedPackIndex] = useState<number>(1); // Default to 150 credits
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Estimator State (Fintech ROI Calculator)
  const [estimatedBills, setEstimatedBills] = useState<number>(150);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse text-indigo-600 dark:text-indigo-400">
            <Coins className="w-8 h-8" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading your credits & billing...</p>
        </div>
      </div>
    );
  }

  const credits = userProfile?.credits ?? 0;
  const hasSubscription = userProfile?.subscription?.active ?? false;
  const isCancelRequested = Boolean(
    userProfile?.subscription?.cancel_requested ||
    userProfile?.subscription?.cancel_at_period_end
  );

  const renewalDate = userProfile?.subscription?.current_period_end
    ? new Date(userProfile.subscription.current_period_end * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Credit Packs Matrix
  const creditPacks = [
    {
      credits: 50,
      priceRupees: 100,
      perInvoice: "₹2.00 / invoice",
      tier: "Starter",
      save: null,
      popular: false,
    },
    {
      credits: 150,
      priceRupees: 250,
      perInvoice: "₹1.67 / invoice",
      tier: "Growth",
      save: "Save 16%",
      popular: true,
    },
    {
      credits: 350,
      priceRupees: 500,
      perInvoice: "₹1.43 / invoice",
      tier: "Enterprise",
      save: "Save 28% • Best Value",
      popular: false,
    },
  ];

  // Helper to load Razorpay SDK dynamically
  const loadRazorpay = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve((window as any).Razorpay);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve((window as any).Razorpay);
      script.onerror = () => reject(new Error("Razorpay failed to load"));
      document.body.appendChild(script);
    });
  };

  // Buy one-time credit pack
  const buyCredits = async (creditAmount: number) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await authFetch("/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: creditAmount }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to create order");
      }

      const data = await response.json();
      const Razorpay = await loadRazorpay();

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: "INR",
        order_id: data.order_id,
        name: "GSTLens",
        description: `Buy ${creditAmount} credits (GST Included)`,
        image: "/logo.png",
        handler: () => {
          toast.success(`Success! Added ${creditAmount} credits to your account.`, {
            icon: "🎉",
          });
          window.dispatchEvent(new Event(UPDATE_CREDIT_EVENT));
          setTimeout(() => window.location.reload(), 800);
        },
        prefill: {
          email: userProfile?.email || "",
          name: userProfile?.name || userProfile?.displayName || "",
        },
        theme: { color: "#4f46e5" },
        modal: { ondismiss: () => setIsProcessing(false) },
      };

      new Razorpay(options).open();
    } catch (error: any) {
      console.error("Credit purchase error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  // Subscribe to Pro monthly plan
  const subscribeToPlan = async () => {
    if (isProcessing) return;
    if (hasSubscription && !isCancelRequested) return;
    setIsProcessing(true);

    try {
      const response = await authFetch("/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly" }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to create subscription");
      }

      const data = await response.json();
      toast.success("Redirecting to secure Razorpay checkout...");
      window.location.href = data.short_url;
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to start subscription. Please try again.");
      setIsProcessing(false);
    }
  };

  // Restart cancelled subscription
  const restartSubscription = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await authFetch("/payments/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "monthly" }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to restart subscription");
      }

      const data = await response.json();
      toast.success("Connecting to Razorpay to restart your subscription...");
      window.location.href = data.short_url;
    } catch (error: any) {
      console.error("Restart subscription error:", error);
      toast.error(error.message || "Failed to restart subscription. Please try again.");
      setIsProcessing(false);
    }
  };

  // Cancel subscription request
  const cancelSubscription = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await authFetch("/payments/cancel-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to cancel");
      }

      toast.success(
        "Subscription cancellation scheduled. You retain full Pro access until the cycle ends.",
        { duration: 4000 }
      );
      window.dispatchEvent(new Event(UPDATE_CREDIT_EVENT));
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription.");
      setIsProcessing(false);
    } finally {
      setShowCancelModal(false);
    }
  };

  // Sync live subscription state directly with Razorpay
  const syncSubscription = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const response = await authFetch("/payments/sync-subscription", {
        method: "POST",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to sync status");
      }

      const data = await response.json();
      if (data.active) {
        toast.success("Subscription verified as active with Razorpay!");
      } else {
        toast.error(
          `Razorpay status: ${data.razorpay_status || "inactive"}. Subscription updated.`
        );
      }

      window.dispatchEvent(new Event(UPDATE_CREDIT_EVENT));
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(error.message || "Failed to sync subscription status.");
      setIsProcessing(false);
    }
  };

  // Estimator Calculations
  const hoursSaved = Math.round((estimatedBills * 3) / 60);
  const manualEntryCost = estimatedBills * 15; // standard Indian B2B data-entry cost ~₹15/bill
  const bestOption =
    estimatedBills >= 100
      ? {
          name: "Pro Monthly Subscription",
          cost: 499,
          reason: "Includes 100 credits/mo + Continuous multi-device Cloud Backup",
        }
      : {
          name: "50 or 150 Credits Pack",
          cost: estimatedBills <= 50 ? 100 : 250,
          reason: "Pay-as-you-go with zero expiration",
        };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24 md:pb-16">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition flex items-center gap-1.5 font-medium text-xs sm:text-sm"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight">Credits & Billing</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Manage invoice extraction fuel & subscription
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Tax Deductible
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* 1. Dynamic Balance & Health Hero */}
        <div
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl transition-all ${
            credits === 0
              ? "bg-gradient-to-br from-rose-700 via-rose-800 to-slate-950 border border-rose-500/30 shadow-rose-900/20"
              : credits < 15
              ? "bg-gradient-to-br from-amber-600 via-amber-700 to-slate-950 border border-amber-500/30 shadow-amber-900/20"
              : "bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-950 border border-indigo-500/30 shadow-indigo-900/20"
          }`}
        >
          {/* Subtle geometric background glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-xs uppercase tracking-wider font-bold">
                  Available Fuel Balance
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    credits === 0
                      ? "bg-rose-950/80 text-rose-200 border border-rose-500/50"
                      : credits < 15
                      ? "bg-amber-950/80 text-amber-200 border border-amber-500/50"
                      : "bg-emerald-950/80 text-emerald-200 border border-emerald-500/50"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      credits === 0
                        ? "bg-rose-400 animate-pulse"
                        : credits < 15
                        ? "bg-amber-400 animate-pulse"
                        : "bg-emerald-400"
                    }`}
                  />
                  {credits === 0
                    ? "Action Required • Depleted"
                    : credits < 15
                    ? "Low Fuel • Top-up Advised"
                    : "Optimal Health"}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-5xl sm:text-6xl font-black font-mono tabular-nums tracking-tight">
                  {credits}
                </span>
                <span className="text-base sm:text-lg font-medium text-white/80">
                  credits remaining
                </span>
              </div>

              <p className="text-xs sm:text-sm text-white/90 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span>
                  <strong>1 credit = 1 invoice extracted</strong> • Previews, edits, GSTR-1, GSTR-3B & Tally XML exports are <strong>100% free</strong>
                </span>
              </p>
            </div>

            {/* Quick Action Top-up Anchor */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href="#packs"
                className="py-3 px-5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs sm:text-sm shadow-md transition text-center flex items-center justify-center gap-2 active:scale-98"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Refill Credits Now
              </a>
            </div>
          </div>
        </div>

        {/* 2. Pro Monthly Subscription Section (3 Lifecycle States) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Pro Monthly Subscription
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated monthly refill with multi-device cloud backup & continuous synchronization
              </p>
            </div>
            {hasSubscription && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {renewalDate ? `Renews on: ${renewalDate}` : "Active Auto-Refill"}
              </span>
            )}
          </div>

          <div
            className={`relative rounded-3xl p-6 sm:p-8 shadow-sm border transition-all ${
              hasSubscription
                ? isCancelRequested
                  ? "border-amber-400/80 bg-amber-50/30 dark:bg-amber-950/20"
                  : "border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20"
                : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            {/* Status Floating Pill */}
            {hasSubscription && (
              <div
                className={`absolute -top-3.5 left-6 px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm text-white ${
                  isCancelRequested ? "bg-amber-500" : "bg-emerald-600"
                }`}
              >
                {isCancelRequested ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" /> CANCELLATION PENDING
                  </>
                ) : (
                  <>
                    <BadgeCheck className="w-3.5 h-3.5" /> ACTIVE PRO SUBSCRIBER
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Pro Monthly Plan
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                        ₹499
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        / month (₹4.99 per invoice + Cloud Storage)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cancellation Pending Notification */}
                {isCancelRequested && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cancellation in progress</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                        Your cancellation request has been registered with Razorpay. Full Pro features remain active until{" "}
                        <strong>{renewalDate || "the end of your current cycle"}</strong>. No further bank auto-debits will occur. Click <strong>Restart Subscription</strong> anytime to resume uninterrupted monthly credits.
                      </p>
                    </div>
                  </div>
                )}

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span><strong>100 fresh credits</strong> auto-refilled every 30 days</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Continuous cloud backup & seamless synchronization across PC & mobile</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Priority WhatsApp compliance & prompt technical assistance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Infinity className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span>Zero lock-in: Cancel mandate directly from app or UPI anytime</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons Column */}
              <div className="flex flex-col justify-center sm:min-w-[220px] gap-2.5">
                {hasSubscription ? (
                  isCancelRequested ? (
                    <>
                      <button
                        onClick={restartSubscription}
                        disabled={isProcessing}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98 transition min-h-[44px] disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {isProcessing ? "Connecting to Razorpay..." : "Restart Subscription"}
                      </button>
                      <button
                        onClick={syncSubscription}
                        disabled={isProcessing}
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 min-h-[36px] disabled:opacity-50"
                        title="Fetch live subscription status directly from Razorpay"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
                        Sync Status with Razorpay
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-center">
                        <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                          Status: Active Plan
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {renewalDate ? `Next cycle: ${renewalDate}` : "Auto-renews monthly"}
                        </p>
                      </div>

                      <button
                        onClick={syncSubscription}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 min-h-[38px] disabled:opacity-50"
                        title="Fetch live subscription status directly from Razorpay"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
                        Sync Status with Razorpay
                      </button>

                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="w-full py-2 text-rose-600 dark:text-rose-400 font-semibold text-xs hover:underline transition text-center"
                      >
                        Cancel Auto-Renew
                      </button>
                    </>
                  )
                ) : (
                  <button
                    onClick={subscribeToPlan}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 active:scale-98 transition min-h-[44px] disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isProcessing ? "Connecting..." : "Subscribe to Pro (₹499/mo)"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Interactive Volume & ROI Estimator (Fintech UX Feature) */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Monthly Volume & ROI Estimator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calculate your monthly invoice requirement and estimated time saved
              </p>
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[50, 100, 150, 350, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setEstimatedBills(val)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                    estimatedBills === val
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {val} bills
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min={25}
              max={500}
              step={25}
              value={estimatedBills}
              onChange={(e) => setEstimatedBills(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>25 invoices / mo</span>
              <span>250 invoices</span>
              <span>500+ invoices / mo</span>
            </div>
          </div>

          {/* ROI Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Manual Hours Saved
              </span>
              <p className="text-2xl font-black text-indigo-950 dark:text-indigo-200 font-mono mt-1">
                ~{hoursSaved} Hours / mo
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Based on 3 mins / manual entry
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Data Entry Cost Saved
              </span>
              <p className="text-2xl font-black text-emerald-950 dark:text-emerald-200 font-mono mt-1">
                {formatINR(manualEntryCost)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Vs traditional ₹15 / entry cost
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Recommended Choice
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                  {bestOption.name}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {bestOption.reason}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. One-Time Credit Packs (Bento Grid) */}
        <section id="packs" className="space-y-4 scroll-mt-24">
          <div className="text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Pay-As-You-Go Credit Packs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              One-time purchase • Zero recurring commitments • Credits never expire
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {creditPacks.map((pack, idx) => {
              const isSelected = selectedPackIndex === idx;
              return (
                <div
                  key={pack.credits}
                  onClick={() => setSelectedPackIndex(idx)}
                  className={`relative rounded-3xl p-6 sm:p-7 border cursor-pointer transition-all ${
                    pack.popular
                      ? "border-indigo-600 dark:border-indigo-500 bg-gradient-to-b from-indigo-50/40 to-white dark:from-indigo-950/30 dark:to-slate-900 shadow-md ring-2 ring-indigo-500/20"
                      : isSelected
                      ? "border-indigo-500 dark:border-indigo-400 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-indigo-500/20"
                      : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Floating Badges */}
                  {pack.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs">
                      Most Popular
                    </div>
                  )}
                  {pack.save && !pack.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs">
                      {pack.save}
                    </div>
                  )}

                  <div className="text-center">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {pack.tier}
                    </span>

                    <h4 className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-2">
                      {pack.credits}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                      Credits
                    </p>

                    <div className="mt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                        ₹{pack.priceRupees}
                      </p>
                      <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 tabular-nums">
                        {pack.perInvoice}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        GST Included • ITC Claimable
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        buyCredits(pack.credits);
                      }}
                      disabled={isProcessing}
                      className={`mt-4 w-full py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[44px] active:scale-98 ${
                        isProcessing
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                          : pack.popular
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                          : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      {isProcessing ? "Processing..." : `Buy ${pack.credits} Credits`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. B2B Trust, Security & Regulatory Matrix */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Fintech Security & Statutory Assurance
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                RBI e-Mandate Compliant
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Full adherence to RBI recurring guidelines with 24-hr pre-debit notifications.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                256-Bit TLS Encryption
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Razorpay PCI-DSS Level 1 certified gateway with bank-grade encryption.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                18% GST Input Credit
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                B2B GST invoice provided automatically to claim full tax deduction.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                Zero Lock-In Freedom
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Cancel or modify mandate anytime directly from dashboard or any UPI app.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Interactive FAQ Accordion */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Frequently Asked Questions
          </h2>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {[
              {
                q: "Do purchased one-time credits ever expire?",
                a: "No! All credits purchased via one-time packs never expire and roll over indefinitely. You can use them whenever you need.",
              },
              {
                q: "What happens to my cloud invoices if I cancel the Pro subscription?",
                a: "Your uploaded invoices, GSTR-1 summaries, and Tally exports remain 100% safe and accessible in read-only and local export modes. You will not lose any historical business data.",
              },
              {
                q: "How exactly do credits deduct?",
                a: "Exactly 1 credit is deducted per successful AI invoice scan. Corrections, manual edits, previewing drafts, JSON return downloads, GSTR-3B generation, and Tally XML exports are completely free of charge.",
              },
              {
                q: "Can my business claim GST Input Tax Credit (ITC) on these charges?",
                a: "Yes! All purchases include 18% GST and generate a statutory tax invoice under Section 16 of the CGST Act. Provide your GSTIN in your profile to claim full ITC on your monthly return.",
              },
            ].map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div key={idx} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed pl-1">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Cancel Pro Subscription?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Recurring auto-refill will be paused
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              You will retain multi-device cloud sync and all your remaining monthly credits until{" "}
              <strong>{renewalDate || "the end of your current billing period"}</strong>. After that, your account will switch to pay-as-you-go credits. You can restart anytime.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition min-h-[44px]"
              >
                Keep Plan
              </button>
              <button
                onClick={cancelSubscription}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-xs sm:text-sm hover:bg-rose-700 transition min-h-[44px] disabled:opacity-50"
              >
                {isProcessing ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
