"use client";

import { useState } from "react";
import {
  X,
  FileCode,
  Download,
  Building2,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { generateTallyXML, downloadTallyXML, TallyInvoiceRecord } from "@/lib/tally";
import { formatINR } from "@/lib/currency";
import toast from "react-hot-toast";

interface TallyExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userGSTIN: string;
  invoices: any[];
  defaultCompanyName?: string;
}

export default function TallyExportModal({
  isOpen,
  onClose,
  userGSTIN,
  invoices,
  defaultCompanyName = "My Business",
}: TallyExportModalProps) {
  const [voucherType, setVoucherType] = useState<"sales" | "purchase">("sales");
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [showGuide, setShowGuide] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  // Filter or map invoices based on selected voucher direction
  const eligibleInvoices: TallyInvoiceRecord[] = invoices.map((inv) => {
    const raw = inv.raw || inv.data || inv;
    return {
      id: inv.id || raw.invoice_number,
      data: {
        ...raw,
        direction: voucherType === "sales" ? "outward" : "inward",
        is_inward: voucherType === "purchase",
      },
    };
  });

  const totalAmount = eligibleInvoices.reduce(
    (sum, inv) => sum + Number(inv.data.invoice_total || 0),
    0
  );
  const totalTaxable = eligibleInvoices.reduce(
    (sum, inv) => sum + Number(inv.data.taxable_value || 0),
    0
  );

  const handleExport = () => {
    if (eligibleInvoices.length === 0) {
      toast.error("No invoices available to export.");
      return;
    }

    try {
      setIsExporting(true);
      const xml = generateTallyXML(
        userGSTIN,
        eligibleInvoices,
        companyName || "My Business"
      );

      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `Tally_${voucherType.toUpperCase()}_${userGSTIN || "VOUCHERS"}_${timestamp}.xml`;

      downloadTallyXML(filename, xml);
      toast.success(`Exported ${eligibleInvoices.length} ${voucherType} vouchers to Tally XML!`, {
        icon: "📑",
      });
      onClose();
    } catch (err: any) {
      console.error("Tally XML export error:", err);
      toast.error(err.message || "Failed to generate Tally XML");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 max-h-[92vh] sm:max-h-[88vh] flex flex-col z-10 overflow-hidden animate-slide-up">
        {/* Mobile Swipe Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Export to Tally Prime
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Tally XML v1.0 - 4.1
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Standard Tally voucher format with automatic GST ledger mapping
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Summary Overview Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Eligible Invoices</p>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {eligibleInvoices.length} invoices
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 dark:text-slate-400 font-medium">Total Value</p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                {formatINR(totalAmount)}
              </p>
            </div>
          </div>

          {/* Voucher Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Tally Voucher Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVoucherType("sales")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  voucherType === "sales"
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Sales Vouchers
                  </span>
                  {voucherType === "sales" && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Debit Customer, Credit Sales & Output GST (CGST/SGST/IGST)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVoucherType("purchase")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  voucherType === "purchase"
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Purchase Vouchers
                  </span>
                  {voucherType === "purchase" && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  Credit Vendor, Debit Purchase & Input GST for ITC claim
                </p>
              </button>
            </div>
          </div>

          {/* Company Name in Tally */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Tally Target Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Enterprises Pvt Ltd"
              className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 outline-none transition-all"
            />
            <p className="text-[10px] text-slate-400">
              Must match the active company name in your Tally Prime workspace
            </p>
          </div>

          {/* Feature Highlights & Specifications */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2 text-xs">
            <p className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Automated Tally Mapping Features:
            </p>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span>Automatic <strong>State Code to Tally State Name</strong> resolution (07 -&gt; Delhi)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span>GST slab separation (e.g. Sales Account @ 18%)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span>Section 170 automatic <strong>Round-Off ledger</strong> balancing debit/credit</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span>XML entity escaping to prevent XML parsing exceptions</span>
              </li>
            </ul>
          </div>

          {/* Import Guide Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 text-left text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                How to import this XML into Tally Prime?
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                {showGuide ? "Hide Steps" : "View Steps"}
              </span>
            </button>

            {showGuide && (
              <div className="p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[11px] leading-relaxed">
                <p><strong>1.</strong> In Tally Prime, open your target company.</p>
                <p><strong>2.</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Alt + O</kbd> (or click on <em>Import Data</em> from the top menu).</p>
                <p><strong>3.</strong> Select <strong>Vouchers</strong>.</p>
                <p><strong>4.</strong> In the file path prompt, select this downloaded <code className="text-indigo-600 dark:text-indigo-400 font-mono">.xml</code> file and press Enter.</p>
                <p><strong>5.</strong> All vouchers with party names, GSTINs, and tax breakdown will be imported instantly!</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-98 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || eligibleInvoices.length === 0}
            className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Generating XML..." : "Download Tally XML"}
          </button>
        </div>
      </div>
    </div>
  );
}
