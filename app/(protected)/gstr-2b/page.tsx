"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Sparkles,
  Calendar,
  ShieldAlert,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  PeriodSelector,
  getCurrentMonthRange,
  getActivePresetLabel,
  toComparableDate,
} from "@/components/PeriodSelector";
import {
  PurchaseBill,
  getAllPurchases,
  savePurchase,
  getBusinessProfile,
  BusinessProfile,
} from "@/lib/storage";
import {
  runGstr2bReconciliation,
  ReconRecord,
  ReconSummary,
  ReconMatchStatus,
  Gstr2bSupplier,
} from "@/lib/reconciliationEngine";
import { autoMasterVendorFromPurchase } from "@/lib/vendorMaster";
import { formatINR } from "@/lib/gstBillingEngine";
import { downloadCSV } from "@/lib/export";
import toast from "react-hot-toast";

export default function GSTR2BReconcilePage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [reconList, setReconList] = useState<ReconRecord[]>([]);
  const [reconSummary, setReconSummary] = useState<ReconSummary | null>(null);
  const [copiedInvoiceNo, setCopiedInvoiceNo] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [portalSuppliers, setPortalSuppliers] = useState<Gstr2bSupplier[]>([]);

  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const loadData = async () => {
    try {
      const [purcs, prof] = await Promise.all([
        getAllPurchases(),
        getBusinessProfile(),
      ]);
      setPurchases(purcs);
      setProfile(prof);
    } catch (err: any) {
      toast.error("Failed to load records");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const periodPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const dt = p.date || (p as any).invoiceDate || "";
      if (!startDate || !endDate) return true;
      const compDate = toComparableDate(dt);
      if (!compDate) return true;
      return compDate >= startDate && compDate <= endDate;
    });
  }, [purchases, startDate, endDate]);

  useEffect(() => {
    if (portalSuppliers.length > 0) {
      const { records, summary } = runGstr2bReconciliation(
        portalSuppliers,
        periodPurchases
      );
      setReconList(records);
      setReconSummary(summary);
    }
  }, [portalSuppliers, periodPurchases]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const b2bSuppliers =
          json?.data?.docdata?.b2b || json?.b2b || json?.data?.b2b || [];

        if (!Array.isArray(b2bSuppliers) || b2bSuppliers.length === 0) {
          toast.error("No invoices found in GSTR-2B JSON");
          return;
        }

        setPortalSuppliers(b2bSuppliers);
        const { records, summary } = runGstr2bReconciliation(
          b2bSuppliers,
          periodPurchases
        );
        setReconList(records);
        setReconSummary(summary);
        toast.success("GSTR-2B file matched successfully!");
      } catch (err: any) {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadSample = () => {
    const sample: Gstr2bSupplier[] = [
      {
        ctin: "27AABCU9603R1ZM",
        trdnm: "Apex Industrial Supplies Ltd",
        inv: [
          {
            inum: "INV-2026-089",
            idt: "14-10-2026",
            val: 28320.0,
            pos: "27",
            itcavl: "Y",
            items: [
              { num: 1, txval: 24000, crt: 9, camt: 2160, srt: 9, samt: 2160 },
            ],
          },
        ],
      },
      {
        ctin: "07AAACG0561F1Z8",
        trdnm: "Falcon Logistics & Transport",
        inv: [
          {
            inum: "FL-8812",
            idt: "18-10-2026",
            val: 14160.0,
            pos: "07",
            itcavl: "Y",
            items: [{ num: 1, txval: 12000, irt: 18, iamt: 2160 }],
          },
        ],
      },
    ];
    setPortalSuppliers(sample);
    const { records, summary } = runGstr2bReconciliation(sample, periodPurchases);
    setReconList(records);
    setReconSummary(summary);
    toast.success("Loaded sample GSTR-2B data");
  };

  const handleBookPurchase = async (record: ReconRecord) => {
    try {
      const taxable =
        record.twoBValue -
        (record.twoBTax.igst +
          record.twoBTax.cgst +
          record.twoBTax.sgst +
          record.twoBTax.cess);

      const bill: PurchaseBill = {
        id: `pur-${Date.now()}`,
        invoiceNumber: record.invoiceNumber,
        date: record.invoiceDate || new Date().toISOString().split("T")[0],
        supplierName: record.supplierName,
        supplierGstin: record.supplierGstin,
        items: [
          {
            name: `Goods from ${record.supplierName}`,
            quantity: 1,
            rate: Math.max(0, taxable),
            taxPercent: 18,
          },
        ],
        interstate: record.twoBTax.igst > 0,
        itcEligibility: "eligible",
        paymentStatus: "Paid",
        taxableAmount: Math.max(0, taxable),
        cgst: record.twoBTax.cgst,
        sgst: record.twoBTax.sgst,
        igst: record.twoBTax.igst,
        cess: record.twoBTax.cess,
        total: record.twoBValue,
        created_at: Date.now(),
      };

      await savePurchase(bill);

      // Auto-master vendor profile
      await autoMasterVendorFromPurchase({
        supplierName: record.supplierName,
        supplierGstin: record.supplierGstin,
      }).catch((e) => console.warn("Vendor auto-master skipped:", e));

      await loadData();

      setReconList((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? { ...r, status: "EXACT_MATCH", bookValue: record.twoBValue, diff: 0 }
            : r
        )
      );

      toast.success(
        `Bill #${record.invoiceNumber} booked and vendor auto-mastered!`
      );
    } catch (e: any) {
      toast.error("Failed to book bill");
    }
  };

  const handleCopyReminder = (rec: ReconRecord) => {
    const text = `Hello ${rec.supplierName}, our books record invoice #${rec.invoiceNumber} for ₹${formatINR(rec.bookValue)} which is currently missing in our GSTR-2B return. To avoid Rule 88C / DRC-01B notices, kindly file this invoice in your GSTR-1 promptly. Thank you!`;
    navigator.clipboard.writeText(text);
    setCopiedInvoiceNo(rec.invoiceNumber);
    toast.success("Reminder message copied!");
    setTimeout(() => setCopiedInvoiceNo(null), 3000);
  };

  const handleExportCSV = () => {
    if (reconList.length === 0) return;
    let csv =
      "Status,Match Type,Supplier GSTIN,Supplier Name,Invoice No,Date,Portal 2B Amount,Book Amount,Difference,Section 16 Ineligible\r\n";
    for (const r of reconList) {
      csv += `"${r.status}","${r.matchType || "n/a"}","${r.supplierGstin}","${r.supplierName.replace(
        /"/g,
        '""'
      )}","${r.invoiceNumber}","${r.invoiceDate}",${r.twoBValue},${r.bookValue},${
        r.diff
      },"${r.isTimeBarredSection16 ? "YES" : "NO"}"\r\n`;
    }
    downloadCSV(`GSTR2B_Reconciliation_${Date.now()}.csv`, csv);
    toast.success("Excel CSV downloaded!");
  };

  // Filtered list
  const displayList = useMemo(() => {
    return reconList.filter((r) => {
      if (filter === "MATCHED" && r.status !== "EXACT_MATCH" && r.status !== "FUZZY_MATCH") {
        return false;
      }
      if (filter !== "ALL" && filter !== "MATCHED" && r.status !== filter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.invoiceNumber.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          r.supplierGstin.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reconList, filter, search]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              GSTR-2B Auto-Reconciliation Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Multi-tier statutory matching, Rule 88C DRC-01B variance alerts & Section 16(4) cut-off tracking
            </p>
          </div>
        </div>

        {/* Dedicated Return Period Bar with Quick Pills & Date Selector */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:px-5 sm:py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
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

        {/* Upload Action Box */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Upload GSTR-2B JSON from Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Download GSTR-2B JSON from gst.gov.in and upload here for automated 3-tier matching.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <label className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold transition cursor-pointer"
            >
              Try sample
            </button>
          </div>
        </div>

        {/* Rule 88C / DRC-01B Risk Warning Banner */}
        {reconSummary && reconSummary.isDrc01bHighRisk && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Statutory Rule 88C / DRC-01B Alert: High ITC Variance Risk
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200/60 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                  Variance: ₹{formatINR(reconSummary.drc01bVariance)} (
                  {reconSummary.drc01bVariancePercent}%)
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                Your purchase register has{" "}
                <strong>₹{formatINR(reconSummary.atRiskBookITC)}</strong> of ITC on bills
                that are missing from GSTR-2B. Claiming this in GSTR-3B before suppliers
                file will trigger an automated <strong>DRC-01B demand notice</strong>.
                Send reminders to vendors to file their GSTR-1 promptly.
              </p>
            </div>
          </div>
        )}

        {/* Section 16(4) Alert */}
        {reconSummary && reconSummary.timeBarredCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3.5 rounded-2xl flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Section 16(4) Statutory Notice:</strong>{" "}
              {reconSummary.timeBarredCount} invoice(s) are past the 30th November
              cut-off of the subsequent FY and are time-barred from ITC claims.
            </span>
          </div>
        )}

        {/* 3 Clean ITC Summary Cards */}
        {reconSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                Safe Claimable ITC
              </span>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                ₹{formatINR(reconSummary.safeClaimableITC)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {reconSummary.exactMatchCount + reconSummary.fuzzyMatchCount} bills verified for GSTR-3B
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                Unclaimed ITC (2B Only)
              </span>
              <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                ₹{formatINR(reconSummary.unclaimedITC)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {reconSummary.twoBOnlyCount} bills in portal, not yet in books
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                At-Risk ITC (Missing in 2B)
              </span>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                ₹{formatINR(reconSummary.atRiskBookITC)}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {reconSummary.bookOnlyCount} bills pending supplier GSTR-1 filing
              </span>
            </div>
          </div>
        )}

        {/* Results Workspace */}
        {reconList.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-3">
            {/* Filter pills & search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                {[
                  { key: "ALL", label: `All (${reconList.length})` },
                  {
                    key: "MATCHED",
                    label: `Matched (${
                      (reconSummary?.exactMatchCount || 0) +
                      (reconSummary?.fuzzyMatchCount || 0)
                    })`,
                  },
                  {
                    key: "AMOUNT_MISMATCH",
                    label: `Mismatch (${reconSummary?.mismatchCount || 0})`,
                  },
                  {
                    key: "TWOB_ONLY",
                    label: `Unclaimed (${reconSummary?.twoBOnlyCount || 0})`,
                  },
                  {
                    key: "BOOK_ONLY",
                    label: `Missing (${reconSummary?.bookOnlyCount || 0})`,
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                      filter === item.key
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search invoice or vendor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 w-full sm:w-48"
                />

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayList.map((rec) => {
                const isExact = rec.status === "EXACT_MATCH";
                const isFuzzy = rec.status === "FUZZY_MATCH";
                const isMismatch = rec.status === "AMOUNT_MISMATCH";
                const is2BOnly = rec.status === "TWOB_ONLY";
                const isBookOnly = rec.status === "BOOK_ONLY";

                return (
                  <div
                    key={rec.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {rec.supplierName}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isExact
                              ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50"
                              : isFuzzy
                              ? "bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50"
                              : isMismatch
                              ? "bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50"
                              : is2BOnly
                              ? "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50"
                              : "bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50"
                          }`}
                        >
                          {isExact
                            ? "Exact Match"
                            : isFuzzy
                            ? "Fuzzy Match"
                            : isMismatch
                            ? "Amount Mismatch"
                            : is2BOnly
                            ? "In 2B Only"
                            : "Missing in 2B"}
                        </span>

                        {rec.isTimeBarredSection16 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 border border-rose-300/60">
                            Sec 16(4) Ineligible
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
                          {rec.invoiceNumber}
                        </span>
                        <span> • </span>
                        <span>{rec.invoiceDate}</span>
                        {rec.supplierGstin && (
                          <>
                            <span> • </span>
                            <span className="font-mono">{rec.supplierGstin}</span>
                          </>
                        )}
                      </div>

                      {rec.statutoryNote && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                          {rec.statutoryNote}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          ₹{formatINR(rec.twoBValue || rec.bookValue)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {is2BOnly
                            ? "Portal 2B"
                            : isBookOnly
                            ? "Books Value"
                            : isMismatch
                            ? `Diff: ₹${rec.diff.toFixed(2)}`
                            : "Safe to Claim"}
                        </div>
                      </div>

                      {is2BOnly && (
                        <button
                          type="button"
                          onClick={() => handleBookPurchase(rec)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Book Bill
                        </button>
                      )}

                      {isBookOnly && (
                        <button
                          type="button"
                          onClick={() => handleCopyReminder(rec)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          {copiedInvoiceNo === rec.invoiceNumber ? "Copied" : "Remind"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
