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

  AlertTriangle,

  ArrowUpRight,

  Filter,

  Upload,

  Loader2,

  X,

  Sparkles,

  Share2,

} from "lucide-react";

import { openWhatsAppInvoice } from "@/lib/whatsapp";

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

import { isAbortError, type ScanStage } from "@/lib/scanProgress";

import InvoiceReviewModal from "@/components/InvoiceReviewModal";

import EditInvoiceModal from "@/components/InvoiceEditModal";

import {

  formatINR,

  formatLastModified,

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

              className="flex-1 py-3 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 active:scale-98 transition cursor-pointer"

            >

              Cancel

            </button>

            <button

              disabled={isCompressing}

              onClick={() => onConfirm(file)}

              className="flex-1 py-3 bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs rounded-xl shadow-sm active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"

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

  const [viewTab, setViewTab] = useState<"confirmed" | "drafts">("confirmed");

  const [previewInvoice, setPreviewInvoice] = useState<StoredInvoice | null>(null);

  const [loading, setLoading] = useState<boolean>(true);



  // In-page AI OCR States

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const [isUploading, setIsUploading] = useState<boolean>(false);

  const [uploadMeta, setUploadMeta] = useState<{

    fileName: string;

    fileSize: number;

    previewUrl?: string;

    isPdf: boolean;

    stage: ScanStage;

  } | null>(null);

  const uploadAbortRef = useRef<AbortController | null>(null);

  const [reviewInvoice, setReviewInvoice] = useState<any | null>(null);

  const [editInvoice, setEditInvoice] = useState<any | null>(null);



  const fileInputRef = useRef<HTMLInputElement>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);



  const loadData = async () => {

    try {

      setLoading(true);

      const [invs, prof] = await Promise.all([getAllInvoices(), getBusinessProfile()]);

      setInvoices(
        invs.sort((a, b) => {
          const tA = new Date(a.updated_time || a.updated_at || a.created_at || 0).getTime();
          const tB = new Date(b.updated_time || b.updated_at || b.created_at || 0).getTime();
          return tB - tA;
        })
      );

      setProfile(prof);

    } catch (err: any) {

      toast.error("Failed to load invoices: " + err.message);

    } finally {

      setLoading(false);

    }

  };



  const handleWhatsApp = (inv: StoredInvoice) => {

    openWhatsAppInvoice({

      invoice: inv.data,

      sellerName: profile?.tradeName || profile?.businessName,

      sellerUpiId: profile?.upiId,

      buyerPhone: (inv.data as any)?.buyer_phone || "",

    });

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



    const controller = new AbortController();

    uploadAbortRef.current = controller;

    const bgPreviewUrl = fileToUpload.type.startsWith("image/") ? URL.createObjectURL(fileToUpload) : undefined;



    setUploadMeta({

      fileName: fileToUpload.name,

      fileSize: fileToUpload.size,

      previewUrl: bgPreviewUrl,

      isPdf: fileToUpload.type === "application/pdf",

      stage: "ocr",

    });

    setIsUploading(true);



    try {

      const res = await uploadInvoice(fileToUpload, { signal: controller.signal });

      const data = res.data;

      setUploadMeta((prev) => (prev ? { ...prev, stage: "verifying" } : prev));



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



      setUploadMeta((prev) => (prev ? { ...prev, stage: "finalizing" } : prev));

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



      if (isAbortError(error)) { toast("AI bill scan cancelled"); } else { console.error("Upload failed", error); toast.error(error.message || "Failed to process invoice with AI"); }

    } finally {

      if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl);

      uploadAbortRef.current = null;

      setUploadMeta(null);

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
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      await updateInvoice(invoice.id, {

        data: {

          ...invoice.data,

          payment_status: nextStatus,

          paymentStatus: nextStatus,

        },
        updated_time: nowIso,

      });

      setInvoices((prev) =>
        prev
          .map((i) =>
            i.id === invoice.id
              ? {
                  ...i,
                  updated_time: nowIso,
                  updated_at: nowMs,
                  data: {
                    ...i.data,
                    payment_status: nextStatus,
                    paymentStatus: nextStatus,
                    updated_time: nowIso,
                  },
                }
              : i
          )
          .sort((a, b) => {
            const tA = new Date(a.updated_time || a.updated_at || a.created_at || 0).getTime();
            const tB = new Date(b.updated_time || b.updated_at || b.created_at || 0).getTime();
            return tB - tA;
          })
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



  const handleConfirmDraft = async (inv: StoredInvoice) => {
    try {
      await saveInvoiceDraft(inv.data, "confirmed");
      toast.success(
        `Draft bill #${inv.data?.invoice_number || ""} confirmed! Moved to official sales.`
      );
      await loadData();
    } catch (err: any) {
      toast.error("Failed to confirm draft: " + err.message);
    }
  };

  // Strictly partition confirmed vs draft bills
  const confirmedInvoices = React.useMemo(
    () => invoices.filter((inv) => inv.status !== "draft"),
    [invoices]
  );
  const draftInvoices = React.useMemo(
    () => invoices.filter((inv) => inv.status === "draft"),
    [invoices]
  );

  // Status Counts calculated ONLY for confirmed invoices
  const paidCount = confirmedInvoices.filter(
    (i) => (i.data?.payment_status || "Unpaid") === "Paid"
  ).length;

  const unpaidCount = confirmedInvoices.filter(
    (i) => (i.data?.payment_status || "Unpaid") !== "Paid"
  ).length;

  // Filtered confirmed invoices (shown in main /invoices view)
  const filteredConfirmed = confirmedInvoices.filter((inv) => {
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

  // Filtered draft invoices (shown in drafts tab)
  const filteredDrafts = draftInvoices.filter((inv) => {
    const data = inv.data || {};
    const invNo = (data.invoice_number || "").toLowerCase();
    const buyerName = extractCustomerName(data).toLowerCase();
    const buyerGst = extractBuyerGstin(data).toLowerCase();
    const q = search.toLowerCase();
    return invNo.includes(q) || buyerName.includes(q) || buyerGst.includes(q);
  });

  // Aggregations computed ONLY on confirmed invoices (drafts are NEVER added into sales / collections)
  const totalOutward = confirmedInvoices.reduce(
    (acc, inv) => acc + extractInvoiceTotal(inv.data),
    0
  );

  const paidAmount = confirmedInvoices
    .filter((inv) => (inv.data?.payment_status || "Unpaid") === "Paid")
    .reduce(
      (acc, inv) => acc + extractInvoiceTotal(inv.data),
      0
    );

  const pendingAmount = totalOutward - paidAmount;



  return (

    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 pb-20">

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

            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs shrink-0">

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

              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#047857] dark:text-emerald-400" />

              <span className="hidden sm:inline">Camera</span>

              <span className="sm:hidden">Scan</span>

            </button>



            <button

              type="button"

              onClick={() => fileInputRef.current?.click()}

              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs active:scale-95 transition cursor-pointer"

              title="Upload invoice image or PDF for AI OCR"

            >

              <Upload className="w-4 h-4 text-[#047857] dark:text-emerald-400" />

              <span>Scan File</span>

            </button>



            <Link

              href="/invoices/new"

              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium rounded-lg transition"

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

              Sales ({confirmedInvoices.length})

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



        {/* Desktop Metric Highlights */}

        <div className="hidden md:grid grid-cols-3 gap-3">

          <div className="bg-white dark:bg-[#161513] p-4 rounded-lg border border-black/[0.06] dark:border-white/[0.06] shadow-xs">

            <span className="text-xs text-stone-500 dark:text-stone-400 block mb-1">

              Total outward sales

            </span>

            <p className="text-xl font-mono font-medium tabular-nums text-stone-900 dark:text-stone-100">

              {formatINR(totalOutward)}

            </p>

            <p className="text-[11px] text-stone-400 mt-1">

              {confirmedInvoices.length} confirmed invoice{confirmedInvoices.length !== 1 ? "s" : ""} recorded

            </p>

          </div>



          <div className="bg-white dark:bg-[#161513] p-4 rounded-lg border border-black/[0.06] dark:border-white/[0.06] shadow-xs">

            <span className="text-xs text-stone-500 dark:text-stone-400 block mb-1">

              Paid collections

            </span>

            <p className="text-xl font-mono font-medium tabular-nums text-stone-900 dark:text-stone-100">

              {formatINR(paidAmount)}

            </p>

            <p className="text-[11px] text-stone-400 mt-1">

              Settled into bank and cash accounts

            </p>

          </div>



          <div className="bg-white dark:bg-[#161513] p-4 rounded-lg border border-black/[0.06] dark:border-white/[0.06] shadow-xs">

            <span className="text-xs text-stone-500 dark:text-stone-400 block mb-1">

              Pending receivables

            </span>

            <p className="text-xl font-mono font-medium tabular-nums text-stone-900 dark:text-stone-100">

              {formatINR(pendingAmount)}

            </p>

            <p className="text-[11px] text-stone-400 mt-1">

              Outstanding buyer dues to collect

            </p>

          </div>

        </div>

        {/* View Switcher: Confirmed Invoices vs Draft Bills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-xl">
            <button
              type="button"
              onClick={() => setViewTab("confirmed")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewTab === "confirmed"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Confirmed Invoices</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold">
                {confirmedInvoices.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewTab("drafts")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewTab === "drafts"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Draft Bills</span>
              {draftInvoices.length > 0 && (
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  viewTab === "drafts" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                }`}>
                  {draftInvoices.length}
                </span>
              )}
            </button>
          </div>

          {viewTab === "drafts" && (
            <div className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Draft bills are excluded from sales totals and tax filings</span>
            </div>
          )}
        </div>

        {/* Pending Draft Notification Banner when in Confirmed tab */}
        {viewTab === "confirmed" && draftInvoices.length > 0 && (
          <div className="flex items-center justify-between p-3.5 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  {draftInvoices.length} draft invoice{draftInvoices.length > 1 ? "s" : ""} pending completion
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Draft bills are kept separate and not counted in sales or GST returns.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewTab("drafts")}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition shrink-0 cursor-pointer"
            >
              View Drafts ({draftInvoices.length}) →
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}

        <div className="bg-white dark:bg-[#161513] p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] shadow-xs flex flex-wrap items-center justify-between gap-3">

          <div className="flex-1 min-w-[240px] relative">

            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />

            <input

              type="text"

              placeholder={viewTab === "confirmed" ? "Search confirmed invoices by number or party..." : "Search draft bills..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#fafaf9] dark:bg-[#12110f] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:border-stone-400"
            />
          </div>

          {viewTab === "confirmed" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  All ({confirmedInvoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("paid")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === "paid"
                      ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  Paid ({paidCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("unpaid")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    statusFilter === "unpaid"
                      ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-medium shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  Unpaid ({unpaidCount})
                </button>
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-[#fafaf9] dark:bg-[#12110f] border border-black/[0.08] dark:border-white/[0.08] rounded-md text-xs font-normal text-stone-700 dark:text-stone-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All document types</option>
                {Object.values(DOCUMENT_TYPES).map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>



        {/* Invoices List Table */}

        <div className="bg-white dark:bg-[#161513] rounded-xl border border-black/[0.08] dark:border-white/[0.08] shadow-xs overflow-hidden">

          {loading ? (

            <div className="py-20 text-center space-y-2">

              <div className="w-8 h-8 border-2 border-[#047857] border-t-transparent rounded-full animate-spin mx-auto" />

              <p className="text-xs font-semibold text-slate-400">Loading invoices...</p>

            </div>

          ) : viewTab === "confirmed" ? (
            filteredConfirmed.length === 0 ? (
              <div className="py-20 text-center space-y-3 px-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No confirmed invoices found
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {search || typeFilter !== "all" || statusFilter !== "all"
                    ? "No confirmed invoices match the current search or filters. Try resetting the criteria."
                    : "Generate GST-compliant tax invoices, e-Way bills, and delivery challans in seconds."}
                </p>

              <Link

                href="/invoices/new"

                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded-2xl shadow-sm transition"

              >

                <Plus className="w-4 h-4" />

                Create First Invoice

              </Link>

            </div>

          ) : (

            <>

              {/* Mobile Invoices Card List (block md:hidden) */}

              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">

                {filteredConfirmed.map((inv) => {

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

                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-300 uppercase">

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

                          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                            <Clock className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>Updated: {formatLastModified(inv.updated_time || inv.updated_at)}</span>
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

                            className="px-2.5 py-1 text-xs font-bold text-[#047857] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl"

                          >

                            Edit

                          </Link>

                          <button

                            type="button"

                            onClick={() => handleWhatsApp(inv)}

                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition"

                            title="Share on WhatsApp"

                          >

                            <Share2 className="w-4 h-4 text-emerald-600" />

                          </button>

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

                      <th className="py-3.5 px-4">Last Modified</th>

                      <th className="py-3.5 px-4">Customer</th>

                      <th className="py-3.5 px-4">Taxable</th>

                      <th className="py-3.5 px-4">Total Amount</th>

                      <th className="py-3.5 px-4">Status</th>

                      <th className="py-3.5 px-4 text-right">Actions</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">

                    {filteredConfirmed.map((inv) => {

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

                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 uppercase">

                              {docConfig.prefix}

                            </span>

                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white tabular-nums">

                            {data.invoice_number || "Draft"}

                          </td>

                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">

                            {data.invoice_date || "—"}

                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">

                            <div className="flex items-center gap-1.5" title={`Last Modified: ${inv.updated_time || "—"}`}>

                              <Clock className="w-3 h-3 text-stone-400 shrink-0" />

                              <span>{formatLastModified(inv.updated_time || inv.updated_at)}</span>

                            </div>

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

                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-[#047857] dark:text-slate-400 dark:hover:text-emerald-400 rounded-xl transition"

                              >

                                <Edit3 className="w-4 h-4" />

                              </Link>

                              <button

                                onClick={() => handleWhatsApp(inv)}

                                title="Share on WhatsApp"

                                className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-600 rounded-xl transition cursor-pointer"

                              >

                                <Share2 className="w-4 h-4 text-emerald-600" />

                              </button>

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
          )
        ) : (
          /* Draft Bills View: Displayed differently with distinct dashed styling & clear confirmation actions */
          filteredDrafts.length === 0 ? (
            <div className="py-20 text-center space-y-3 px-4">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No draft bills found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                All your invoices are confirmed and accounted for in your sales. Work-in-progress drafts will appear here.
              </p>
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-2xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Create New Invoice
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Drafts Card List */}
              <div className="block md:hidden divide-y divide-amber-200/50 dark:divide-amber-800/40">
                {filteredDrafts.map((inv) => {
                  const data = inv.data || {};
                  const amount = extractInvoiceTotal(data);
                  const customerName = extractCustomerName(data) || "Unnamed Customer";
                  const buyerGstin = extractBuyerGstin(data);

                  return (
                    <div
                      key={inv.id}
                      className="p-4 space-y-3 bg-amber-50/20 dark:bg-amber-950/15"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/50 uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              DRAFT
                            </span>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {customerName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700/80 dark:text-amber-400">
                            <span className="font-mono font-medium">
                              {data.invoice_number ? `#${data.invoice_number}` : `Draft (${inv.id.slice(0, 8)})`}
                            </span>
                            <span>•</span>
                            <span>{data.invoice_date || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                            <Clock className="w-3 h-3 text-amber-600/70 shrink-0" />
                            <span>Modified: {formatLastModified(inv.updated_time || inv.updated_at)}</span>
                          </div>
                          {buyerGstin && (
                            <div className="font-mono text-[10px] text-slate-400 uppercase mt-0.5">
                              {buyerGstin}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-sm text-slate-900 dark:text-white tabular-nums">
                            {formatINR(amount)}
                          </div>
                          <span className="inline-block text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                            Excluded from Sales
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-amber-200/40 dark:border-amber-800/30 gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmDraft(inv)}
                          className="flex-1 py-1.5 px-3 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Invoice</span>
                        </button>
                        <Link
                          href={`/invoices/new?edit=${inv.id}`}
                          className="py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id, data.invoice_number || "Draft")}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title="Discard Draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Drafts Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-amber-50/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border-b border-amber-200 dark:border-amber-800/60 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Draft Reference</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Draft Total</th>
                      <th className="py-3.5 px-4">Last Modified</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/70 dark:divide-amber-900/30">
                    {filteredDrafts.map((inv) => {
                      const data = inv.data || {};
                      const amount = extractInvoiceTotal(data);
                      const customerName = extractCustomerName(data) || "Unnamed Customer";
                      const buyerGstin = extractBuyerGstin(data);

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-amber-50/40 dark:hover:bg-amber-950/30 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60 shadow-2xs">
                              <Clock className="w-3 h-3" />
                              <span>DRAFT</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {data.invoice_number ? `#${data.invoice_number}` : `Draft (${inv.id.slice(0, 8)})`}
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
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-black tabular-nums text-slate-900 dark:text-white">
                              {formatINR(amount)}
                            </div>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                              Excluded from Sales
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            <div className="flex items-center gap-1.5" title={`Last Modified: ${inv.updated_time || "—"}`}>
                              <Clock className="w-3 h-3 text-amber-500/70 shrink-0" />
                              <span>{formatLastModified(inv.updated_time || inv.updated_at)}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleConfirmDraft(inv)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#047857] hover:bg-[#065f46] active:scale-95 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                                title="Confirm this draft and add to official sales"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm Invoice</span>
                              </button>
                              <Link
                                href={`/invoices/new?edit=${inv.id}`}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                                title="Edit Draft"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(inv.id, data.invoice_number || "Draft")}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                title="Discard Draft"
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
          )
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

      {isUploading && (

        <UploadingModal

          fileName={uploadMeta?.fileName}

          fileSize={uploadMeta?.fileSize}

          previewUrl={uploadMeta?.previewUrl}

          isPdf={uploadMeta?.isPdf}

          stage={uploadMeta?.stage}

          onCancel={() => {

            uploadAbortRef.current?.abort();

          }}

        />

      )}



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

