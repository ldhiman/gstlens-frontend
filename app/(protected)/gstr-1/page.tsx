"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Download,
  Calendar,
  FileSpreadsheet,
  FileCode,
  Search,
  ArrowLeft,
  FileText,
  FileCheck,
  ChevronDown,
  Copy,
  CheckCircle2,
} from "lucide-react";

import { getAllInvoices } from "@/lib/storage";
import { generateGSTR1JSON } from "@/lib/gstr1";
import { generateGSTR1CSV, downloadCSV } from "@/lib/export";
import { formatINR } from "@/lib/gstBillingEngine";
import TallyExportModal from "@/components/TallyExportModal";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { PeriodSelector, getCurrentMonthRange, getActivePresetLabel, toComparableDate } from "@/components/PeriodSelector";
import toast from "react-hot-toast";

export default function GSTR1Page() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const sellerGSTIN = userProfile?.primary_gstin || userProfile?.gstin;

  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showTallyModal, setShowTallyModal] = useState(false);
  const [showJSON, setShowJSON] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAllInvoices();
        setInvoices(data);
      } catch (err: any) {
        toast.error("Failed to load invoices");
      }
    })();
  }, []);

  const currentFP = useMemo(() => {
    if (!endDate) return "";
    const parts = endDate.split("-");
    if (parts.length >= 2) return `${parts[1]}${parts[0]}`;
    return "";
  }, [endDate]);

  // Filter invoices for selected date range
  const periodInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const d = inv.data || inv || {};
      const invDate = d.invoice_date || d.date || inv.date || "";

      if (!startDate || !endDate) return true;
      const compDate = toComparableDate(invDate);
      if (!compDate) return true;
      return compDate >= startDate && compDate <= endDate;
    });
  }, [invoices, startDate, endDate]);

  // Clean metrics
  const totals = useMemo(() => {
    let sales = 0;
    let tax = 0;
    let b2b = 0;
    let b2c = 0;

    for (const inv of periodInvoices) {
      const d = inv.data || inv || {};
      const total = Number(d.invoice_total || d.grand_total || d.total || 0);
      sales += total;

      const gst = (Number(d.cgst) || 0) + (Number(d.sgst) || 0) + (Number(d.igst) || 0);
      tax += gst;

      if (d.buyer_gstin && d.buyer_gstin.trim().length === 15) {
        b2b++;
      } else {
        b2c++;
      }
    }

    return { sales, tax, b2b, b2c, count: periodInvoices.length };
  }, [periodInvoices]);

  // Search filtered list
  const displayInvoices = useMemo(() => {
    if (!search.trim()) return periodInvoices;
    const q = search.toLowerCase();
    return periodInvoices.filter((inv) => {
      const d = inv.data || inv || {};
      const no = (d.invoice_number || "").toLowerCase();
      const party = (d.customer_name || d.buyer_name || "").toLowerCase();
      const gstin = (d.buyer_gstin || "").toLowerCase();
      return no.includes(q) || party.includes(q) || gstin.includes(q);
    });
  }, [periodInvoices, search]);

  // Download actions
  const downloadJSON = () => {
    try {
      const json = generateGSTR1JSON(sellerGSTIN || "27AABCU9603R1ZM", currentFP, periodInvoices);
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GSTR1_${sellerGSTIN || "PORTAL"}_${currentFP}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("GSTR-1 JSON downloaded!");
    } catch (e: any) {
      toast.error("Download failed: " + e.message);
    }
  };

  const downloadExcel = () => {
    try {
      const csv = generateGSTR1CSV(sellerGSTIN || "27AABCU9603R1ZM", currentFP, periodInvoices);
      downloadCSV(`GSTR1_${currentFP}.csv`, csv);
      toast.success("Excel CSV downloaded!");
    } catch (e: any) {
      toast.error("Download failed: " + e.message);
    }
  };

  const gstr1Payload = useMemo(() => {
    if (!sellerGSTIN || !currentFP) return null;
    try {
      return generateGSTR1JSON(
        sellerGSTIN,
        currentFP,
        periodInvoices,
        userProfile?.trade_name || userProfile?.legal_name || "Taxpayer"
      );
    } catch {
      return null;
    }
  }, [sellerGSTIN, currentFP, periodInvoices, userProfile]);

  const copyJSON = () => {
    if (!gstr1Payload) return;
    navigator.clipboard.writeText(JSON.stringify(gstr1Payload, null, 2));
    setCopiedJSON(true);
    toast.success("GSTR-1 JSON copied to clipboard!");
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              GSTR-1 (Sales Return)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monthly sales turnover and GST liability statement
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
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
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

        {/* 3 Clean Summary Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
              Total Sales
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatINR(totals.sales)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {totals.count} invoice{totals.count !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
              GST Tax Amount
            </span>
            <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
              {formatINR(totals.tax)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Output tax on sales
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
              Breakdown
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
              {totals.b2b} <span className="text-sm font-normal text-slate-400">B2B</span> • {totals.b2c} <span className="text-sm font-normal text-slate-400">B2C</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Business vs Retail
            </span>
          </div>
        </div>

        {/* Primary Download Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={downloadJSON}
            className="flex-1 min-w-[200px] py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
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
            <span>Download Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTallyModal(true)}
            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileCode className="w-4 h-4" />
            <span>Export Tally</span>
          </button>
        </div>

        {/* Invoices List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* List Header & Search */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Invoices for this Period ({periodInvoices.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search invoice or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {displayInvoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No invoices found for this period.
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Invoice</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayInvoices.map((inv) => {
                      const d = inv.data || inv || {};
                      const isB2B = Boolean(d.buyer_gstin && d.buyer_gstin.trim().length === 15);
                      const amt = Number(d.invoice_total || d.grand_total || d.total || 0);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {d.invoice_number || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                            {d.invoice_date || "—"}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {d.customer_name || d.buyer_name || "Direct Customer"}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isB2B ? "bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"}`}>
                              {isB2B ? "B2B" : "B2C"}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatINR(amt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {displayInvoices.map((inv) => {
                  const d = inv.data || inv || {};
                  const isB2B = Boolean(d.buyer_gstin && d.buyer_gstin.trim().length === 15);
                  const amt = Number(d.invoice_total || d.grand_total || d.total || 0);

                  return (
                    <div key={inv.id} className="p-3.5 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {d.customer_name || d.buyer_name || "Direct Customer"}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">{d.invoice_number}</span>
                          <span> • </span>
                          <span>{d.invoice_date}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {formatINR(amt)}
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${isB2B ? "bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"}`}>
                          {isB2B ? "B2B" : "B2C"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Collapsible GST Portal JSON Preview */}
        {gstr1Payload && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setShowJSON(!showJSON)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span>View Official GST Portal JSON Payload</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showJSON ? "rotate-180" : ""}`}
              />
            </button>

            {showJSON && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 relative">
                <button
                  type="button"
                  onClick={copyJSON}
                  className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  {copiedJSON ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJSON ? "Copied" : "Copy Payload"}</span>
                </button>
                <pre className="text-emerald-400 text-xs font-mono overflow-x-auto pt-8 max-h-80">
                  {JSON.stringify(gstr1Payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>

      <TallyExportModal
        isOpen={showTallyModal}
        onClose={() => setShowTallyModal(false)}
        userGSTIN={sellerGSTIN || ""}
        invoices={periodInvoices}
        defaultCompanyName={userProfile?.business_name || "My Business"}
      />
    </div>
  );
}
