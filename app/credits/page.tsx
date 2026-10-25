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
  const [selectedPack, setSelectedPack] = useState<number | null>(1); // Default to popular pack
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-pulse text-indigo-600 dark:text-indigo-400">
            <Coins className="w-8 h-8" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading your credits...</p>
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

  // One-time credit purchase
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
        description: `Buy ${creditAmount} credits`,
        image: "/logo.png",
        handler: () => {
          alert("Payment successful! Your credits have been added.");
          window.location.reload();
        },
        prefill: {
          email: userProfile?.email || "",
          name: userProfile?.displayName || "",
        },
        theme: { color: "#6366f1" },
        modal: { ondismiss: () => setIsProcessing(false) },
      };

      new Razorpay(options).open();
    } catch (error: any) {
      console.error("Credit purchase error:", error);
      alert(error.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  };

  // Subscribe to monthly plan
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
      window.location.href = data.short_url;
    } catch (error: any) {
      console.error("Subscription error:", error);
      alert(error.message || "Failed to start subscription. Please try again.");
      setIsProcessing(false);
    }
  };

  // Restart cancelled subscription by re-authorizing mandate with Razorpay
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
      toast.success("Redirecting to Razorpay to restart your subscription...");
      window.location.href = data.short_url;
    } catch (error: any) {
      console.error("Restart subscription error:", error);
      toast.error(error.message || "Failed to restart subscription. Please try again.");
      setIsProcessing(false);
    }
  };

  // Cancel subscription
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

      alert(
        "Subscription cancelled successfully. You'll keep access until the end of your current billing period."
      );
      window.location.reload();
    } catch (error: any) {
      alert(
        error.message || "Failed to cancel subscription. Please try again."
      );
      setIsProcessing(false);
    } finally {
      setShowCancelModal(false);
    }
  };

  // Sync live subscription state from Razorpay
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
        toast.success("Subscription is verified and active with Razorpay!");
      } else {
        toast.error(
          `Razorpay status: ${data.razorpay_status || "inactive"}. Subscription deactivated.`
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24 md:pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
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
              <Coins className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Credits & Subscription</h1>
            </div>
          </div>

          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Balance Hero Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/15 border border-indigo-500/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-indigo-200 text-xs uppercase tracking-wider font-semibold">
                Available Balance
              </p>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-5xl sm:text-6xl font-black font-mono tabular-nums tracking-tight">
                  {credits}
                </span>
                <span className="text-base sm:text-lg font-medium text-indigo-200">
                  credits remaining
                </span>
              </div>
              <p className="mt-3 text-xs sm:text-sm text-indigo-100/90 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-300" /> 1 credit = 1 invoice extraction • Previews, edits & JSON downloads are always free
              </p>
            </div>

            {credits < 10 && credits > 0 && (
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold text-white">
                <TrendingUp className="w-4 h-4 text-amber-300" />
                Low balance — top up to avoid interruption
              </div>
            )}
          </div>
        </div>

        {/* Pro Subscription */}
        <section className="space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Pro Subscription
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Monthly allocation with automatic multi-device cloud backup & sync
            </p>
          </div>

          <div
            className={`relative rounded-3xl p-6 sm:p-8 shadow-sm border transition-all ${
              hasSubscription
                ? isCancelRequested
                  ? "border-amber-400/80 bg-amber-50/30 dark:bg-amber-950/20"
                  : "border-emerald-500/80 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
            }`}
          >
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
                    <BadgeCheck className="w-3.5 h-3.5" /> ACTIVE PLAN
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Pro Monthly Plan
                    </h3>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                      ₹499<span className="text-sm font-normal text-slate-500 dark:text-slate-400"> / month</span>
                    </p>
                  </div>
                </div>

                {isCancelRequested && (
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cancellation in progress</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                        Your cancellation request has been registered. Pro features remain active until the end of your billing cycle. Restart anytime to prevent interruption.
                      </p>
                    </div>
                  </div>
                )}

                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span><strong>100 free credits</strong> replenished every month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Continuous cloud backup & real-time sync across devices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>Priority email & WhatsApp compliance support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Infinity className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span>Cancel subscription anytime with 1 click</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col justify-center sm:min-w-[210px] gap-2">
                {hasSubscription ? (
                  isCancelRequested ? (
                    <>
                      <button
                        onClick={restartSubscription}
                        disabled={isProcessing}
                        className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-98 transition min-h-[42px] disabled:opacity-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        {isProcessing ? "Connecting..." : "Restart Subscription"}
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
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="w-full py-2.5 rounded-2xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm hover:bg-rose-50 dark:hover:bg-rose-950/30 transition min-h-[40px]"
                      >
                        Cancel Subscription
                      </button>
                      <button
                        onClick={syncSubscription}
                        disabled={isProcessing}
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-1.5 min-h-[38px] disabled:opacity-50"
                        title="Fetch live subscription status directly from Razorpay"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
                        Sync Status with Razorpay
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
                    {isProcessing ? "Processing..." : "Subscribe to Pro"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* One-Time Credit Packs */}
        <section className="space-y-4">
          <div className="text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              One-Time Credit Packs
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pay as you go • Credits never expire • GST included
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <CreditPack
              credits="50"
              price="₹100"
              perInvoice="₹2.00 / invoice"
              selected={selectedPack === 0}
              onClick={() => setSelectedPack(0)}
              onBuy={() => buyCredits(50)}
              disabled={isProcessing}
            />
            <CreditPack
              credits="150"
              price="₹250"
              perInvoice="₹1.67 / invoice"
              save="Save 17%"
              popular
              selected={selectedPack === 1}
              onClick={() => setSelectedPack(1)}
              onBuy={() => buyCredits(150)}
              disabled={isProcessing}
            />
            <CreditPack
              credits="350"
              price="₹500"
              perInvoice="₹1.43 / invoice"
              save="Save 28%"
              selected={selectedPack === 2}
              onClick={() => setSelectedPack(2)}
              onBuy={() => buyCredits(350)}
              disabled={isProcessing}
            />
          </div>
        </section>

        {/* Rules & Security */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              How Credits Work
            </h3>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>1 credit is deducted per successful invoice AI scan & data extraction</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Invoice previews, corrections & JSON return downloads are 100% free</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Purchased credits never expire and roll over indefinitely</span>
              </li>
            </ul>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Bank-Grade Security
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Payments are processed through <strong>Razorpay</strong> with 256-bit PCI-DSS compliant encryption. We support UPI, credit/debit cards, Net Banking, and business accounts with GST invoicing.
            </p>
          </div>
        </div>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/60 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">
                Cancel Pro Subscription?
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              You will retain cloud sync and your remaining monthly credits until the end of your billing period. After that, your account will switch to pay-as-you-go.
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
                className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-bold text-xs sm:text-sm hover:bg-rose-700 transition min-h-[44px]"
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

function CreditPack({
  credits,
  price,
  perInvoice,
  save,
  popular = false,
  selected,
  onClick,
  onBuy,
  disabled,
}: {
  credits: string;
  price: string;
  perInvoice: string;
  save?: string;
  popular?: boolean;
  selected: boolean;
  onClick: () => void;
  onBuy: () => void;
  disabled: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-3xl p-6 sm:p-7 border cursor-pointer transition-all ${
        popular
          ? "border-indigo-500 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-slate-900 shadow-md ring-1 ring-indigo-500/20"
          : selected
          ? "border-indigo-500 dark:border-indigo-400 bg-white dark:bg-slate-900 shadow-sm"
          : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs">
          Most Popular
        </div>
      )}
      {save && !popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs">
          {save}
        </div>
      )}

      <div className="text-center">
        <h4 className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-slate-900 dark:text-slate-100">
          {credits}
        </h4>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
          Credits
        </p>

        <div className="mt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            {price}
          </p>
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {perInvoice}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onBuy();
          }}
          disabled={disabled}
          className={`mt-4 w-full py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all min-h-[44px] active:scale-98 ${
            disabled
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              : popular
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
              : "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {disabled ? "Processing..." : `Buy ${credits} Credits`}
        </button>
      </div>
    </div>
  );
}
