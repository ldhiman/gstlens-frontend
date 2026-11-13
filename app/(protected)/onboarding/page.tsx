"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { OPEN_ONBOARDING_EVENT } from "@/components/BusinessOnboardingModal";
import { Building2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Open onboarding modal immediately
    window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT));
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-[#1a1a1c] p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-400 rounded-xl flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Business Setup Wizard</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            Set up your legal entity, live GST portal details, first buyer, supplier, opening inventory, and billing series.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT))}
              className="w-full py-2.5 bg-[#047857] hover:bg-[#065f46] text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <span>Launch Setup Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-xl text-xs transition border border-stone-200/60 dark:border-stone-700 cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
