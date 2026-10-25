"use client";

import { useState, useMemo, useEffect } from "react";
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
  Calendar,
  Filter,
  Search,
  CheckSquare,
  Square,
  Check,
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
  initialSelectedIds?: string[];
}

type DatePreset = "all" | "this_month" | "last_month" | "this_fy" | "custom";

/**
 * Robust date parser supporting DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY
 */
function parseInvoiceDate(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const cleaned = dateStr.replace(/[./]/g, "-").trim();
  const parts = cleaned.split("-");
  if (parts.length >= 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      return isNaN(date.getTime()) ? null : date;
    }
    // DD-MM-YYYY
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y = 2000 + y;
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TallyExportModal({
  isOpen,
  onClose,
  userGSTIN,
  invoices,
  defaultCompanyName = "My Business",
  initialSelectedIds,
}: TallyExportModalProps) {
  const [voucherType, setVoucherType] = useState<"sales" | "purchase">("sales");
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [showGuide, setShowGuide] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Invoice Checklist Search & Selection State
  const [invoiceSearch, setInvoiceSearch] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Handle Preset Change
  const handlePresetSelect = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toISODate(start));
      setEndDate(toISODate(end));
    } else if (preset === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toISODate(start));
      setEndDate(toISODate(end));
    } else if (preset === "this_fy") {
      const m = now.getMonth(); // 0-11
      const fyStartYear = m >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const start = new Date(fyStartYear, 3, 1);
      const end = new Date(fyStartYear + 1, 2, 31);
      setStartDate(toISODate(start));
      setEndDate(toISODate(end));
    }
  };

  // Normalized invoices list with party names, totals, and parsed dates
  const normalizedInvoices = useMemo(() => {
    return invoices.map((inv, idx) => {
      const raw = inv.raw || inv.data || inv;
      const invId = String(inv.id || raw._local_id || raw.invoice_number || `inv_${idx}`);
      const invNum = raw.invoice_number || inv.name || `INV-${idx + 1}`;
      const invDate = raw.invoice_date || inv.date || "-";
      const parsedDate = parseInvoiceDate(invDate);

      const partyName =
        voucherType === "sales"
          ? raw.buyer_gstin_info?.trade_name ||
            raw.buyer_gstin_info?.legal_name ||
            raw.buyer_gstin ||
            "Cash Customer"
          : raw.seller_gstin_info?.trade_name ||
            raw.seller_gstin_info?.legal_name ||
            raw.seller_gstin ||
            "Vendor Supplier";

      const partyGstin =
        voucherType === "sales"
          ? raw.buyer_gstin || "URP / B2C"
          : raw.seller_gstin || "URP / Inward";

      return {
        id: invId,
        invoice_number: invNum,
        invoice_date: invDate,
        parsedDate,
        partyName,
        partyGstin,
        taxable_value: Number(raw.taxable_value || 0),
        invoice_total: Number(raw.invoice_total || inv.amount || 0),
        raw,
      };
    });
  }, [invoices, voucherType]);

  // Filter invoices strictly by Date Range
  const dateFilteredInvoices = useMemo(() => {
    return normalizedInvoices.filter((item) => {
      if (!startDate && !endDate) return true;
      if (!item.parsedDate) return true; // Keep invoices without date if no strict filter
      const time = item.parsedDate.getTime();
      if (startDate) {
        const start = new Date(startDate + "T00:00:00").getTime();
        if (time < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate + "T23:59:59").getTime();
        if (time > end) return false;
      }
      return true;
    });
  }, [normalizedInvoices, startDate, endDate]);

  // Synchronize selection whenever date range filter, preset, or modal open state changes
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedIds && initialSelectedIds.length > 0) {
        setSelectedIds(new Set(initialSelectedIds));
      } else {
        setSelectedIds(new Set(dateFilteredInvoices.map((i) => i.id)));
      }
    }
  }, [isOpen, datePreset, startDate, endDate, dateFilteredInvoices.length, voucherType]);

  // Filter invoices further by text search within checklist
  const visibleInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return dateFilteredInvoices;
    const q = invoiceSearch.toLowerCase().trim();
    return dateFilteredInvoices.filter(
      (item) =>
        item.invoice_number.toLowerCase().includes(q) ||
        item.partyName.toLowerCase().includes(q) ||
        item.partyGstin.toLowerCase().includes(q) ||
        item.invoice_date.toLowerCase().includes(q)
    );
  }, [dateFilteredInvoices, invoiceSearch]);

  // Toggle single invoice checkbox
  const toggleInvoice = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Select all visible
  const selectAllVisible = () => {
    const next = new Set(selectedIds);
    visibleInvoices.forEach((i) => next.add(i.id));
    setSelectedIds(next);
  };

  // Deselect all visible
  const deselectAllVisible = () => {
    const next = new Set(selectedIds);
    visibleInvoices.forEach((i) => next.delete(i.id));
    setSelectedIds(next);
  };

  // Compile final selected invoices for Tally Prime export
  const invoicesToExport: TallyInvoiceRecord[] = useMemo(() => {
    return dateFilteredInvoices
      .filter((inv) => selectedIds.has(inv.id))
      .map((inv) => ({
        id: inv.id,
        data: {
          ...inv.raw,
          direction: voucherType === "sales" ? "outward" : "inward",
          is_inward: voucherType === "purchase",
        },
      }));
  }, [dateFilteredInvoices, selectedIds, voucherType]);

  const totalAmount = invoicesToExport.reduce(
    (sum, inv) => sum + Number(inv.data.invoice_total || 0),
    0
  );
  const totalTaxable = invoicesToExport.reduce(
    (sum, inv) => sum + Number(inv.data.taxable_value || 0),
    0
  );

  if (!isOpen) return null;

  const handleExport = () => {
    if (invoicesToExport.length === 0) {
      toast.error("Please select at least 1 invoice to export.");
      return;
    }

    try {
      setIsExporting(true);
      const xml = generateTallyXML(
        userGSTIN,
        invoicesToExport,
        companyName || "My Business"
      );

      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `Tally_${voucherType.toUpperCase()}_${userGSTIN || "VOUCHERS"}_${timestamp}.xml`;

      downloadTallyXML(filename, xml);
      toast.success(
        `Successfully exported ${invoicesToExport.length} ${voucherType} voucher${
          invoicesToExport.length > 1 ? "s" : ""
        } to Tally XML!`,
        { icon: "📑" }
      );
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
      <div className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 max-h-[94vh] sm:max-h-[90vh] flex flex-col z-10 overflow-hidden animate-slide-up">
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
          {/* Voucher Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              1. Tally Voucher Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVoucherType("sales")}
                className={`p-3 rounded-2xl border text-left transition-all ${
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
                className={`p-3 rounded-2xl border text-left transition-all ${
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

          {/* Date Range Filtering Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                2. Filter by Date Range
              </label>
              {(startDate || endDate) && (
                <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                  {startDate || "Start"} to {endDate || "End"}
                </span>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all", label: "All Dates" },
                { id: "this_month", label: "This Month" },
                { id: "last_month", label: "Last Month" },
                { id: "this_fy", label: "This FY (Apr - Mar)" },
                { id: "custom", label: "Custom Range" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id as DatePreset)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
                    datePreset === preset.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {(datePreset === "custom" || startDate || endDate) && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block mb-1">
                    From Date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setStartDate(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block mb-1">
                    To Date
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setEndDate(e.target.value);
                    }}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Invoice Selection Checklist */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
            {/* Checklist Header & Search */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    3. Select Invoices to Export
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {invoicesToExport.length} of {dateFilteredInvoices.length} selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={deselectAllVisible}
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Quick Search within invoices */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by invoice #, party name, or GSTIN..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-indigo-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Checklist Scrollable List */}
            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {visibleInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No invoices match the chosen date range or search filter.
                </div>
              ) : (
                visibleInvoices.map((inv) => {
                  const isChecked = selectedIds.has(inv.id);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => toggleInvoice(inv.id)}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isChecked
                          ? "bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center transition flex-shrink-0 ${
                            isChecked
                              ? "bg-indigo-600 text-white"
                              : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {inv.invoice_number}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {inv.invoice_date}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {inv.partyName}{" "}
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({inv.partyGstin})
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                          {formatINR(inv.invoice_total)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                          Taxable: {formatINR(inv.taxable_value)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Company Name in Tally */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              4. Tally Target Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Enterprises Pvt Ltd"
              className="w-full bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:border-indigo-500 outline-none transition"
            />
            <p className="text-[10px] text-slate-400">
              Must match the active company name in your Tally Prime workspace
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5 text-xs">
            <p className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Automated Tally Mapping Features:
            </p>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span>State Code to Tally State Name resolution (e.g. 07 -&gt; Delhi)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span>GST slab separation & Section 170 automatic Round-Off balancing</span>
              </li>
            </ul>
          </div>

          {/* Import Guide Accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800/40 text-left text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
              <div className="p-3.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[11px] leading-relaxed">
                <p><strong>1.</strong> In Tally Prime, open your target company.</p>
                <p><strong>2.</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">Alt + O</kbd> (Import Data).</p>
                <p><strong>3.</strong> Select <strong>Vouchers</strong>.</p>
                <p><strong>4.</strong> Select this downloaded <code className="text-indigo-600 dark:text-indigo-400 font-mono">.xml</code> file and press Enter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 space-y-3">
          {/* Real-time Balance Summary */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="text-slate-500 dark:text-slate-400">
              Selected:{" "}
              <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                {invoicesToExport.length} vouchers
              </strong>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] mr-1.5 font-mono">
                Taxable: {formatINR(totalTaxable)}
              </span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                Total: {formatINR(totalAmount)}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-98 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || invoicesToExport.length === 0}
              className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 active:scale-98 transition flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isExporting
                ? "Generating XML..."
                : `Download Tally XML (${invoicesToExport.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
