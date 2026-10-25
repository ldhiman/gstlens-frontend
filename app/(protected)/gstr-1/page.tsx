"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Calendar,
  Building2,
  ChevronDown,
  CheckCircle2,
  Copy,
  Loader2,
  ArrowLeft,
  FileSpreadsheet,
  ShieldCheck,
  FileCode,
} from "lucide-react";

import { getAllInvoices } from "@/lib/storage";
import { generateGSTR1JSON } from "@/lib/gstr1";
import { generateGSTR1CSV, downloadCSV } from "@/lib/export";
import TallyExportModal from "@/components/TallyExportModal";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";

export default function GSTR1Page() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const sellerGSTIN = userProfile?.primary_gstin;

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showJSON, setShowJSON] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTallyModal, setShowTallyModal] = useState(false);

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
  const invoicesForGSTR1 = useMemo(() => {
    if (!sellerGSTIN) return [];
    return allInvoices.filter((inv) => {
      const d = inv.data || inv;
      const matchSeller = d.seller_gstin === sellerGSTIN;
      if (!matchSeller) return false;
      if (month && year) {
        return inv.fp === `${month}${year}` || d.fp === `${month}${year}`;
      }
      return true;
    });
  }, [allInvoices, sellerGSTIN, month, year]);

  /* ---------------- Generate Preview ---------------- */
  async function generatePreview() {
    if (!month || !year) {
      alert("Please select both month and year");
      return;
    }

    setGenerating(true);
    setPreview(null);

    setTimeout(() => {
      const fp = `${month}${year}`;
      const json = generateGSTR1JSON(sellerGSTIN || "", fp, invoicesForGSTR1);
      setPreview(json);
      setGenerating(false);
      setShowJSON(false);
    }, 400);
  }

  /* ---------------- Actions ---------------- */
  function downloadJSON() {
    if (!preview) return;

    const blob = new Blob([JSON.stringify(preview, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${sellerGSTIN}_${preview.fp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadExcel() {
    if (!sellerGSTIN) return;
    const fp = `${month}${year}`;
    const csvContent = generateGSTR1CSV(sellerGSTIN, fp, invoicesForGSTR1);
    downloadCSV(`GSTR1_CA_Workpaper_${sellerGSTIN}_${fp}.csv`, csvContent);
  }

  function copyJSON() {
    if (!preview) return;
    navigator.clipboard.writeText(JSON.stringify(preview, null, 2));
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="w-3.5 h-3.5" /> GSTR-1 Offline Tool Ready
          </span>
        </div>

        {/* Title Banner */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-slate-900 rounded-3xl text-white shadow-xl shadow-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md mb-2">
              <FileText className="w-3.5 h-3.5 text-amber-300" /> Outward Supplies Return
            </div>
            <h1 className="text-2xl font-black tracking-tight">GSTR-1 Sales & Turnover Register</h1>
            <p className="text-indigo-100/90 text-xs sm:text-sm mt-1">
              Filing GSTIN: <span className="font-mono font-bold text-white">{sellerGSTIN || "Loading..."}</span>
            </p>
          </div>

          <div className="text-right sm:border-l sm:border-white/20 sm:pl-6">
            <p className="text-[11px] text-indigo-200 uppercase font-semibold">B2B + B2C Sales</p>
            <p className="text-2xl font-black font-mono">{invoicesForGSTR1.length}</p>
          </div>
        </div>

        {/* Period Selector Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Select Return Period (MMYYYY)</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Month
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
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Generate GSTR-1
              </button>
            </div>
          </div>
        </div>

        {/* Preview Results */}
        {preview && (
          <div className="space-y-6 animate-slide-up">
            {/* Counts Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">B2B Invoices (Table 4)</p>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                  {preview.b2b?.length || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Registered businesses with GSTIN</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">B2CS Supplies (Table 7)</p>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
                  {preview.b2cs?.length || 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Aggregated by POS & Tax rate</p>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Invoices Included</p>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                  {invoicesForGSTR1.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">For period {monthNames[+month - 1]} {year}</p>
              </div>
            </div>

            {/* Action Buttons: JSON + Excel + Tally Prime XML */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                onClick={downloadJSON}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Portal JSON (GSTR-1)
              </button>

              <button
                onClick={downloadExcel}
                className="w-full py-3.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-2xl shadow-xs active:scale-98 transition flex items-center justify-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> CA Excel Workpaper
              </button>

              <button
                onClick={() => setShowTallyModal(true)}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-amber-500/20 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <FileCode className="w-4 h-4" /> Export to Tally XML
              </button>
            </div>

            {/* JSON Collapsible */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              <button
                onClick={() => setShowJSON(!showJSON)}
                className="w-full px-5 py-4 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" /> View GSTR-1 JSON Payload
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
                    {JSON.stringify(preview, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Tally Prime XML Export Modal */}
      <TallyExportModal
        isOpen={showTallyModal}
        onClose={() => setShowTallyModal(false)}
        userGSTIN={sellerGSTIN || ""}
        invoices={invoicesForGSTR1}
        defaultCompanyName={userProfile?.business_name || "My Business"}
      />
    </div>
  );
}
