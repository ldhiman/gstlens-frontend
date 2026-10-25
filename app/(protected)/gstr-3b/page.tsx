"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  Calendar,
  FileCheck,
  Building2,
  TrendingUp,
  Loader2,
  Copy,
  CheckCircle2,
  ChevronDown,
  ArrowLeft,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  Percent,
} from "lucide-react";

import { getAllInvoices } from "@/lib/storage";
import { computeGSTR3B, generateGSTR3BJSON, checkDRC01BRisk, GSTR3BComputation } from "@/lib/gstr3b";
import { generateGSTR3BCSV, downloadCSV } from "@/lib/export";
import { formatINR } from "@/lib/currency";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";

export default function GSTR3BPage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const sellerGSTIN = userProfile?.primary_gstin;

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [computation, setComputation] = useState<GSTR3BComputation | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showJSON, setShowJSON] = useState(false);

  /* ---------------- Guards ---------------- */
  useEffect(() => {
    if (userProfile && !sellerGSTIN) {
      router.replace("/profile");
    }
  }, [userProfile, sellerGSTIN, router]);

  /* ---------------- Load Invoices ---------------- */
  useEffect(() => {
    if (!sellerGSTIN) return;

    (async () => {
      const data = await getAllInvoices();
      setAllInvoices(data);
    })();
  }, [sellerGSTIN]);

  /* ---------------- Filter Invoices ---------------- */
  const invoicesFor3B = allInvoices.filter((inv) => {
    const d = inv.data || inv;
    const sGST = (d.seller_gstin || "").trim().toUpperCase();
    const bGST = (d.buyer_gstin || "").trim().toUpperCase();
    const uGST = (sellerGSTIN || "").trim().toUpperCase();

    // Include outward sales OR inward purchases for ITC
    const isRelevant = sGST === uGST || bGST === uGST || d.is_inward === true;
    if (!isRelevant) return false;

    if (month && year) {
      return inv.fp === `${month}${year}` || d.fp === `${month}${year}`;
    }
    return true;
  });

  /* ---------------- Generate Preview ---------------- */
  async function generatePreview() {
    if (!month || !year) {
      alert("Please select both month and year");
      return;
    }

    setGenerating(true);
    setComputation(null);

    setTimeout(() => {
      const fp = `${month}${year}`;
      const comp = computeGSTR3B(sellerGSTIN || "", fp, invoicesFor3B);
      setComputation(comp);
      setGenerating(false);
    }, 400);
  }

  /* ---------------- Actions ---------------- */
  function downloadJSON() {
    if (!computation) return;

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
  }

  function downloadExcel() {
    if (!computation) return;
    const csvContent = generateGSTR3BCSV(computation);
    downloadCSV(`GSTR3B_CA_Workpaper_${sellerGSTIN}_${computation.ret_period}.csv`, csvContent);
  }

  function copyJSON() {
    if (!computation) return;
    const payload = generateGSTR3BJSON(sellerGSTIN || "", computation.ret_period, invoicesFor3B);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Default to previous month
  useEffect(() => {
    if (!month && !year) {
      const prev = new Date();
      prev.setMonth(prev.getMonth() - 1);
      setMonth(String(prev.getMonth() + 1).padStart(2, "0"));
      setYear(String(prev.getFullYear()));
    }
  }, []);

  const periodLabel =
    month && year
      ? `${monthNames[parseInt(month) - 1]} ${year} (${month}${year})`
      : "Select period";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-32 md:pb-16">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" /> Portal-Compliant Schema
          </span>
        </div>

        {/* Title Banner */}
        <div className="p-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-slate-900 rounded-3xl text-white shadow-xl shadow-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-2">
              <FileCheck className="w-3.5 h-3.5 text-amber-300" /> Monthly Tax Return
            </div>
            <h1 className="text-2xl font-black tracking-tight">GSTR-3B Tax Liability & ITC Schedule</h1>
            <p className="text-indigo-100/90 text-xs sm:text-sm mt-1">
              Filing GSTIN: <span className="font-mono font-bold text-white">{sellerGSTIN || "Loading..."}</span>
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-white/20 sm:pl-6">
            <p className="text-[11px] text-indigo-200 uppercase font-semibold">Matched Invoices</p>
            <p className="text-2xl font-black font-mono">{invoicesFor3B.length}</p>
          </div>
        </div>

        {/* Return Period Selector */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Select Return Period (MMYYYY)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Filing Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Choose month</option>
                {monthNames.map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Financial Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="">Choose year</option>
                {["2024", "2025", "2026", "2027"].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generatePreview}
                disabled={!month || !year || generating}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                Compute Schedules
              </button>
            </div>
          </div>
        </div>

        {/* Computation Results */}
        {computation && (
          <div className="space-y-6 animate-slide-up">
            {/* Table 3.1: Outward Supplies & Reverse Charge */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                    3.1
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Outward Supplies & Tax Liability
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Period: {periodLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <SummaryCell
                  label="Taxable Value (3.1a)"
                  value={formatINR(computation.sup_details.osup_det.txval)}
                />
                <SummaryCell
                  label="IGST (Inter-State)"
                  value={formatINR(computation.sup_details.osup_det.iamt)}
                  color="text-indigo-600 dark:text-indigo-400"
                />
                <SummaryCell
                  label="CGST (Central)"
                  value={formatINR(computation.sup_details.osup_det.camt)}
                  color="text-purple-600 dark:text-purple-400"
                />
                <SummaryCell
                  label="SGST (State/UT)"
                  value={formatINR(computation.sup_details.osup_det.samt)}
                  color="text-purple-600 dark:text-purple-400"
                />
              </div>

              {computation.sup_details.isup_rev.txval > 0 && (
                <div className="mt-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    Table 3.1(d) Reverse Charge Liability:
                  </span>{" "}
                  {formatINR(
                    computation.sup_details.isup_rev.iamt +
                    computation.sup_details.isup_rev.camt +
                    computation.sup_details.isup_rev.samt
                  )}{" "}
                  (Must be paid in cash under GST rules).
                </div>
              )}
            </div>

            {/* Table 4: Eligible Input Tax Credit (ITC) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Eligible Input Tax Credit (ITC)
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Sec 16/17 Compliant
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <SummaryCell
                  label="4(A)(5) All Other ITC"
                  value={formatINR(
                    computation.itc_elg.itc_avl.OTH.iamt +
                    computation.itc_elg.itc_avl.OTH.camt +
                    computation.itc_elg.itc_avl.OTH.samt
                  )}
                />
                <SummaryCell
                  label="4(B)(1) Reversed (Sec 17(5))"
                  value={formatINR(
                    computation.itc_elg.itc_rev.RUL.iamt +
                    computation.itc_elg.itc_rev.RUL.camt +
                    computation.itc_elg.itc_rev.RUL.samt
                  )}
                  color="text-rose-600 dark:text-rose-400"
                />
                <SummaryCell
                  label="4(C) Net ITC (IGST)"
                  value={formatINR(computation.itc_elg.itc_net.iamt)}
                  color="text-emerald-600 dark:text-emerald-400"
                />
                <SummaryCell
                  label="4(C) Net ITC (CGST+SGST)"
                  value={formatINR(
                    computation.itc_elg.itc_net.camt + computation.itc_elg.itc_net.samt
                  )}
                  color="text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            {/* Net Tax Payable in Cash Summary */}
            <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Net Cash Tax Payable (After ITC Offset)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCell
                  label="IGST Cash Due"
                  value={formatINR(computation.tax_summary.net_cash_payable.iamt)}
                  bold
                />
                <SummaryCell
                  label="CGST Cash Due"
                  value={formatINR(computation.tax_summary.net_cash_payable.camt)}
                  bold
                />
                <SummaryCell
                  label="SGST Cash Due"
                  value={formatINR(computation.tax_summary.net_cash_payable.samt)}
                  bold
                />
                <SummaryCell
                  label="Total Cash Outflow"
                  value={formatINR(
                    computation.tax_summary.net_cash_payable.iamt +
                    computation.tax_summary.net_cash_payable.camt +
                    computation.tax_summary.net_cash_payable.samt
                  )}
                  color="text-indigo-700 dark:text-indigo-400"
                  bold
                />
              </div>
            </div>

            {/* Action Buttons: JSON + Excel Workpaper */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={downloadJSON}
                className="w-full sm:flex-1 py-3.5 px-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Portal JSON (GSTR-3B)
              </button>

              <button
                onClick={downloadExcel}
                className="w-full sm:flex-1 py-3.5 px-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl shadow-xs active:scale-98 transition flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Download CA Excel Workpaper
              </button>
            </div>

            {/* Collapsible JSON Viewer */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              <button
                onClick={() => setShowJSON(!showJSON)}
                className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition"
              >
                <span className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" /> View Official GST Portal JSON Payload
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showJSON ? "rotate-180" : ""}`} />
              </button>

              {showJSON && (
                <div className="p-4 bg-slate-950 border-t border-slate-850 relative">
                  <button
                    onClick={copyJSON}
                    className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition"
                  >
                    {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy Payload"}
                  </button>
                  <pre className="text-emerald-400 text-xs font-mono overflow-x-auto pt-8 max-h-80">
                    {JSON.stringify(generateGSTR3BJSON(sellerGSTIN || "", computation.ret_period, invoicesFor3B), null, 2)}
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

function SummaryCell({
  label,
  value,
  color = "text-slate-900 dark:text-slate-100",
  bold = false,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{label}</p>
      <p className={`text-sm sm:text-base ${bold ? "font-black" : "font-extrabold"} ${color} font-mono tabular-nums mt-0.5 truncate`}>
        {value}
      </p>
    </div>
  );
}
