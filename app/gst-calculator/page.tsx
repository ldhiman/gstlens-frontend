"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calculator,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Copy,
  Receipt,
  FileText,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { formatINR } from "@/lib/currency";
import { Header } from "@/components/header";
import toast from "react-hot-toast";

const STANDARD_SLABS = [0, 5, 12, 18, 28];
const SPECIAL_SLABS = [
  { label: "Gold / Jewellery (3%)", rate: 3 },
  { label: "Polished Diamonds (1.5%)", rate: 1.5 },
  { label: "Rough Diamonds (0.25%)", rate: 0.25 },
];

export default function GSTCalculatorPage() {
  const [calculationMode, setCalculationMode] = useState<"exclusive" | "inclusive">("exclusive");
  const [amount, setAmount] = useState<number>(10000);
  const [selectedRate, setSelectedRate] = useState<number>(18);
  const [customRate, setCustomRate] = useState<string>("");
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [applyRounding, setApplyRounding] = useState<boolean>(true);

  const activeRate = useMemo(() => {
    if (customRate !== "" && !isNaN(Number(customRate))) {
      return Math.max(0, Number(customRate));
    }
    return selectedRate;
  }, [selectedRate, customRate]);

  // Tax computation logic
  const calculation = useMemo(() => {
    const rawAmount = Math.max(0, amount || 0);

    let netTaxable = 0;
    let totalTax = 0;
    let grossTotal = 0;

    if (calculationMode === "exclusive") {
      netTaxable = rawAmount;
      totalTax = (rawAmount * activeRate) / 100;
      grossTotal = netTaxable + totalTax;
    } else {
      grossTotal = rawAmount;
      netTaxable = (rawAmount * 100) / (100 + activeRate);
      totalTax = grossTotal - netTaxable;
    }

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = totalTax;
    } else {
      cgst = totalTax / 2;
      sgst = totalTax / 2;
    }

    const roundedGross = applyRounding ? Math.round(grossTotal) : grossTotal;
    const roundOff = roundedGross - grossTotal;

    return {
      netTaxable,
      totalTax,
      grossTotal: roundedGross,
      roundOff,
      cgst,
      sgst,
      igst,
      rate: activeRate,
    };
  }, [amount, activeRate, calculationMode, isInterState, applyRounding]);

  const copyBreakdown = () => {
    const summary = `GST Calculation Summary (GSTLens.in):
Base Taxable Value: ₹${calculation.netTaxable.toFixed(2)}
GST Rate: ${calculation.rate}%
${isInterState ? `IGST (100%): ₹${calculation.igst.toFixed(2)}` : `CGST (50%): ₹${calculation.cgst.toFixed(2)}\nSGST (50%): ₹${calculation.sgst.toFixed(2)}`}
Total GST: ₹${calculation.totalTax.toFixed(2)}
${applyRounding ? `Round-off (Sec 170): ₹${calculation.roundOff.toFixed(2)}\n` : ""}Final Invoice Total: ₹${calculation.grossTotal.toFixed(2)}`;

    navigator.clipboard.writeText(summary);
    toast.success("Calculation breakdown copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb & Title */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 mb-3">
            <Calculator className="w-3.5 h-3.5" />
            <span>Statutory Slabs & Section 170 Rounding</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Indian GST Calculator
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Calculate CGST, SGST, and IGST breakdown. Switch between base tax-exclusive quotes and MRP tax-inclusive retail figures.
          </p>
        </div>

        {/* Calculator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 bg-white dark:bg-[#1a1a1c] rounded-2xl p-6 sm:p-7 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-6">
            
            {/* Mode Switcher */}
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">
                Calculation Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 dark:bg-stone-800/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCalculationMode("exclusive")}
                  className={`py-2 px-3.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 ${
                    calculationMode === "exclusive"
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200 dark:border-stone-700/60"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  <Percent className="w-3.5 h-3.5 text-[#047857]" />
                  <span>GST Exclusive (Add GST)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalculationMode("inclusive")}
                  className={`py-2 px-3.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center justify-center gap-2 ${
                    calculationMode === "inclusive"
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200 dark:border-stone-700/60"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 text-[#047857]" />
                  <span>GST Inclusive (MRP)</span>
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">
                {calculationMode === "exclusive" ? "Net Taxable Amount (₹)" : "Total MRP / Inclusive Amount (₹)"}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 dark:text-stone-500 font-mono text-base">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount === 0 ? "" : amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="10000"
                  className="w-full pl-8 pr-4 py-2.5 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl text-lg font-mono tabular-nums text-stone-900 dark:text-stone-100 focus:outline-hidden focus:ring-1 focus:ring-[#047857]"
                />
              </div>
            </div>

            {/* Standard GST Slabs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-stone-600 dark:text-stone-400">
                  Applicable GST Slab
                </label>
                <span className="text-xs font-mono text-stone-400">
                  Selected: {activeRate}%
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {STANDARD_SLABS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setSelectedRate(rate);
                      setCustomRate("");
                    }}
                    className={`py-2.5 rounded-xl font-mono text-sm transition ${
                      selectedRate === rate && customRate === ""
                        ? "bg-[#047857] text-white font-semibold shadow-xs"
                        : "bg-stone-100 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 hover:bg-stone-200/80 dark:hover:bg-stone-800"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>

              {/* Special Slabs */}
              <div className="mt-3 flex flex-wrap gap-2">
                {SPECIAL_SLABS.map((slab) => (
                  <button
                    key={slab.rate}
                    type="button"
                    onClick={() => {
                      setSelectedRate(slab.rate);
                      setCustomRate("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedRate === slab.rate && customRate === ""
                        ? "bg-[#047857] text-white shadow-xs"
                        : "bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 hover:bg-stone-200/80 dark:hover:bg-stone-800"
                    }`}
                  >
                    {slab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Supply Location & Rounding Controls */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInterState}
                  onChange={(e) => setIsInterState(e.target.checked)}
                  className="w-4 h-4 rounded text-[#047857] accent-[#047857] focus:ring-[#047857]"
                />
                <div className="text-xs">
                  <span className="font-medium text-stone-900 dark:text-stone-100 block">Inter-state supply (IGST)</span>
                  <span className="text-stone-500 text-[11px]">Between different states (100% IGST)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200/80 dark:border-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyRounding}
                  onChange={(e) => setApplyRounding(e.target.checked)}
                  className="w-4 h-4 rounded text-[#047857] accent-[#047857] focus:ring-[#047857]"
                />
                <div className="text-xs">
                  <span className="font-medium text-stone-900 dark:text-stone-100 block">Section 170 rounding</span>
                  <span className="text-stone-500 text-[11px]">Round to nearest integer rupee</span>
                </div>
              </label>
            </div>
          </div>

          {/* Right Column: Ledger Output Card */}
          <div className="lg:col-span-5 bg-[#1c1917] dark:bg-[#161513] text-stone-100 rounded-2xl p-6 sm:p-7 border border-stone-800/80 space-y-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <span className="text-xs font-mono uppercase tracking-wider text-stone-400">
                Statutory Tax Output
              </span>
              <button
                type="button"
                onClick={copyBreakdown}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs text-stone-200 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>

            {/* Grand Total Hero */}
            <div>
              <span className="text-xs text-stone-400 block">
                {calculationMode === "exclusive" ? "Grand Invoice Total" : "Inclusive MRP Total"}
              </span>
              <div className="text-3xl sm:text-4xl font-semibold font-mono tracking-tight text-white mt-1 tabular-nums">
                {formatINR(calculation.grossTotal)}
              </div>
              <div className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Includes ₹{calculation.totalTax.toFixed(2)} total GST ({calculation.rate}%)</span>
              </div>
            </div>

            {/* Breakdown Rows */}
            <div className="space-y-2.5 pt-3 border-t border-stone-800 text-xs sm:text-sm">
              <div className="flex justify-between py-1">
                <span className="text-stone-400">Net taxable value</span>
                <span className="font-mono font-medium text-stone-100 tabular-nums">
                  ₹{calculation.netTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {!isInterState ? (
                <>
                  <div className="flex justify-between py-1 text-stone-300">
                    <span className="text-stone-400">CGST ({calculation.rate / 2}%)</span>
                    <span className="font-mono font-medium tabular-nums">
                      ₹{calculation.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-stone-300">
                    <span className="text-stone-400">SGST ({calculation.rate / 2}%)</span>
                    <span className="font-mono font-medium tabular-nums">
                      ₹{calculation.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1 text-stone-300">
                  <span className="text-stone-400">IGST ({calculation.rate}%)</span>
                  <span className="font-mono font-medium tabular-nums">
                    ₹{calculation.igst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {applyRounding && calculation.roundOff !== 0 && (
                <div className="flex justify-between py-1 text-amber-300 font-mono">
                  <span className="text-stone-400 font-sans">Round-off (Sec 170)</span>
                  <span className="font-medium tabular-nums">
                    {calculation.roundOff > 0 ? "+" : ""}
                    ₹{calculation.roundOff.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-2">
              <Link
                href={`/free-invoice-generator`}
                className="w-full py-2.5 px-4 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-medium text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>Create invoice with this amount</span>
              </Link>

              <Link
                href="/dashboard"
                className="w-full py-2 px-4 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 hover:text-stone-100 font-medium text-xs transition flex items-center justify-center gap-1.5"
              >
                <span>Open full GSTLens dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Informational SEO & FAQs Section */}
        <section className="mt-14 max-w-4xl mx-auto space-y-8 border-t border-stone-200/80 dark:border-stone-800 pt-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              Understanding Indian GST Calculations
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
              Statutory guidance on CGST, SGST, IGST, and tax-inclusive reverse math.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="bg-white dark:bg-[#1a1a1c] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-2">
              <h3 className="font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                How to calculate GST Exclusive (Base + Tax)?
              </h3>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-xs">
                When quoting base price excluding tax, GST is added on top:
              </p>
              <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl font-mono text-xs text-stone-800 dark:text-stone-300 border border-stone-200/60 dark:border-stone-800">
                GST Amount = (Base Amount × GST Rate) / 100<br />
                Total Amount = Base Amount + GST Amount
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1c] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-2">
              <h3 className="font-medium text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                How to calculate GST Inclusive (MRP Reverse)?
              </h3>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed text-xs">
                When retail products include GST in the Maximum Retail Price (MRP):
              </p>
              <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-xl font-mono text-xs text-stone-800 dark:text-stone-300 border border-stone-200/60 dark:border-stone-800">
                Taxable Base = (MRP × 100) / (100 + GST Rate)<br />
                GST Amount = MRP − Taxable Base
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
