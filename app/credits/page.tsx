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

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#141415]">
        <div className="text-center">
          <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center mx-auto mb-3 text-[#047857] dark:text-emerald-400">
            <Coins className="w-8 h-8" />
          </div>
          <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">Loading your credits & billing...</p>
        </div>
      </div>
    );
  }

  const credits = userProfile?.credits ?? 0;
  const sub = userProfile?.subscription;
  const upcomingSub = userProfile?.upcoming_subscription;
  const hasSubscription = sub?.active ?? false;
  const hasUpcoming = Boolean(upcomingSub?.active);
  const isCustomPlan = Boolean(hasSubscription && sub?.is_custom);

  // Resilient check for unlimited scans across root, active sub, and upcoming sub
  const isUnlimited = Boolean(
    userProfile?.unlimited_credits === true ||
    userProfile?.unlimited_credits === "true" ||
    sub?.unlimited_credits === true ||
    sub?.unlimited_credits === "true" ||
    upcomingSub?.unlimited_credits === true ||
    upcomingSub?.unlimited_credits === "true" ||
    sub?.plan?.toLowerCase().includes("unlimited") ||
    upcomingSub?.plan?.toLowerCase().includes("unlimited")
  );

  const isCancelRequested = Boolean(
    sub?.cancel_requested ||
    sub?.cancel_at_period_end
  );

  const renewalDate = sub?.current_period_end
    ? new Date(sub.current_period_end * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const upcomingStartDate = upcomingSub?.starts_at
    ? new Date(upcomingSub.starts_at * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : renewalDate;

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
          toast.success(`Success! Added ${creditAmount} credits to your account.`);
          window.dispatchEvent(new Event(UPDATE_CREDIT_EVENT));
          setTimeout(() => window.location.reload(), 800);
        },
        prefill: {
          email: userProfile?.email || "",
          name: userProfile?.name || userProfile?.displayName || "",
        },
        theme: { color: "#047857" },
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

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 transition-colors pb-24 md:pb-16">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#141415]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center gap-1.5 font-medium text-xs sm:text-sm"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-px h-5 bg-stone-200 dark:bg-stone-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#047857] text-white flex items-center justify-center font-medium">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold tracking-tight">Credits & Billing</h1>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  Manage credits and subscription
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-mono text-xs">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Tax Deductible
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* 1. Account Balance Card */}
        <div className="bg-white dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Account Balance
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300">
                  {isUnlimited
                    ? "Enterprise Unlimited"
                    : hasSubscription
                    ? "Pro Active"
                    : "Free Tier"}
                </span>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                  {isUnlimited ? "∞" : credits}
                </span>
                <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  {isUnlimited ? "unlimited scans unlocked" : credits === 1 ? "credit remaining" : "credits remaining"}
                </span>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400">
                1 credit = 1 invoice scanned. Data export, reports, and edits are always free.
              </p>
            </div>

            {!isUnlimited && (
              <div className="flex items-center">
                <a
                  href="#packs"
                  className="py-2.5 px-4 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-medium text-xs shadow-xs transition inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Recharge Credits</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* 2. Pro Monthly Subscription or Custom Partner Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                {isCustomPlan ? (
                  <>
                    <Sparkles className="w-5 h-5 text-[#047857] dark:text-emerald-400" />
                    Custom Partner Tier
                  </>
                ) : (
                  <>
                    <Cloud className="w-5 h-5 text-[#047857] dark:text-emerald-400" />
                    Pro Monthly Subscription
                  </>
                )}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {isCustomPlan
                  ? "Exclusive negotiated plan with customized quota, cloud sync, and priority compliance."
                  : "Automated monthly refill with multi-device cloud backup & continuous synchronization"}
              </p>
            </div>
            {hasSubscription && (
              <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                {renewalDate ? `Valid until: ${renewalDate}` : "Active Auto-Refill"}
              </span>
            )}
          </div>

          {isCustomPlan ? (
            /* Custom Plan Display */
            <div className="bg-white dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 shadow-xs relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4 max-w-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[#047857] dark:text-emerald-400 flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                          {sub?.plan || "Custom Partner Suite"}
                        </h3>
                        <span className="bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Custom Deal
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        {sub?.deal_amount ? (
                          <span className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                            ₹{sub.deal_amount}
                          </span>
                        ) : null}
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          ({sub?.billing_cycle || "Custom Agreement"})
                        </span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>
                        {isUnlimited ? (
                          <strong>Unlimited AI OCR Invoices (Zero per-scan deductions)</strong>
                        ) : (
                          <>Custom quota allocated: <strong>{credits} credits remaining</strong></>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Full multi-device cloud synchronization &amp; Firestore backup active</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Dedicated direct compliance support from GSTLens team</span>
                    </li>
                    {sub?.notes && (
                      <li className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-stone-200/80 dark:border-stone-800 text-[11px] text-slate-600 dark:text-slate-400 italic">
                        &quot;{sub.notes}&quot;
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-col justify-center sm:min-w-[200px] gap-2.5">
                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/80 dark:border-stone-800 text-center space-y-0.5">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Status: Active Deal
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      {renewalDate ? `Valid until: ${renewalDate}` : "Active Partnership"}
                    </p>
                  </div>

                  <a
                    href="https://wa.me/919999999999?text=Hi%20GSTLens%2C%20I%20would%20like%20to%20discuss%20my%20Custom%20Plan"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    Contact Account Executive
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Razorpay Card */
            <div className="bg-white dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 shadow-xs relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4 max-w-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[#047857] dark:text-emerald-400 flex-shrink-0">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                          Pro Monthly Plan
                        </h3>
                        {hasSubscription && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              isCancelRequested
                                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                                : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                            }`}
                          >
                            {isCancelRequested ? "Cancellation Pending" : "Active"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                          ₹499
                        </span>
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          / month (Includes 100 credits + Cloud Sync)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Pending Notification */}
                  {isCancelRequested && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Cancellation in progress</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                          Your cancellation request has been registered with Razorpay. Full Pro features remain active until{" "}
                          <strong>{renewalDate || "the end of your current cycle"}</strong>. No further auto-debits will occur. Click <strong>Restart Subscription</strong> anytime to resume.
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
                      <span>Continuous cloud backup &amp; seamless synchronization across PC &amp; mobile</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>Priority compliance &amp; prompt technical assistance</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Infinity className="w-4 h-4 text-stone-500 dark:text-stone-400 flex-shrink-0" />
                      <span>Zero lock-in: Cancel mandate directly from app or UPI anytime</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons Column */}
                <div className="flex flex-col justify-center sm:min-w-[200px] gap-2">
                  {hasSubscription ? (
                    isCancelRequested ? (
                      <>
                        <button
                          onClick={restartSubscription}
                          disabled={isProcessing}
                          className="w-full py-2.5 px-4 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-medium text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {isProcessing ? "Connecting..." : "Restart Subscription"}
                        </button>
                        <button
                          onClick={syncSubscription}
                          disabled={isProcessing}
                          className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          title="Fetch live subscription status directly from Razorpay"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
                          Sync Status
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/80 dark:border-stone-800 text-center">
                          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Status: Active Plan
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                            {renewalDate ? `Next cycle: ${renewalDate}` : "Auto-renews monthly"}
                          </p>
                        </div>

                        <button
                          onClick={syncSubscription}
                          disabled={isProcessing}
                          className="w-full py-2 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          title="Fetch live subscription status directly from Razorpay"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
                          Sync Status
                        </button>

                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="w-full py-1.5 text-rose-600 dark:text-rose-400 font-medium text-xs hover:underline transition text-center"
                        >
                          Cancel Auto-Renew
                        </button>
                      </>
                    )
                  ) : (
                    <button
                      onClick={subscribeToPlan}
                      disabled={isProcessing}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-medium text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CreditCard className="w-4 h-4" />
                      {isProcessing ? "Connecting..." : "Subscribe to Pro (₹499/mo)"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming / Queued Subscription Card */}
          {hasUpcoming && upcomingSub && (
            <div className="bg-white dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 shadow-xs mt-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[#047857] dark:text-emerald-400 flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                          {upcomingSub.plan || "Custom Upcoming Plan"}
                        </h3>
                        <span className="bg-stone-100 dark:bg-stone-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                          Upcoming
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        {upcomingSub.deal_amount ? (
                          <span className="text-xl font-bold text-stone-900 dark:text-stone-100 font-mono">
                            ₹{upcomingSub.deal_amount}
                          </span>
                        ) : null}
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          ({upcomingSub.billing_cycle || "Custom"}) • {upcomingSub.duration_days} days
                        </span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span>
                        Scheduled to seamlessly activate on <strong>{upcomingStartDate || "end of current cycle"}</strong>
                      </span>
                    </li>
                    {upcomingSub.unlimited_credits && (
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#047857] dark:text-emerald-400 flex-shrink-0" />
                        <span>
                          <strong>VIP Access:</strong> Unlimited AI scans active now
                        </span>
                      </li>
                    )}
                    {upcomingSub.notes && (
                      <li className="text-[11px] text-stone-500 dark:text-stone-400 italic">
                        &quot;{upcomingSub.notes}&quot;
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-col justify-center sm:min-w-[180px] text-center p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/80 dark:border-stone-800 space-y-0.5">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Queued
                  </span>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Activates {upcomingStartDate}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 3. One-Time Credit Packs */}
        <section id="packs" className="space-y-4 scroll-mt-24">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
              Pay-As-You-Go Credit Packs
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              One-time purchase • No recurring charges • Credits never expire
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {creditPacks.map((pack, idx) => {
              const isSelected = selectedPackIndex === idx;
              return (
                <div
                  key={pack.credits}
                  onClick={() => setSelectedPackIndex(idx)}
                  className={`bg-white dark:bg-[#1a1a1c] rounded-2xl p-6 shadow-xs relative cursor-pointer transition-all ${
                    pack.popular
                      ? "border-2 border-[#047857]"
                      : isSelected
                      ? "border border-[#047857]"
                      : "border border-stone-200/80 dark:border-stone-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Floating Badges */}
                  {pack.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#047857] text-white px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">
                      Most Popular
                    </div>
                  )}
                  {pack.save && !pack.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 px-3 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase">
                      {pack.save}
                    </div>
                  )}

                  <div className="text-center">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-slate-600 dark:text-slate-400">
                      {pack.tier}
                    </span>

                    <h4 className="text-3xl font-extrabold font-mono tabular-nums text-stone-900 dark:text-stone-100 mt-2">
                      {pack.credits}
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Credits
                    </p>

                    <div className="mt-4 pb-4 border-b border-stone-100 dark:border-stone-800">
                      <p className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-mono tabular-nums">
                        ₹{pack.priceRupees}
                      </p>
                      <p className="text-xs font-mono text-stone-500 dark:text-stone-400 font-medium mt-0.5 tabular-nums">
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
                      className={`mt-4 w-full py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                        pack.popular
                          ? "bg-[#047857] hover:bg-[#065f46] text-white shadow-xs"
                          : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {isProcessing ? "Processing..." : `Buy ${pack.credits} Credits`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. B2B Trust, Security & Regulatory Matrix */}
        <section className="bg-white dark:bg-[#1a1a1c] rounded-2xl p-6 sm:p-8 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-sm sm:text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Fintech Security & Statutory Assurance
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 space-y-1">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                RBI e-Mandate Compliant
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                Full adherence to RBI recurring guidelines with 24-hr pre-debit notifications.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 space-y-1">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#047857]" />
                256-Bit TLS Encryption
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                Razorpay PCI-DSS Level 1 certified gateway with bank-grade encryption.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 space-y-1">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                18% GST Input Credit
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                B2B GST invoice provided automatically to claim full tax deduction.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 space-y-1">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                Zero Lock-In Freedom
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                Cancel or modify mandate anytime directly from dashboard or any UPI app.
              </p>
            </div>
          </div>
        </section>

        {/* 5. Interactive FAQ Accordion */}
        <section className="bg-white dark:bg-[#1a1a1c] rounded-2xl p-6 sm:p-8 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#047857] dark:text-emerald-400" />
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
                    className="w-full text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 hover:text-[#047857] dark:hover:text-emerald-400 transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 leading-relaxed pl-1">
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
          <div className="bg-white dark:bg-slate-900 text-stone-900 dark:text-stone-100 rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 border border-stone-200/80 dark:border-stone-800 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Cancel Pro Subscription?</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
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
                className="flex-1 py-3 rounded-xl border border-stone-200 dark:border-stone-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition min-h-[44px]"
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
