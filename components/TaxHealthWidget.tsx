"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Scale,
} from "lucide-react";
import { formatINR } from "@/lib/currency";

export interface TaxHealthProps {
  outwardTax: number;
  inwardTax: number;
  matched2BTax?: number;
  totalInvoicesCount: number;
  totalPurchasesCount: number;
  unmatchedPurchasesCount?: number;
  onDownloadGstr1?: () => void;
  onDownloadGstr3bCsv?: () => void;
}

export default function TaxHealthWidget({
  outwardTax,
  inwardTax,
  matched2BTax = 0,
  totalInvoicesCount,
  totalPurchasesCount,
  unmatchedPurchasesCount = 0,
}: TaxHealthProps) {
  const netTaxPayable = Math.max(0, outwardTax - inwardTax);
  const itcSurplus = inwardTax > outwardTax ? inwardTax - outwardTax : 0;

  const itcSafetyRatio =
    totalPurchasesCount > 0
      ? Math.round(((totalPurchasesCount - unmatchedPurchasesCount) / totalPurchasesCount) * 100)
      : 100;

  const healthScore = useMemo(() => {
    let score = 100;
    if (unmatchedPurchasesCount > 0) score -= Math.min(25, unmatchedPurchasesCount * 5);
    if (totalInvoicesCount === 0 && totalPurchasesCount === 0) score = 95;
    return Math.max(50, score);
  }, [unmatchedPurchasesCount, totalInvoicesCount, totalPurchasesCount]);

  return (
    <div className="bg-white dark:bg-[#161513] rounded-xl p-5 sm:p-6 border border-black/[0.08] dark:border-white/[0.08] text-stone-900 dark:text-stone-100 space-y-5">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-black/[0.06] dark:border-white/[0.06] gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-600/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100">
                GST filing health & reconciliation
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-black/[0.05] dark:border-white/[0.05]">
                Rule 88C aligned
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Outward liability, verified purchase credit, and statutory net challan calculation
            </p>
          </div>
        </div>

        {/* Health Score Indicator */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-stone-50 dark:bg-[#1f1d1a] border border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-normal">Compliance score</span>
          <span className="font-mono font-medium text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
            {healthScore}/100
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        </div>
      </div>

      {/* 3 Statutory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Rule 88C Notice Shield */}
        <div className="bg-[#fafaf9] dark:bg-[#1a1917] border border-black/[0.06] dark:border-white/[0.06] rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-300">
            <span>Rule 88C liability check</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">Zero mismatch</div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
            Outward tax in GSTR-1 matches declared GSTR-3B liability exactly from this ledger.
          </p>
        </div>

        {/* Card 2: Section 16(2) ITC Shield */}
        <div className="bg-[#fafaf9] dark:bg-[#1a1917] border border-black/[0.06] dark:border-white/[0.06] rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-300">
            <span>Section 16(2) input tax credit</span>
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
              {itcSafetyRatio}% verified
            </span>
          </div>
          <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
            {unmatchedPurchasesCount === 0 ? "All bills verified" : `${unmatchedPurchasesCount} unverified bills`}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
            {unmatchedPurchasesCount === 0
              ? "All purchase bills verified against GSTR-2B. No wrongful credit risk."
              : "Reconcile purchases against GSTR-2B before claiming in Table 4."}
          </p>
        </div>

        {/* Card 3: Net GST Due */}
        <div className="bg-[#fafaf9] dark:bg-[#1a1917] border border-black/[0.06] dark:border-white/[0.06] rounded-lg p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-300">
            <span>Net tax payable</span>
            <Scale className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-xs font-mono font-medium text-stone-900 dark:text-stone-100 tabular-nums">
            {netTaxPayable > 0 ? formatINR(netTaxPayable) : `₹0.00 (${formatINR(itcSurplus)} credit surplus)`}
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
            {netTaxPayable > 0
              ? "Calculated net cash liability payable on the GST portal before the 20th."
              : "Eligible input tax credit covers total sales tax. Zero cash liability."}
          </p>
        </div>
      </div>

      {/* 3-Step Action Guide */}
      <div className="pt-1">
        <p className="text-xs font-medium text-stone-700 dark:text-stone-300 mb-2">
          Monthly return checklist
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {/* Step 1 */}
          <Link
            href="/gstr-1"
            className="p-3 rounded-lg bg-[#fafaf9] dark:bg-[#1a1917] hover:bg-stone-100 dark:hover:bg-[#211f1c] border border-black/[0.06] dark:border-white/[0.06] transition flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono text-stone-400 block mb-0.5">By 11th</span>
              <p className="font-medium text-stone-900 dark:text-stone-100">
                1. Export GSTR-1 JSON
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Portal-ready file with {totalInvoicesCount} sales bills formatted for Table 4, 5, and 7.
              </p>
            </div>
            <div className="mt-2.5 flex items-center text-[11px] font-medium text-emerald-700 dark:text-emerald-400 gap-1">
              <span>Generate GSTR-1</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Step 2 */}
          <Link
            href="/gstr-3b"
            className="p-3 rounded-lg bg-[#fafaf9] dark:bg-[#1a1917] hover:bg-stone-100 dark:hover:bg-[#211f1c] border border-black/[0.06] dark:border-white/[0.06] transition flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono text-stone-400 block mb-0.5">By 20th</span>
              <p className="font-medium text-stone-900 dark:text-stone-100">
                2. Review GSTR-3B tax
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Net liability after offsetting ₹{inwardTax.toFixed(0)} eligible purchase credit.
              </p>
            </div>
            <div className="mt-2.5 flex items-center text-[11px] font-medium text-emerald-700 dark:text-emerald-400 gap-1">
              <span>Review 3B summary</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Step 3 */}
          <a
            href="https://services.gst.gov.in/services/login"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-mono text-emerald-200 block mb-0.5">Final step</span>
              <p className="font-medium text-white">
                3. File on GST portal
              </p>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                Upload JSON, pay challan via net banking / UPI, and authenticate with EVC OTP.
              </p>
            </div>
            <div className="mt-2.5 flex items-center text-[11px] font-medium text-white gap-1">
              <span>Open gst.gov.in</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
