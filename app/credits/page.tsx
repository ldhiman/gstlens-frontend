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
} from "lucide-react";
import { useState } from "react";
import { authFetch } from "@/lib/api";

export default function CreditsPage() {
  const { userProfile, loading } = useAuth();
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Coins className="w-9 h-9 text-indigo-600" />
          </div>
          <p className="text-gray-600">Loading your credits...</p>
        </div>
      </div>
    );
  }

  const credits = userProfile?.credits ?? 0;
  const hasSubscription = userProfile?.subscription?.active ?? false;

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
    if (isProcessing || hasSubscription) return;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-3">
          <Coins className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Credits & Billing
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">
        {/* Hero Balance */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-10 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <p className="text-indigo-100 text-sm uppercase tracking-wider font-medium">
              Your Available Credits
            </p>
            <div className="flex items-end gap-4 mt-4">
              <h2 className="text-6xl md:text-7xl font-extrabold">{credits}</h2>
              <Sparkles className="w-14 h-14 text-yellow-300 mb-2 animate-pulse" />
            </div>
            <p className="mt-6 text-lg text-indigo-100 flex items-center gap-2">
              <Zap className="w-6 h-6" />1 credit = 1 invoice processed •
              Previews & edits are free
            </p>

            {credits < 10 && credits > 0 && (
              <div className="mt-6 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                <TrendingUp className="w-5 h-5" />
                Low balance – top up to continue
              </div>
            )}
          </div>
        </div>

        {/* Pro Subscription */}
        <section>
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900">
              Pro Plan – Cloud Sync + Monthly Credits
            </h3>
            <p className="mt-3 text-lg text-gray-600">
              Best for regular users • Multi-device access
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div
              className={`relative rounded-3xl p-10 shadow-2xl border-4 transition-all ${
                hasSubscription
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50"
                  : "border-indigo-500 bg-white"
              }`}
            >
              {hasSubscription && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5" />
                  ACTIVE PLAN
                </div>
              )}

              <div className="text-center">
                <div className="flex justify-center gap-4 items-center mb-6">
                  <Cloud className="w-14 h-14 text-indigo-600" />
                  <h4 className="text-4xl font-bold text-gray-900">Pro Plan</h4>
                </div>

                <p className="text-5xl font-extrabold text-gray-900 mb-2">
                  ₹499
                  <span className="text-2xl font-normal text-gray-600">
                    /month
                  </span>
                </p>

                <ul className="space-y-4 mt-10 text-left max-w-md mx-auto">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span className="text-gray-700">
                      <strong>100 free credits every month</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span className="text-gray-700">
                      Unlimited cloud backup & sync
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span className="text-gray-700">
                      Access on all your devices
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <span className="text-gray-700">Priority support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Infinity className="w-6 h-6 text-indigo-600" />
                    <span className="text-gray-700">Cancel anytime</span>
                  </li>
                </ul>

                {hasSubscription ? (
                  <div className="mt-10">
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full py-4 rounded-2xl border border-red-300 text-red-600 font-bold text-lg hover:bg-red-50 transition"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={subscribeToPlan}
                    disabled={isProcessing}
                    className={`mt-10 w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                      isProcessing
                        ? "bg-gray-300 text-gray-600 cursor-wait"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl"
                    }`}
                  >
                    <CreditCard className="w-6 h-6" />
                    {isProcessing ? "Processing..." : "Subscribe Now"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* One-Time Credit Packs */}
        <section>
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900">
              Or Buy Credits One-Time
            </h3>
            <p className="mt-3 text-lg text-gray-600">
              Pay as you go • No recurring payment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <CreditPack
              credits="50"
              price="₹100"
              perInvoice="₹2.00"
              selected={selectedPack === 0}
              onClick={() => setSelectedPack(selectedPack === 0 ? null : 0)}
              onBuy={() => buyCredits(50)}
              disabled={isProcessing}
            />
            <CreditPack
              credits="150"
              price="₹250"
              perInvoice="₹1.67"
              save="Save 17%"
              popular
              selected={selectedPack === 1}
              onClick={() => setSelectedPack(selectedPack === 1 ? null : 1)}
              onBuy={() => buyCredits(150)}
              disabled={isProcessing}
            />
            <CreditPack
              credits="350"
              price="₹500"
              perInvoice="₹1.43"
              save="Best Value – Save 28%"
              selected={selectedPack === 2}
              onClick={() => setSelectedPack(selectedPack === 2 ? null : 2)}
              onBuy={() => buyCredits(350)}
              disabled={isProcessing}
            />
          </div>
        </section>

        {/* How Credits Work */}
        <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            How Credits Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <RuleItem text="1 credit deducted per invoice upload & AI extraction" />
            <RuleItem text="Preview, edits & JSON generation are always FREE" />
            <RuleItem text="Credits never expire" />
            <RuleItem text="GSTIN verification is completely free" />
          </div>
        </section>

        {/* Security */}
        <section className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-8 border border-emerald-100">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-emerald-900">
                Secure Payments
              </h4>
              <p className="mt-2 text-emerald-700">
                Powered by Razorpay • PCI DSS compliant • Instant delivery
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Cancel Subscription?
              </h3>
            </div>

            <p className="text-gray-600 mb-8">
              You'll keep cloud sync and monthly credits until the end of your
              current billing period. After that, you'll switch to pay-as-you-go
              credits.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 font-medium hover:bg-gray-50 transition"
              >
                Keep Subscription
              </button>
              <button
                onClick={cancelSubscription}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition"
              >
                {isProcessing ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Reusable Components */
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
      className={`relative rounded-3xl p-8 shadow-2xl border-4 cursor-pointer transition-all duration-300 hover:shadow-3xl ${
        selected
          ? "border-indigo-500 ring-4 ring-indigo-200 scale-105"
          : "border-transparent"
      } ${
        popular
          ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white"
          : "bg-white"
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold">
          MOST POPULAR
        </div>
      )}
      {save && !popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold">
          {save}
        </div>
      )}

      <div className="text-center">
        <h4
          className={`text-4xl font-extrabold ${
            popular ? "" : "text-gray-800"
          }`}
        >
          {credits}
        </h4>
        <p
          className={`text-lg mt-1 ${
            popular ? "text-indigo-100" : "text-gray-600"
          }`}
        >
          Credits
        </p>

        <div className="mt-6">
          <p
            className={`text-4xl font-extrabold ${
              popular ? "text-white" : "text-gray-900"
            }`}
          >
            {price}
          </p>
          <p
            className={`mt-2 text-sm ${
              popular ? "text-indigo-200" : "text-gray-500"
            }`}
          >
            {perInvoice} per invoice
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onBuy();
          }}
          disabled={disabled}
          className={`mt-8 w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            disabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : popular
              ? "bg-white text-indigo-700 hover:bg-gray-100"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
        >
          <CreditCard className="w-6 h-6" />
          {disabled ? "Processing..." : "Buy Now"}
        </button>
      </div>
    </div>
  );
}

function RuleItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-4">
      <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
      <span className="text-gray-700 text-lg">{text}</span>
    </div>
  );
}
