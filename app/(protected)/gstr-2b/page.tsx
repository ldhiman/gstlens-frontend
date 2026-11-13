"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  ShieldAlert,
  MessageCircle,
  X,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  Send,
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
  getAllClients,
  saveClient,
  Client,
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
import {
  buildGstr2bVendorReminder,
  openGstr2bWhatsAppReminder,
  Gstr2bReminderOptions,
} from "@/lib/whatsapp";
import toast from "react-hot-toast";

export default function GSTR2BReconcilePage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [reconList, setReconList] = useState<ReconRecord[]>([]);
  const [reconSummary, setReconSummary] = useState<ReconSummary | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [portalSuppliers, setPortalSuppliers] = useState<Gstr2bSupplier[]>([]);

  // WhatsApp Reminder Modal State
  const [reminderModalRec, setReminderModalRec] = useState<ReconRecord | null>(null);
  const [reminderPhone, setReminderPhone] = useState("");
  const [reminderTone, setReminderTone] = useState<"statutory_standard" | "urgent_drc01b" | "tax_mismatch">(
    "statutory_standard"
  );
  const [copiedReminder, setCopiedReminder] = useState(false);

  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  const loadData = async () => {
    try {
      const [purcs, prof, cls] = await Promise.all([
        getAllPurchases(),
        getBusinessProfile(),
        getAllClients().catch(() => []),
      ]);
      setPurchases(purcs);
      setProfile(prof);
      setClients(cls);
    } catch {
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
        toast.success("GSTR-2B matched with purchase register");
      } catch {
        toast.error("Invalid GSTR-2B JSON file");
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
          {
            inum: "INV-2026-092",
            idt: "16-10-2026",
            val: 18500.0,
            pos: "27",
            itcavl: "Y",
            items: [
              { num: 1, txval: 15678, crt: 9, camt: 1411, srt: 9, samt: 1411 },
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
      {
        ctin: "29AABCB3344D1Z2",
        trdnm: "Karnataka Heavy Spares",
        inv: [
          {
            inum: "KHS-2026-440",
            idt: "22-10-2026",
            val: 45000.0,
            pos: "29",
            itcavl: "Y",
            items: [{ num: 1, txval: 38135.59, irt: 18, iamt: 6864.41 }],
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

      toast.success(`Booked bill #${record.invoiceNumber}`);
    } catch {
      toast.error("Failed to book bill");
    }
  };

  // Open WhatsApp Remind Dialog
  const handleOpenWhatsAppModal = (rec: ReconRecord) => {
    setReminderModalRec(rec);
    setCopiedReminder(false);

    // Look up supplier phone from existing clients/vendors
    const matched = clients.find(
      (c) =>
        (rec.supplierGstin && c.gstin && c.gstin.toUpperCase() === rec.supplierGstin.toUpperCase()) ||
        (c.name && c.name.trim().toLowerCase() === rec.supplierName.trim().toLowerCase())
    );

    setReminderPhone(matched?.phone || rec.supplierPhone || "");

    if (rec.status === "AMOUNT_MISMATCH") {
      setReminderTone("tax_mismatch");
    } else if (reconSummary?.isDrc01bHighRisk) {
      setReminderTone("urgent_drc01b");
    } else {
      setReminderTone("statutory_standard");
    }
  };

  // Helper to construct WhatsApp reminder options
  const getWhatsAppOptions = (): Gstr2bReminderOptions | null => {
    if (!reminderModalRec) return null;
    const estTax =
      reminderModalRec.twoBTax.igst +
        reminderModalRec.twoBTax.cgst +
        reminderModalRec.twoBTax.sgst +
        reminderModalRec.twoBTax.cess ||
      reminderModalRec.taxDiff ||
      Math.round(((reminderModalRec.bookValue * 0.18) / 1.18) * 100) / 100;

    return {
      supplierName: reminderModalRec.supplierName,
      supplierGstin: reminderModalRec.supplierGstin,
      supplierPhone: reminderPhone,
      invoiceNumber: reminderModalRec.invoiceNumber,
      invoiceDate: reminderModalRec.invoiceDate,
      invoiceValue: reminderModalRec.bookValue || reminderModalRec.twoBValue,
      taxAmount: estTax,
      taxDiff: reminderModalRec.taxDiff || reminderModalRec.diff,
      twoBValue: reminderModalRec.twoBValue,
      buyerBusinessName: profile?.businessName || profile?.tradeName,
      buyerGstin: profile?.gstin,
      tone: reminderTone,
    };
  };

  const handleSendWhatsApp = async () => {
    const opts = getWhatsAppOptions();
    if (!opts) return;

    // Persist phone to client record if provided
    const cleanDigits = reminderPhone.replace(/[^0-9]/g, "");
    if (cleanDigits && reminderModalRec) {
      const existing = clients.find(
        (c) =>
          (reminderModalRec.supplierGstin &&
            c.gstin &&
            c.gstin.toUpperCase() === reminderModalRec.supplierGstin.toUpperCase()) ||
          c.name.trim().toLowerCase() === reminderModalRec.supplierName.trim().toLowerCase()
      );
      if (existing && existing.phone !== cleanDigits) {
        const updated = { ...existing, phone: cleanDigits };
        await saveClient(updated).catch(() => {});
        setClients((prev) => prev.map((c) => (c.id === existing.id ? updated : c)));
      }
    }

    openGstr2bWhatsAppReminder(opts);
    toast.success("Opening WhatsApp");
    setReminderModalRec(null);
  };

  const handleCopyWhatsAppMessage = () => {
    const opts = getWhatsAppOptions();
    if (!opts) return;
    const msg = buildGstr2bVendorReminder(opts);
    navigator.clipboard.writeText(msg);
    setCopiedReminder(true);
    toast.success("Reminder message copied");
    setTimeout(() => setCopiedReminder(false), 3000);
  };

  const handleExportCSV = () => {
    if (reconList.length === 0) return;
    let csv =
      "Status,Match Type,Supplier GSTIN,Supplier Name,Invoice No,Date,Portal 2B Amount,Book Amount,Difference,Section 16 Ineligible,Statutory Note\r\n";
    for (const r of reconList) {
      csv += `"${r.status}","${r.matchType || "n/a"}","${r.supplierGstin}","${r.supplierName.replace(
        /"/g,
        '""'
      )}","${r.invoiceNumber}","${r.invoiceDate}",${r.twoBValue},${r.bookValue},${
        r.diff
      },"${r.isTimeBarredSection16 ? "YES" : "NO"}","${(r.statutoryNote || "").replace(/"/g, '""')}"\r\n`;
    }
    downloadCSV(`GSTR2B_Reconciliation_${Date.now()}.csv`, csv);
    toast.success("Exported reconciliation ledger");
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

  // ITC Distribution Percentages for the Visual Breakdown Bar
  const itcMetrics = useMemo(() => {
    if (!reconSummary) return null;
    const safe = reconSummary.safeClaimableITC || 0;
    const atRisk = reconSummary.atRiskBookITC || 0;
    const unclaimed = reconSummary.unclaimedITC || 0;
    const total = safe + atRisk + unclaimed;

    if (total === 0) {
      return { safePct: 0, atRiskPct: 0, unclaimedPct: 0, total: 0 };
    }

    return {
      safePct: Math.round((safe / total) * 100),
      atRiskPct: Math.round((atRisk / total) * 100),
      unclaimedPct: Math.round((unclaimed / total) * 100),
      total,
    };
  }, [reconSummary]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-20">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              GSTR-2B reconciliation
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Statutory 3-tier matching between GSTR-2B portal data and purchase register.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload GSTR-2B JSON</span>
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
              className="px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
            >
              Load sample
            </button>
          </div>
        </div>

        {/* Period Selector Bar */}
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium block">
                Filing period
              </span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
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

        {/* Rule 88C / DRC-01B Risk Callout */}
        {reconSummary && reconSummary.isDrc01bHighRisk && (
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 p-4 rounded-xl flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-rose-100/80 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                  Rule 88C / DRC-01B variance notice risk
                </h3>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 tabular-nums">
                  Variance: {formatINR(reconSummary.drc01bVariance)} ({reconSummary.drc01bVariancePercent}%)
                </span>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                Purchase books contain <strong>{formatINR(reconSummary.atRiskBookITC)}</strong> of tax credit on bills missing in GSTR-2B. Claiming this in GSTR-3B before suppliers file will trigger an automated DRC-01B statutory notice.
              </p>
            </div>
          </div>
        )}

        {/* Section 16(4) Cut-off Warning */}
        {reconSummary && reconSummary.timeBarredCount > 0 && (
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Section 16(4) time-barred notice:</strong> {reconSummary.timeBarredCount} invoice(s) are past the 30th November deadline of the subsequent financial year and cannot be claimed as ITC.
            </span>
          </div>
        )}

        {/* The One Bright Moment: Statutory ITC Breakdown & Allocation Bar */}
        {reconSummary && itcMetrics && (
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Input tax credit summary
              </span>
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 tabular-nums">
                Total reconciled: {reconSummary.totalCount} invoices
              </span>
            </div>

            {/* 3 Metric Figures */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Eligible claimable ITC
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                </div>
                <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-1 tabular-nums">
                  {formatINR(reconSummary.safeClaimableITC)}
                </div>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-1">
                  {reconSummary.exactMatchCount + reconSummary.fuzzyMatchCount} bills verified for GSTR-3B
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    At-risk ITC (missing in 2B)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-500" />
                </div>
                <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-1 tabular-nums">
                  {formatINR(reconSummary.atRiskBookITC)}
                </div>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-1">
                  {reconSummary.bookOnlyCount} bills pending supplier GSTR-1 filing
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Unclaimed ITC (2B portal only)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-500" />
                </div>
                <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-1 tabular-nums">
                  {formatINR(reconSummary.unclaimedITC)}
                </div>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block mt-1">
                  {reconSummary.twoBOnlyCount} bills not yet recorded in purchase books
                </span>
              </div>
            </div>

            {/* Proportional Segmented Progress Bar */}
            {itcMetrics.total > 0 && (
              <div className="space-y-2 pt-1">
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
                  {itcMetrics.safePct > 0 && (
                    <div
                      style={{ width: `${itcMetrics.safePct}%` }}
                      className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
                      title={`Safe Claimable: ${itcMetrics.safePct}%`}
                    />
                  )}
                  {itcMetrics.atRiskPct > 0 && (
                    <div
                      style={{ width: `${itcMetrics.atRiskPct}%` }}
                      className="h-full bg-rose-500 dark:bg-rose-600 transition-all duration-300"
                      title={`At Risk: ${itcMetrics.atRiskPct}%`}
                    />
                  )}
                  {itcMetrics.unclaimedPct > 0 && (
                    <div
                      style={{ width: `${itcMetrics.unclaimedPct}%` }}
                      className="h-full bg-amber-500 dark:bg-amber-600 transition-all duration-300"
                      title={`Unclaimed: ${itcMetrics.unclaimedPct}%`}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
                      Claimable ({itcMetrics.safePct}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 dark:bg-rose-600" />
                      At risk ({itcMetrics.atRiskPct}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-600" />
                      Unclaimed ({itcMetrics.unclaimedPct}%)
                    </span>
                  </div>
                  <span className="font-mono tabular-nums">
                    Total ITC: {formatINR(itcMetrics.total)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State Prompt if no file loaded */}
        {reconList.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 mx-auto flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No GSTR-2B data loaded
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Upload your GSTR-2B JSON return file from the GST portal (gst.gov.in) to automatically cross-check against recorded purchase bills.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
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
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                Try sample dataset
              </button>
            </div>
          </div>
        )}

        {/* Reconciled Ledger Table */}
        {reconList.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden space-y-0">
            {/* Toolbar: Filter Segmented Control & Search */}
            <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Segmented Control */}
              <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg text-xs overflow-x-auto">
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
                    label: `Discrepancies (${reconSummary?.mismatchCount || 0})`,
                  },
                  {
                    key: "BOOK_ONLY",
                    label: `Missing in 2B (${reconSummary?.bookOnlyCount || 0})`,
                  },
                  {
                    key: "TWOB_ONLY",
                    label: `Portal only (${reconSummary?.twoBOnlyCount || 0})`,
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                      filter === item.key
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Search & Export */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search invoice or vendor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    <th className="py-2.5 px-4 font-normal">Status</th>
                    <th className="py-2.5 px-4 font-normal">Invoice & Vendor</th>
                    <th className="py-2.5 px-4 font-normal">Date</th>
                    <th className="py-2.5 px-4 font-normal text-right">Portal 2B</th>
                    <th className="py-2.5 px-4 font-normal text-right">Purchase books</th>
                    <th className="py-2.5 px-4 font-normal text-right">Difference</th>
                    <th className="py-2.5 px-4 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {displayList.map((rec) => {
                    const isExact = rec.status === "EXACT_MATCH";
                    const isFuzzy = rec.status === "FUZZY_MATCH";
                    const isMismatch = rec.status === "AMOUNT_MISMATCH";
                    const is2BOnly = rec.status === "TWOB_ONLY";
                    const isBookOnly = rec.status === "BOOK_ONLY";

                    return (
                      <tr
                        key={rec.id}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                isExact
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                                  : isFuzzy
                                  ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60"
                                  : isMismatch
                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"
                                  : is2BOnly
                                  ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60"
                                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60"
                              }`}
                            >
                              {isExact
                                ? "Exact match"
                                : isFuzzy
                                ? "Fuzzy match"
                                : isMismatch
                                ? "Value mismatch"
                                : is2BOnly
                                ? "In 2B only"
                                : "Missing in 2B"}
                            </span>

                            {rec.isTimeBarredSection16 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                Sec 16(4)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Invoice & Vendor */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {rec.supplierName}
                          </div>
                          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                            <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                              #{rec.invoiceNumber}
                            </span>
                            {rec.supplierGstin && (
                              <>
                                <span>•</span>
                                <span>{rec.supplierGstin}</span>
                              </>
                            )}
                          </div>
                          {rec.statutoryNote && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                              {rec.statutoryNote}
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                          {rec.invoiceDate || "—"}
                        </td>

                        {/* 2B Portal Value */}
                        <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                          {rec.twoBValue > 0 ? formatINR(rec.twoBValue) : "—"}
                        </td>

                        {/* Purchase Books Value */}
                        <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                          {rec.bookValue > 0 ? formatINR(rec.bookValue) : "—"}
                        </td>

                        {/* Difference */}
                        <td className="py-3 px-4 whitespace-nowrap text-right font-mono tabular-nums">
                          {rec.diff > 0 ? (
                            <span
                              className={
                                isMismatch
                                  ? "text-amber-600 dark:text-amber-400 font-medium"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }
                            >
                              {formatINR(rec.diff)}
                            </span>
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-600">₹0.00</span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          {is2BOnly && (
                            <button
                              type="button"
                              onClick={() => handleBookPurchase(rec)}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition cursor-pointer"
                            >
                              Book bill
                            </button>
                          )}

                          {(isBookOnly || isMismatch) && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppModal(rec)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          {(isExact || isFuzzy) && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                              <span>Ready</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Compact List View */}
            <div className="lg:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
              {displayList.map((rec) => {
                const isExact = rec.status === "EXACT_MATCH";
                const isFuzzy = rec.status === "FUZZY_MATCH";
                const isMismatch = rec.status === "AMOUNT_MISMATCH";
                const is2BOnly = rec.status === "TWOB_ONLY";
                const isBookOnly = rec.status === "BOOK_ONLY";

                return (
                  <div key={rec.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                              isExact
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                                : isFuzzy
                                ? "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/60"
                                : isMismatch
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60"
                                : is2BOnly
                                ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60"
                                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60"
                            }`}
                          >
                            {isExact
                              ? "Exact match"
                              : isFuzzy
                              ? "Fuzzy match"
                              : isMismatch
                              ? "Value mismatch"
                              : is2BOnly
                              ? "In 2B only"
                              : "Missing in 2B"}
                          </span>

                          {rec.isTimeBarredSection16 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                              Sec 16(4)
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 mt-1">
                          {rec.supplierName}
                        </div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                          #{rec.invoiceNumber} • {rec.invoiceDate}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-medium text-xs text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatINR(rec.twoBValue || rec.bookValue)}
                        </div>
                        {rec.diff > 0 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                            Diff: {formatINR(rec.diff)}
                          </div>
                        )}
                      </div>
                    </div>

                    {rec.statutoryNote && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        {rec.statutoryNote}
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/50">
                      {is2BOnly && (
                        <button
                          type="button"
                          onClick={() => handleBookPurchase(rec)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          Book bill
                        </button>
                      )}

                      {(isBookOnly || isMismatch) && (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppModal(rec)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Remind on WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {displayList.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
                No invoices match the current filter or search criteria.
              </div>
            )}
          </div>
        )}
      </main>

      {/* WhatsApp Statutory Compliance Reminder Dialog */}
      {reminderModalRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                  <span>Vendor WhatsApp reminder</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Statutory ITC compliance notice under Section 16(2)(aa) CGST Act.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setReminderModalRec(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Vendor & Invoice Meta */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 flex items-start justify-between text-xs">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    {reminderModalRec.supplierName}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 block">
                    GSTIN: {reminderModalRec.supplierGstin || "Unregistered / Missing"}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 block">
                    Invoice #{reminderModalRec.invoiceNumber} • {reminderModalRec.invoiceDate}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">
                    ITC Tax at stake
                  </span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums text-xs">
                    {formatINR(
                      reminderModalRec.twoBTax.igst +
                        reminderModalRec.twoBTax.cgst +
                        reminderModalRec.twoBTax.sgst +
                        reminderModalRec.twoBTax.cess ||
                        reminderModalRec.taxDiff ||
                        Math.round(((reminderModalRec.bookValue * 0.18) / 1.18) * 100) / 100
                    )}
                  </span>
                </div>
              </div>

              {/* Recipient Phone Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                  Supplier WhatsApp mobile number
                </label>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    +91
                  </div>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={reminderPhone}
                    onChange={(e) => setReminderPhone(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-400"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Number is auto-saved to vendor profile for future automated reminders.
                </p>
              </div>

              {/* Reminder Tone / Statutory Notice Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block">
                  Statutory notice template
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "statutory_standard", label: "Standard 16(2)(aa)" },
                    { key: "urgent_drc01b", label: "Urgent DRC-01B" },
                    { key: "tax_mismatch", label: "Value variance" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setReminderTone(t.key as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition cursor-pointer text-center ${
                        reminderTone === t.key
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                          : "border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Live Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Message preview</span>
                  <span className="text-[10px] font-mono">WhatsApp text format</span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
                  {getWhatsAppOptions()
                    ? buildGstr2bVendorReminder(getWhatsAppOptions()!)
                    : ""}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopyWhatsAppMessage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              >
                {copiedReminder ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy text</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReminderModalRec(null)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
