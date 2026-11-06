"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit3,
  CheckCircle,
  CheckCircle2,
  Check,
  Clock,
  Camera,
  TrendingUp,
  Receipt,
  AlertCircle,
  ArrowUpRight,
  Filter,
  Upload,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  StoredInvoice,
  getAllInvoices,
  deleteInvoice,
  updateInvoice,
  getBusinessProfile,
  BusinessProfile,
  saveInvoiceDraft,
} from "@/lib/storage";
import { uploadInvoice, fetchGSTInfo } from "@/lib/api";
import UploadingModal from "@/components/UploadingModal";
import InvoiceReviewModal from "@/components/InvoiceReviewModal";
import EditInvoiceModal from "@/components/InvoiceEditModal";
import {
  formatINR,
  DOCUMENT_TYPES,
  DocumentType,
  getLocalToday,
  normalizeDocType,
  extractInvoiceTotal,
  extractInvoiceTaxable,
  extractCustomerName,
  extractBuyerGstin,
} from "@/lib/gstBillingEngine";
import InvoicePreview from "@/components/InvoicePreview";
import { checkDuplicateInvoice } from "@/lib/duplicates";
import toast from "react-hot-toast";

/* ---------------- Image Compression ---------------- */

async function compressImageIfNeeded(file: File): Promise<File> {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  await new Promise((resolve) => (img.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let width = img.width;
  let height = img.height;
  const maxDim = 3000;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(file);
        resolve(new File([blob], file.name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85
    );
  });
}

/* ---------------- Bill Preview & Confirmation Modal ---------------- */

function BillPreviewModal({
  file,
  previewUrl,
  isCompressing,
  onClose,
  onConfirm,
}: {
  file: File;
  previewUrl: string;
  isCompressing: boolean;
  onClose: () => void;
  onConfirm: (processedFile: File) => void;
}) {
  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 w-full md:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Preview & Confirm Invoice</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center p-2 min-h-[240px]">
            {isImage && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[55vh] object-contain rounded-xl"
              />
            )}
            {isPdf && (
              <iframe
                src={previewUrl}
                className="w-full h-[55vh] rounded-xl"
                title="PDF Preview"
              />
            )}
            {!isImage && !isPdf && (
              <div className="text-center text-gray-500 py-12">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p>{file.name}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3.5 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 active:scale-98 transition"
            >
              Cancel
            </button>
            <button
              disabled={isCompressing}
              onClick={() => onConfirm(file)}
              className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Optimizing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" /> Process with AI
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [previewInvoice, setPreviewInvoice] = useState<StoredInvoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // In-page AI OCR States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [reviewInvoice, setReviewInvoice] = useState<any | null>(null);
  const [editInvoice, setEditInvoice] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invs, prof] = await Promise.all([getAllInvoices(), getBusinessProfile()]);
      setInvoices(invs.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
      setProfile(prof);
    } catch (err: any) {
      toast.error("Failed to load invoices: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Check URL parameters (e.g. ?scan=camera or ?scan=file)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const scanParam = params.get("scan");
      if (scanParam === "camera") {
        setTimeout(() => cameraInputRef.current?.click(), 300);
      } else if (scanParam === "file") {
        setTimeout(() => fileInputRef.current?.click(), 300);
      }
    }

    // Direct file select listener from bottom nav or external events
    const handleDirectFile = (e: any) => {
      if (e.detail) {
        handleFileSelect(e.detail);
      }
    };
    window.addEventListener("DIRECT_FILE_SELECT", handleDirectFile);
    return () => window.removeEventListener("DIRECT_FILE_SELECT", handleDirectFile);
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
  };

  const handleConfirmUpload = async (file: File) => {
    setIsCompressing(true);
    let fileToUpload = file;
    try {
      fileToUpload = await compressImageIfNeeded(file);
    } catch (e) {
      console.warn("Compression failed, using original", e);
    } finally {
      setIsCompressing(false);
    }

    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    setIsUploading(true);

    try {
      const res = await uploadInvoice(fileToUpload);
      const data = res.data;

      // GST Verification
      let buyer_gstin_info = null;
      if (data.buyer_gstin) {
        try {
          const gstRes = await fetchGSTInfo(data.buyer_gstin);
          buyer_gstin_info = gstRes?.data || null;
        } catch (e) {
          console.warn("GST lookup failed", e);
        }
      }
      data.buyer_gstin_info = buyer_gstin_info ?? undefined;

      // Duplicate Check
      const storedInvoices = await getAllInvoices();
      const dupCheck = checkDuplicateInvoice(data, storedInvoices);
      if (dupCheck.isDuplicate) {
        data.duplicate_warning = dupCheck.warningMessage;
        toast.error(`⚠️ ${dupCheck.warningMessage}`, { duration: 7000 });
      }

      const localId = await saveInvoiceDraft(data, "draft");
      setReviewInvoice({
        ...data,
        duplicate_warning: dupCheck.isDuplicate ? dupCheck.warningMessage : undefined,
        _local_id: localId,
      });
      await loadData();
      if (!dupCheck.isDuplicate) {
        toast.success("AI extracted invoice details successfully!");
      }
    } catch (error: any) {
      console.error("Upload failed", error);
      toast.error(error.message || "Failed to process invoice with AI");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, invoiceNo: string) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoiceNo}?`)) return;
    try {
      await deleteInvoice(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast.success(`Invoice ${invoiceNo} deleted`);
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const handleSetPaymentStatus = async (
    invoice: StoredInvoice,
    nextStatus: "Paid" | "Unpaid"
  ) => {
    try {
      await updateInvoice(invoice.id, {
        data: {
          ...invoice.data,
          payment_status: nextStatus,
          paymentStatus: nextStatus,
        },
      });
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === invoice.id
            ? {
                ...i,
                data: {
                  ...i.data,
                  payment_status: nextStatus,
                  paymentStatus: nextStatus,
                },
              }
            : i
        )
      );
      toast.success(
        nextStatus === "Paid"
          ? `Invoice #${invoice.data?.invoice_number || ""} marked as Paid!`
          : `Invoice #${invoice.data?.invoice_number || ""} marked as Unpaid`
      );
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  // Aggregations & Status Counts
  const paidCount = invoices.filter(
    (i) => (i.data?.payment_status || "Unpaid") === "Paid"
  ).length;
  const unpaidCount = invoices.filter(
    (i) => (i.data?.payment_status || "Unpaid") !== "Paid"
  ).length;

  // Filtered invoices
  const filtered = invoices.filter((inv) => {
    const data = inv.data || {};
    const invNo = (data.invoice_number || "").toLowerCase();
    const buyerName = extractCustomerName(data).toLowerCase();
    const buyerGst = extractBuyerGstin(data).toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = invNo.includes(q) || buyerName.includes(q) || buyerGst.includes(q);

    const docType = normalizeDocType(data.invoice_type || data.docType);
    const matchesType = typeFilter === "all" || docType === typeFilter;

    const paymentStatus = data.payment_status || "Unpaid";
    const matchesStatus =
      statusFilter === "all" || paymentStatus.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  // Aggregations
  const totalOutward = invoices.reduce(
    (acc, inv) => acc + extractInvoiceTotal(inv.data),
    0
  );
  const paidAmount = invoices
    .filter((inv) => (inv.data?.payment_status || "Unpaid") === "Paid")
    .reduce(
      (acc, inv) => acc + extractInvoiceTotal(inv.data),
      0
    );
  const pendingAmount = totalOutward - paidAmount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      {/* Hidden File & Camera Inputs for in-page AI OCR */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileSelect(f);
          e.target.value = "";
        }}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-5">
        {/* Top Header & Primary Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs shrink-0">
              <Receipt className="w-5 h-5 md:w-6 md:h-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-extrabold tracking-tight truncate">
                Invoices & Sales
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                Create, track, and print GST Rule 46 Tax Invoices, Proformas, and Challans.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs active:scale-95 transition cursor-pointer"
              title="Snap physical invoice with camera for AI OCR"
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Camera</span>
              <span className="sm:hidden">Scan</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs active:scale-95 transition cursor-pointer"
              title="Upload invoice image or PDF for AI OCR"
            >
              <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Scan File</span>
            </button>

            <Link
              href="/invoices/new"
              className="flex items-center gap-1.5 px-3 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl sm:rounded-2xl shadow-md shadow-indigo-500/20 transition"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">New Invoice</span>
              <span className="sm:hidden">Draft</span>
            </Link>
          </div>
        </div>

        {/* Mobile Compact KPI Strip (block md:hidden) */}
        <div className="grid grid-cols-3 gap-2 md:hidden">
          <div className="bg-white dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Sales ({invoices.length})
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums block mt-0.5 truncate">
              {formatINR(totalOutward)}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Collected
            </span>
            <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5 truncate">
              {formatINR(paidAmount)}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Pending
            </span>
            <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums block mt-0.5 truncate">
              {formatINR(pendingAmount)}
            </span>
          </div>
        </div>

        {/* Desktop Fintech Metric Highlights (hidden md:grid) */}
        <div className="hidden md:grid grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Outward Sales</span>
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {formatINR(totalOutward)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {invoices.length} total invoice{invoices.length !== 1 ? "s" : ""} generated
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Paid Collections</span>
              <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
              {formatINR(paidAmount)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Settled into Bank / Cash Accounts
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-sm transition-all">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Pending Receivables</span>
              <span className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-2">
              {formatINR(pendingAmount)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Outstanding buyer dues to collect
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number or party name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("paid")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === "paid"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Paid ({paidCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("unpaid")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  statusFilter === "unpaid"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 dark:text-rose-400 hover:text-rose-800"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Unpaid ({unpaidCount})</span>
              </button>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
            >
              <option value="all">All Document Types</option>
              {Object.values(DOCUMENT_TYPES).map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-400">Loading invoices...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3 px-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No invoices found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {search || typeFilter !== "all" || statusFilter !== "all"
                  ? "No invoices match the current search or filters. Try resetting the criteria."
                  : "Generate GST-compliant tax invoices, e-Way bills, and delivery challans in seconds."}
              </p>
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Create First Invoice
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Invoices Card List (block md:hidden) */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((inv) => {
                  const data = inv.data || {};
                  const docType = normalizeDocType(data.invoice_type || data.docType);
                  const docConfig = DOCUMENT_TYPES[docType] || DOCUMENT_TYPES["tax-invoice"];
                  const amount = extractInvoiceTotal(data);
                  const customerName = extractCustomerName(data);
                  const buyerGstin = extractBuyerGstin(data);
                  const paymentStatus = data.payment_status || "Unpaid";

                  return (
                    <div
                      key={inv.id}
                      className="p-4 space-y-2.5 active:bg-slate-50 dark:active:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => setPreviewInvoice(inv)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 uppercase">
                              {docConfig.prefix}
                            </span>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {customerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                            <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                              {data.invoice_number || "Draft"}
                            </span>
                            <span>•</span>
                            <span>{data.invoice_date || "—"}</span>
                          </div>
                          {buyerGstin && (
                            <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                              {buyerGstin}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-sm text-slate-900 dark:text-white tabular-nums">
                            {formatINR(amount)}
                          </div>
                          <span
                            className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                              paymentStatus === "Paid"
                                ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60"
                                : "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200/60"
                            }`}
                          >
                            {paymentStatus}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                        {/* 1-click Payment status toggle */}
                        <button
                          type="button"
                          onClick={() => handleSetPaymentStatus(inv, paymentStatus === "Paid" ? "Unpaid" : "Paid")}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            paymentStatus === "Paid"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              : "bg-emerald-600 text-white shadow-2xs"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{paymentStatus === "Paid" ? "Mark Unpaid" : "Mark Paid"}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <Link
                            href={`/invoices/new?edit=${inv.id}`}
                            className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setPreviewInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition"
                            title="Print / View PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(inv.id, data.invoice_number)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Full Table (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Invoice No</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Taxable</th>
                      <th className="py-3.5 px-4">Total Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filtered.map((inv) => {
                      const data = inv.data || {};
                      const docType = normalizeDocType(data.invoice_type || data.docType);
                      const docConfig = DOCUMENT_TYPES[docType] || DOCUMENT_TYPES["tax-invoice"];
                      const amount = extractInvoiceTotal(data);
                      const taxable = extractInvoiceTaxable(data);
                      const customerName = extractCustomerName(data);
                      const buyerGstin = extractBuyerGstin(data);
                      const paymentStatus = data.payment_status || "Unpaid";

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 uppercase">
                              {docConfig.prefix}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                            {data.invoice_number || "Draft"}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                            {data.invoice_date || "—"}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                            <div>{customerName}</div>
                            {buyerGstin && (
                              <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase">
                                {buyerGstin}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            {formatINR(taxable)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black tabular-nums text-slate-900 dark:text-white">
                            {formatINR(amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* High-visibility Status Badge */}
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${
                                  paymentStatus === "Paid"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-xs"
                                }`}
                              >
                                {paymentStatus === "Paid" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                )}
                                <span>{paymentStatus}</span>
                              </span>

                              {/* Direct 1-Click Action Button */}
                              {paymentStatus !== "Paid" ? (
                                <button
                                  onClick={() => handleSetPaymentStatus(inv, "Paid")}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer"
                                  title="Click to record receipt and mark as Paid"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Mark Paid</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleSetPaymentStatus(inv, "Unpaid")}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-md text-[10px] font-medium transition cursor-pointer"
                                  title="Click to change back to Unpaid"
                                >
                                  <span>Mark Unpaid</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/invoices/new?edit=${inv.id}`}
                                title="Edit Invoice"
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-xl transition"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => setPreviewInvoice(inv)}
                                title="Print / View Invoice"
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(inv.id, data.invoice_number)}
                                title="Delete Invoice"
                                className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-xl transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Full Preview & Print Modal */}
      {previewInvoice && profile && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <InvoicePreview
              profile={profile}
              client={previewInvoice.data?.buyer || { name: previewInvoice.data?.customer_name }}
              details={{
                invoiceNumber: previewInvoice.data?.invoice_number || "INV-001",
                invoiceDate: previewInvoice.data?.invoice_date || getLocalToday(),
                docType: previewInvoice.data?.invoice_type || "tax-invoice",
                placeOfSupply: previewInvoice.data?.place_of_supply,
                eWayBillNo: previewInvoice.data?.eway_bill_no,
                vehicleNo: previewInvoice.data?.vehicle_no,
              }}
              items={previewInvoice.data?.items || []}
              totals={
                previewInvoice.data?.totals || {
                  grandTotal: previewInvoice.data?.grand_total || 0,
                  taxableAmount: previewInvoice.data?.taxable_amount || 0,
                  cgst: previewInvoice.data?.cgst || 0,
                  sgst: previewInvoice.data?.sgst || 0,
                  igst: previewInvoice.data?.igst || 0,
                  cess: 0,
                  roundOff: 0,
                  isInterstate: previewInvoice.data?.is_interstate || false,
                }
              }
              terms={previewInvoice.data?.terms}
              notes={previewInvoice.data?.notes}
              onClose={() => setPreviewInvoice(null)}
            />
          </div>
        </div>
      )}

      {/* Bill Preview & Confirmation Modal before AI processing */}
      {selectedFile && previewUrl && (
        <BillPreviewModal
          file={selectedFile}
          previewUrl={previewUrl}
          isCompressing={isCompressing}
          onClose={() => {
            setSelectedFile(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
          }}
          onConfirm={handleConfirmUpload}
        />
      )}

      {/* AI Uploading Progress Modal */}
      {isUploading && <UploadingModal />}

      {/* AI Invoice Review Modal */}
      {reviewInvoice && (
        <InvoiceReviewModal
          isNew={!reviewInvoice._local_id}
          invoice={reviewInvoice}
          onClose={() => setReviewInvoice(null)}
          onEdit={() => {
            setEditInvoice(reviewInvoice);
            setReviewInvoice(null);
          }}
          onDelete={async () => {
            if (!confirm("Delete this invoice?")) return;
            if (reviewInvoice._local_id) {
              await deleteInvoice(reviewInvoice._local_id);
            }
            setReviewInvoice(null);
            toast.success("Invoice removed");
            await loadData();
          }}
          onConfirm={async () => {
            await saveInvoiceDraft(reviewInvoice, "confirmed");
            setReviewInvoice(null);
            toast.success("Invoice confirmed and saved!");
            await loadData();
          }}
        />
      )}

      {/* AI Invoice Edit Modal */}
      {editInvoice && (
        <EditInvoiceModal
          invoice={editInvoice}
          onClose={() => setEditInvoice(null)}
          onSave={(updatedInvoice) => {
            setEditInvoice(null);
            setReviewInvoice(updatedInvoice);
          }}
        />
      )}
    </div>
  );
}
