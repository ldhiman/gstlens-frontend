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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Business Setup Wizard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set up your legal entity, live GST portal details, first buyer, supplier, opening inventory, and billing series.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT))}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
            >
              Launch Setup Wizard
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
