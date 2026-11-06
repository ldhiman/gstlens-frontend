"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  Calendar,
  FileSpreadsheet,
  FileCheck,
  ChevronDown,
  Copy,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Receipt,
  ArrowRight,
} from "lucide-react";

import { getAllInvoices, getAllPurchases, type PurchaseBill } from "@/lib/storage";
import { computeGSTR3B, generateGSTR3BJSON, GSTR3BComputation } from "@/lib/gstr3b";
import { generateGSTR3BCSV, downloadCSV } from "@/lib/export";
import { formatINR } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { PeriodSelector, getCurrentMonthRange, getActivePresetLabel, toComparableDate } from "@/components/PeriodSelector";
import toast from "react-hot-toast";

export default function GSTR3BPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const sellerGSTIN = userProfile?.primary_gstin;

  // Default to current month so current activity and ITC appear immediately
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allPurchases, setAllPurchases] = useState<PurchaseBill[]>([]);
  const [copied, setCopied] = useState(false);
  const [showJSON, setShowJSON] = useState(false);

  /* ---------------- Guards ---------------- */
  useEffect(() => {
    if (userProfile && !sellerGSTIN) {
      router.replace("/settings?tab=profile");
    }
  }, [userProfile, sellerGSTIN, router]);

  /* ---------------- Load Invoices & Purchases ---------------- */
  useEffect(() => {
    if (!sellerGSTIN) return;
    (async () => {
      try {
        const [invData, purData] = await Promise.all([
          getAllInvoices(),
          getAllPurchases().catch(() => []),
        ]);
        setAllInvoices(invData || []);
        setAllPurchases(purData || []);
      } catch (err) {
        console.error("Error loading GSTR-3B records:", err);
      }
    })();
  }, [sellerGSTIN]);

  const currentFP = useMemo(() => {
    if (!endDate) return "";
    const parts = endDate.split("-");
    if (parts.length >= 2) return `${parts[1]}${parts[0]}`;
    return "";
  }, [endDate]);

  /* ---------------- Filter Invoices & Purchases by Period ---------------- */
  const invoicesFor3B = useMemo(() => {
    // 1. Sales & Outward Invoices
    const filteredInvoices = allInvoices.filter((inv) => {
      const d = inv.data || inv;
      const sGST = (d.seller_gstin || "").trim().toUpperCase();
      const bGST = (d.buyer_gstin || "").trim().toUpperCase();
      const uGST = (sellerGSTIN || "").trim().toUpperCase();

      const isRelevant = sGST === uGST || bGST === uGST || d.is_inward === true;
      if (!isRelevant) return false;

      const dt = inv.date || d.invoice_date || d.date || "";
      if (!startDate || !endDate) return true;
      const compDate = toComparableDate(dt);
      if (!compDate) return true;
      return compDate >= startDate && compDate <= endDate;
    });

    // 2. Inward Purchases from Purchase Ledger (feeds Table 4 Eligible ITC)
    const mappedPurchases = allPurchases
      .filter((p) => {
        const dt = p.date || (p as any).invoiceDate || "";
        if (!dt) return false;

        if (!startDate || !endDate) return true;
        const compDate = toComparableDate(dt);
        if (!compDate) return true;
        return compDate >= startDate && compDate <= endDate;
      })
      .map((p) => {
        const isBlocked = p.itcEligibility === "ineligible" || (p.itcEligibility as string) === "blocked";
        const isRCM = p.itcEligibility === "rcm";
        const taxTotal = (Number(p.cgst) || 0) + (Number(p.sgst) || 0) + (Number(p.igst) || 0) + (Number(p.cess) || 0);
        const taxableVal = Number(p.taxableAmount) || Math.max(0, (Number(p.total) || 0) - taxTotal);

        return {
          id: p.id,
          data: {
            invoice_number: p.invoiceNumber,
            invoice_date: p.date,
            date: p.date,
            seller_gstin: p.supplierGstin || "",
            buyer_gstin: sellerGSTIN || "",
            taxable_value: taxableVal,
            cgst: Number(p.cgst) || 0,
            sgst: Number(p.sgst) || 0,
            igst: Number(p.igst) || 0,
            cess: Number(p.cess) || 0,
            reverse_charge: isRCM,
            is_inward: true,
            is_blocked_itc: isBlocked,
          },
        };
      });

    return [...filteredInvoices, ...mappedPurchases];
  }, [allInvoices, allPurchases, sellerGSTIN, startDate, endDate]);

  /* ---------------- Real-time Automatic 3B Computation ---------------- */
  const computation = useMemo<GSTR3BComputation | null>(() => {
    if (!sellerGSTIN || !currentFP) return null;
    return computeGSTR3B(sellerGSTIN, currentFP, invoicesFor3B);
  }, [sellerGSTIN, currentFP, invoicesFor3B]);

  /* ---------------- Export Actions ---------------- */
  const downloadJSON = () => {
    if (!computation) {
      toast.error("No computation data for this period");
      return;
    }
    const payload = generateGSTR3BJSON(sellerGSTIN || "", computation.ret_period, invoicesFor3B);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR3B_${sellerGSTIN}_${computation.ret_period}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GSTR-3B JSON downloaded!");
  };

  const downloadExcel = () => {
    if (!computation) {
      toast.error("No computation data for this period");
      return;
    }
    const csvContent = generateGSTR3BCSV(computation);
    downloadCSV(`GSTR3B_CA_Workpaper_${sellerGSTIN}_${computation.ret_period}.csv`, csvContent);
    toast.success("Excel Workpaper downloaded!");
  };

  const copyJSON = () => {
    if (!computation) return;
    const payload = generateGSTR3BJSON(sellerGSTIN || "", computation.ret_period, invoicesFor3B);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Summaries
  const totalOutputTax = computation
    ? computation.sup_details.osup_det.iamt +
      computation.sup_details.osup_det.camt +
      computation.sup_details.osup_det.samt
    : 0;

  const totalEligibleITC = computation
    ? computation.itc_elg.itc_net.iamt +
      computation.itc_elg.itc_net.camt +
      computation.itc_elg.itc_net.samt
    : 0;

  const totalNetCash = computation
    ? computation.tax_summary.net_cash_payable.iamt +
      computation.tax_summary.net_cash_payable.camt +
      computation.tax_summary.net_cash_payable.samt
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              GSTR-3B (Tax Return & Settlement)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monthly summary return for sales tax liability, ITC set-off, and cash payment
            </p>
          </div>
          {sellerGSTIN && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Filing GSTIN: <span className="font-bold text-slate-900 dark:text-white">{sellerGSTIN}</span>
            </div>
          )}
        </div>

        {/* Dedicated Return Period Bar with Quick Pills & Date Selector */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Filing Period
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {getActivePresetLabel(startDate, endDate)}
              </span>
            </div>
          </div>

          <PeriodSelector
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        </div>

        {/* 3 Simple, Clear KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: Sales Tax Liability */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                1. Tax on Sales (Output)
              </span>
              <Receipt className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatINR(totalOutputTax)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Turnover: {formatINR(computation?.sup_details.osup_det.txval || 0)}
            </span>
          </div>

          {/* Card 2: ITC Available */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                2. Purchase Credit (ITC)
              </span>
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {formatINR(totalEligibleITC)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Eligible input credit to offset
            </span>
          </div>

          {/* Card 3: Net Cash Tax to Pay */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                3. Net Cash Tax to Pay
              </span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div
              className={`text-2xl font-black font-mono mt-1 tabular-nums ${
                totalNetCash === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-indigo-600 dark:text-indigo-400"
              }`}
            >
              {totalNetCash === 0 ? "₹0" : formatINR(totalNetCash)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {totalNetCash === 0 ? "Fully covered by ITC credit" : "Tax payable via bank portal"}
            </span>
          </div>
        </div>

        {/* Primary Download Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={downloadJSON}
            className="flex-1 min-w-[200px] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download GST Portal JSON</span>
          </button>

          <button
            type="button"
            onClick={downloadExcel}
            className="flex-1 min-w-[180px] py-3 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-98 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Download CA Workpaper</span>
          </button>
        </div>

        {/* Clean Schedules Breakdown */}
        {computation && (
          <div className="space-y-4">
            {/* Table 3.1: Sales Tax Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                    3.1
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Outward Supplies Tax Liability
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {invoicesFor3B.length} bill{invoicesFor3B.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Taxable Sales
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {formatINR(computation.sup_details.osup_det.txval)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    IGST (Inter-State)
                  </span>
                  <span className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                    {formatINR(computation.sup_details.osup_det.iamt)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    CGST (Central Tax)
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {formatINR(computation.sup_details.osup_det.camt)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    SGST (State Tax)
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {formatINR(computation.sup_details.osup_det.samt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Table 4: Eligible ITC Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Eligible Input Tax Credit (ITC)
                  </h2>
                </div>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  Section 16/17 Compliant
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    All Other ITC (4A)
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {formatINR(
                      computation.itc_elg.itc_avl.OTH.iamt +
                        computation.itc_elg.itc_avl.OTH.camt +
                        computation.itc_elg.itc_avl.OTH.samt
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Reversed (Sec 17(5))
                  </span>
                  <span className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                    {formatINR(
                      computation.itc_elg.itc_rev.RUL.iamt +
                        computation.itc_elg.itc_rev.RUL.camt +
                        computation.itc_elg.itc_rev.RUL.samt
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Net ITC (IGST)
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {formatINR(computation.itc_elg.itc_net.iamt)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    Net ITC (CGST+SGST)
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {formatINR(
                      computation.itc_elg.itc_net.camt + computation.itc_elg.itc_net.samt
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Table 6.1: Net Cash Settlement */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                    6.1
                  </span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Net Tax Cash Payment Due
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  After offsetting against eligible ITC
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    IGST Cash Due
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {formatINR(computation.tax_summary.net_cash_payable.iamt)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    CGST Cash Due
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {formatINR(computation.tax_summary.net_cash_payable.camt)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                    SGST Cash Due
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                    {formatINR(computation.tax_summary.net_cash_payable.samt)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-bold">
                    Total Cash Due
                  </span>
                  <span className="text-sm font-black font-mono text-indigo-700 dark:text-indigo-300 mt-0.5 block">
                    {formatINR(totalNetCash)}
                  </span>
                </div>
              </div>
            </div>

            {/* Collapsible GST Portal JSON Viewer */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setShowJSON(!showJSON)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>View Official GST Portal JSON Payload</span>
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showJSON ? "rotate-180" : ""}`} />
              </button>

              {showJSON && (
                <div className="p-4 bg-slate-950 border-t border-slate-800 relative">
                  <button
                    type="button"
                    onClick={copyJSON}
                    className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy Payload"}</span>
                  </button>
                  <pre className="text-emerald-400 text-xs font-mono overflow-x-auto pt-8 max-h-80">
                    {JSON.stringify(
                      generateGSTR3BJSON(sellerGSTIN || "", computation.ret_period, invoicesFor3B),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
