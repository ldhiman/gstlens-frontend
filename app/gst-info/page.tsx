"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";

// Indian State Codes dictionary
const GST_STATES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu", "27": "Maharashtra", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman & Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
};

export default function GSTInfoHomePage() {
  const [gstin, setGstin] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const router = useRouter();

  const detectedState = gstin.length >= 2 ? GST_STATES[gstin.slice(0, 2)] : null;

  const validateGSTIN = (value: string) => {
    if (value.length === 0) {
      setIsValid(null);
      return;
    }
    // Basic GSTIN structure: 2 digits + 5 letters + 4 digits + 1 letter + 1 char + Z + 1 char
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    setIsValid(value.length === 15 && regex.test(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gstin.length === 15) {
      router.push(`/gst-info/${gstin.toUpperCase()}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setGstin(value);
    validateGSTIN(value);
  };

  const handleQuickSample = (sample: string) => {
    setGstin(sample);
    validateGSTIN(sample);
    router.push(`/gst-info/${sample}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24 md:pb-12">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" /> Live GSTN Portal Search
          </span>
        </div>

        {/* Title Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 rounded-3xl text-white shadow-xl shadow-emerald-500/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 text-white">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">GSTIN Verification & Lookup</h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-0.5">
              Verify taxpayer status, legal business name, jurisdiction, and filing compliance.
            </p>
          </div>
        </div>

        {/* Main Search Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Enter 15-Digit GSTIN
                </label>
                {detectedState && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    <MapPin className="w-3 h-3" /> State: {detectedState} ({gstin.slice(0, 2)})
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={gstin}
                  onChange={handleInputChange}
                  placeholder="e.g. 07AAACU4747P1ZR"
                  className={`w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-2xl px-4 py-3.5 pr-12 text-slate-900 dark:text-slate-100 font-mono text-base uppercase focus:outline-none transition-all ${
                    isValid === true
                      ? "border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                      : isValid === false && gstin.length === 15
                      ? "border-amber-500 focus:ring-4 focus:ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                  }`}
                  required
                  maxLength={15}
                  autoCapitalize="characters"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isValid === true ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : isValid === false && gstin.length === 15 ? (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400 font-mono">
                <span>Format: 2 State + 10 PAN + 1 Entity + 1 Z + 1 Check</span>
                <span>{gstin.length}/15</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={gstin.length !== 15}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-98 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Verify Taxpayer Details <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Samples */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Quick Samples (Click to test):
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { gstin: "07AAACU4747P1ZR", state: "Delhi" },
                { gstin: "29ABCDE1234F1Z5", state: "Karnataka" },
                { gstin: "27AABCU9603R1ZN", state: "Maharashtra" },
              ].map((sample) => (
                <button
                  key={sample.gstin}
                  onClick={() => handleQuickSample(sample.gstin)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 transition"
                >
                  <span className="font-bold">{sample.gstin}</span>{" "}
                  <span className="text-[10px] text-slate-400 font-sans">({sample.state})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
