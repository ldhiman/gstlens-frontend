"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  FileText,
  DollarSign,
  TrendingUp,
  Camera,
  ChevronRight,
  X,
  Cloud,
  CloudOff,
  FileCheckCorner,
  Loader2,
  Search,
  Sparkles,
  Filter,
  CheckCircle2,
  Building2,
  Plus,
  FileCode,
  Layers,
} from "lucide-react";

import { SYNC_EVENT } from "@/lib/constants";
import { uploadInvoice, fetchGSTInfo } from "@/lib/api";
import InvoiceReviewModal from "@/components/InvoiceReviewModal";
import { getAPPSettings } from "@/lib/settings";
import { saveInvoiceDraft, getAllInvoices, deleteInvoice } from "@/lib/storage";
import UploadingModal from "@/components/UploadingModal";
import EditInvoiceModal from "@/components/InvoiceEditModal";
import BatchUploadModal from "@/components/BatchUploadModal";
import TallyExportModal from "@/components/TallyExportModal";
import { runBatchUpload, type BatchFileItem, type BatchSummaryState } from "@/lib/batchUpload";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useAuth } from "@/context/AuthContext";
import {
  performCloudSync,
  startBackgroundSync,
  stopBackgroundSync,
} from "@/lib/sync";
import { formatINR } from "@/lib/currency";

/* ---------------- Types ---------------- */

type InvoiceUI = {
  id: string;
  name: string;
  date: string;
  amount: string;
  gst: string;
  status: string;
  raw: any;
  synced_to_cloud: 0 | 1;
};

/* ---------------- File Preview Modal ---------------- */

function FilePreviewModal({
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
            <h3 className="text-lg font-bold text-gray-900">Preview & Confirm Bill</h3>
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

  let quality = 0.9;
  let blob: Blob | null = null;

  while (quality > 0.3) {
    blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), file.type, quality)
    );
    if (blob && blob.size <= 1 * 1024 * 1024) break;
    quality -= 0.1;
  }

  if (!blob || blob.size > 1 * 1024 * 1024) {
    blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), file.type, 0.3)
    );
  }

  URL.revokeObjectURL(img.src);
  return new File([blob!], file.name, { type: file.type });
}

/* ---------------- Main Dashboard Component ---------------- */

export default function Home() {
  const [invoices, setInvoices] = useState<InvoiceUI[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [reviewInvoice, setReviewInvoice] = useState<any>(null);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "b2b" | "b2c" | "draft" | "confirmed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Preview state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState(false);

  // Batch upload state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchFileItem[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchSummaryState>({
    total: 0,
    completed: 0,
    successful: 0,
    duplicates: 0,
    failed: 0,
    inProgress: false,
  });
  const lastBatchFilesRef = useRef<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Tally export state
  const [showTallyModal, setShowTallyModal] = useState(false);

  async function retryFailedBatch() {
    const failedNames = new Set(
      batchItems.filter((i) => i.status === "error").map((i) => i.name)
    );
    const filesToRetry = lastBatchFilesRef.current.filter((f) =>
      failedNames.has(f.name)
    );
    if (filesToRetry.length > 0) {
      await startBatchUpload(filesToRetry);
    }
  }

  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const { user, userProfile } = useAuth();

  // Background Cloud Sync
  useEffect(() => {
    const isSubscribed = Boolean(user && userProfile?.subscription?.active);
    if (isSubscribed) {
      startBackgroundSync(true, 120000);
    } else {
      stopBackgroundSync();
    }
    return () => stopBackgroundSync();
  }, [user, userProfile]);

  // GSTIN Guard
  useEffect(() => {
    if (!user || !userProfile) return;
    if (!userProfile.primary_gstin) {
      router.replace("/profile?require=gstin");
    }
  }, [user, userProfile, router]);

  // Load Invoices
  useEffect(() => {
    loadInvoices();
  }, []);

  // Listen to cloud sync & direct file events from mobile bottom nav
  useEffect(() => {
    function handleSyncComplete() {
      loadInvoices();
    }
    function handleDirectFile(e: any) {
      if (e.detail) {
        handleFileSelect(e.detail);
      }
    }

    window.addEventListener(SYNC_EVENT, handleSyncComplete);
    window.addEventListener("DIRECT_FILE_SELECT", handleDirectFile);

    return () => {
      window.removeEventListener(SYNC_EVENT, handleSyncComplete);
      window.removeEventListener("DIRECT_FILE_SELECT", handleDirectFile);
    };
  }, []);

  async function loadInvoices() {
    const stored = await getAllInvoices();
    const uiInvoices: InvoiceUI[] = stored.map((r) => {
      const tax = (r.data.cgst || 0) + (r.data.sgst || 0) + (r.data.igst || 0);
      return {
        id: r.id,
        name: r.data.invoice_number || "Invoice",
        date: r.data.invoice_date || "-",
        amount: (r.data.invoice_total || 0).toFixed(2),
        gst: tax.toFixed(2),
        status: r.status,
        synced_to_cloud: r.synced_to_cloud,
        raw: {
          ...r.data,
          _local_id: r.id,
        },
      };
    });
    setInvoices(uiInvoices.reverse());
  }

  // File selection
  async function handleFileSelect(file: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setShowUploadSheet(false);
  }

  // Confirm and upload
  async function handleConfirmUpload(originalFile: File) {
    let fileToUpload = originalFile;

    if (originalFile.type.startsWith("image/") && originalFile.size > 1 * 1024 * 1024) {
      setIsCompressing(true);
      try {
        fileToUpload = await compressImageIfNeeded(originalFile);
      } catch (err) {
        console.error("Compression failed", err);
      } finally {
        setIsCompressing(false);
      }
    }

    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");

    await handleUpload(fileToUpload);
  }

  // Multi-Invoice Batch Upload with Concurrency Pool (3x)
  async function startBatchUpload(files: File[]) {
    if (!files || files.length === 0) return;
    lastBatchFilesRef.current = files;
    setShowUploadSheet(false);
    setShowBatchModal(true);
    const existingStored = await getAllInvoices();

    try {
      await runBatchUpload(files, {
        concurrency: 3,
        uploadFn: uploadInvoice,
        verifyGSTFn: fetchGSTInfo,
        compressImageFn: compressImageIfNeeded,
        saveDraftFn: async (data, status) => {
          return await saveInvoiceDraft(data, status as any);
        },
        existingInvoices: existingStored,
        onProgress: (items, summary) => {
          setBatchItems([...items]);
          setBatchSummary({ ...summary });
        },
      });
    } catch (err) {
      console.error("Batch upload encountered error:", err);
    } finally {
      await loadInvoices();
      if (user && userProfile?.subscription?.active) {
        performCloudSync();
      }
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    if (fileList.length === 1) {
      handleFileSelect(fileList[0]);
    } else {
      startBatchUpload(Array.from(fileList));
    }
    e.target.value = "";
  }

  // Upload processor
  async function handleUpload(file: File) {
    setIsUploading(true);

    try {
      const res = await uploadInvoice(file);
      const settings = getAPPSettings();
      const data = res.data;

      let seller_gstin_info = null;
      if (data.seller_gstin && typeof data.seller_gstin === "string") {
        try {
          const gstRes = await fetchGSTInfo(data.seller_gstin);
          seller_gstin_info = gstRes?.data || null;
        } catch (e) {
          console.warn("Could not fetch seller GST info", e);
        }
      }

      let buyer_gstin_info = null;
      if (data.buyer_gstin && typeof data.buyer_gstin === "string") {
        try {
          const gstRes = await fetchGSTInfo(data.buyer_gstin);
          buyer_gstin_info = gstRes?.data || null;
        } catch (e) {
          console.warn("Could not fetch buyer GST info", e);
        }
      }

      data.seller_gstin_info = seller_gstin_info ?? undefined;
      data.buyer_gstin_info = buyer_gstin_info ?? undefined;

      if (settings.autoSave) {
        await saveInvoiceDraft(data, "auto_saved");
        await loadInvoices();
      } else {
        const localId = await saveInvoiceDraft(data, "draft");
        setReviewInvoice({
          ...data,
          _local_id: localId,
        });
      }

      if (user && userProfile?.subscription?.active) {
        performCloudSync();
      }
    } catch (error: any) {
      console.error("Upload failed", error);
      alert(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  // Generate an authentic sample invoice image and send real request to AI
  const loadDemoSampleInvoice = async () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 1200;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top brand accent
      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(40, 40, canvas.width - 80, 8);

      // Invoice Header
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("TAX INVOICE", 40, 95);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("Original for Recipient", canvas.width - 220, 95);

      // Divider line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 120);
      ctx.lineTo(canvas.width - 40, 120);
      ctx.stroke();

      // Metadata
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Invoice No: INV-2026-901", 40, 160);
      ctx.fillText("Invoice Date: 24-10-2026", 40, 190);
      ctx.fillText("Place of Supply: 07 - Delhi", 40, 220);

      // Seller Details
      ctx.fillStyle = "#334155";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Seller Details:", 40, 280);
      ctx.font = "16px sans-serif";
      ctx.fillText("ROSMERTA SAFETY SYSTEMS LIMITED", 40, 310);
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("GSTIN: 07AAACU4747P1ZR", 40, 335);

      // Buyer Details
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Buyer Details:", 480, 280);
      ctx.font = "16px sans-serif";
      ctx.fillText("TECHSOL SYSTEMS PRIVATE LIMITED", 480, 310);
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("GSTIN: 29ABCDE1234F1Z5", 480, 335);

      // Table Header
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(40, 400, canvas.width - 80, 45);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("Item Description", 60, 430);
      ctx.fillText("HSN", 420, 430);
      ctx.fillText("Qty", 520, 430);
      ctx.fillText("Rate", 600, 430);
      ctx.fillText("Amount (INR)", 730, 430);

      // Table Row
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText("Cloud IT & Software Consulting Services", 60, 480);
      ctx.fillText("998311", 420, 480);
      ctx.fillText("1", 520, 480);
      ctx.fillText("10,000.00", 600, 480);
      ctx.fillText("10,000.00", 730, 480);

      ctx.strokeRect(40, 400, canvas.width - 80, 130);

      // Totals
      const summaryY = 620;
      ctx.font = "16px sans-serif";
      ctx.fillText("Taxable Value:", 520, summaryY);
      ctx.fillText("Rs 10,000.00", 730, summaryY);

      ctx.fillText("IGST @ 18%:", 520, summaryY + 35);
      ctx.fillText("Rs 1,800.00", 730, summaryY + 35);

      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(500, summaryY + 55, canvas.width - 540, 2);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("Invoice Total:", 520, summaryY + 90);
      ctx.fillText("Rs 11,800.00", 730, summaryY + 90);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png")
      );
      if (!blob) throw new Error("Could not create image blob");

      const sampleFile = new File([blob], "sample_tax_invoice.png", {
        type: "image/png",
      });

      // Send REAL request to backend Gemini AI extraction!
      await handleUpload(sampleFile);
    } catch (err: any) {
      console.warn("Real AI extraction on sample failed, loading local preview draft", err);
      const fallbackData = {
        invoice_number: "SAMPLE-INV-901",
        invoice_date: "24-10-2026",
        seller_gstin: userProfile?.primary_gstin || "07AAACU4747P1ZR",
        buyer_gstin: "29ABCDE1234F1Z5",
        invoice_type: "B2B" as const,
        pos: "07",
        taxable_value: 10000.0,
        cgst: 0.0,
        sgst: 0.0,
        igst: 1800.0,
        invoice_total: 11800.0,
      };
      const localId = await saveInvoiceDraft(fallbackData, "draft");
      setReviewInvoice({
        ...fallbackData,
        _local_id: localId,
      });
      await loadInvoices();
    }
  };

  // Filtered invoices computation
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = inv.name.toLowerCase().includes(q);
        const matchBuyerGstin = (inv.raw.buyer_gstin || "").toLowerCase().includes(q);
        const matchSellerGstin = (inv.raw.seller_gstin || "").toLowerCase().includes(q);
        const matchTradeName = (inv.raw.buyer_gstin_info?.trade_name || "").toLowerCase().includes(q);
        if (!matchName && !matchBuyerGstin && !matchSellerGstin && !matchTradeName) return false;
      }

      if (filterType === "b2b") return inv.raw.invoice_type === "B2B";
      if (filterType === "b2c") return inv.raw.invoice_type === "B2C";
      if (filterType === "draft") return inv.status === "draft";
      if (filterType === "confirmed") return inv.status === "confirmed";

      return true;
    });
  }, [invoices, searchQuery, filterType]);

  const totalAmount = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalTax = invoices.reduce((s, i) => s + Number(i.gst), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28">
        {/* Desktop Quick Dropzone */}
        <div
          id="tour-scan-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const droppedFiles = Array.from(e.dataTransfer.files || []);
            if (droppedFiles.length === 1) {
              handleFileSelect(droppedFiles[0]);
            } else if (droppedFiles.length > 1) {
              startBatchUpload(droppedFiles);
            }
          }}
          className="hidden md:flex items-center justify-between p-7 bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 rounded-3xl text-white shadow-xl shadow-indigo-500/15 mb-6 relative overflow-hidden border border-indigo-500/20"
        >
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Invoice Extraction & Batch Processing
            </div>
            <h2 className="text-2xl font-black tracking-tight">Upload or Snap Invoices</h2>
            <p className="text-indigo-100/90 text-sm mt-1 leading-relaxed">
              Drag &amp; drop single or batch invoices (PDF / PNG / JPG). Concurrency pool (3x) extracts numbers, GSTINs, and validates Section 16(2) duplicates automatically.
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-3">
            <button
              onClick={() => uploadRef.current?.click()}
              className="px-5 py-3 rounded-2xl bg-white text-indigo-700 font-bold text-sm shadow-md hover:bg-indigo-50 active:scale-95 transition flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Upload Files
            </button>
            <button
              onClick={() => captureRef.current?.click()}
              className="px-5 py-3 rounded-2xl bg-indigo-950/70 hover:bg-indigo-900 text-white font-semibold text-sm border border-white/20 active:scale-95 transition flex items-center gap-2"
            >
              <Camera className="w-4 h-4" /> Camera
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-6">
          <StatCard
            title="Total Invoices"
            value={invoices.length}
            icon={<FileText className="w-5 h-5 sm:w-6 sm:h-6" />}
            gradient="from-blue-600 to-indigo-600"
            bg="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
          />
          <StatCard
            title="Taxable Sales"
            value={formatINR(Math.max(0, totalAmount - totalTax))}
            icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />}
            gradient="from-emerald-600 to-teal-600"
            bg="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
          />
          <div className="col-span-2 md:col-span-1">
            <StatCard
              title="Total GST (Output)"
              value={formatINR(totalTax)}
              icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
              gradient="from-purple-600 to-indigo-600"
              bg="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
            />
          </div>
        </div>

        {/* Quick Actions for Returns & Accounting (Desktop Only to keep Mobile clean & uncluttered) */}
        <div className="hidden md:grid md:grid-cols-3 gap-4 mb-6">
          <ActionCard
            title="GSTR-1 Outward Return"
            description="Download portal-ready JSON for B2B & B2C sales"
            icon={<FileText className="w-5 h-5 sm:w-6 sm:h-6" />}
            gradient="from-blue-600 to-indigo-600"
            onClick={() => router.push("/gstr-1")}
          />
          <ActionCard
            title="GSTR-3B Monthly Return"
            description="Summary of output tax liability and tax payable"
            icon={<FileCheckCorner className="w-5 h-5 sm:w-6 sm:h-6" />}
            gradient="from-purple-600 to-indigo-600"
            onClick={() => router.push("/gstr-3b")}
          />
          <ActionCard
            title="Tally Prime XML Export"
            description="1-Click accounting import for Sales & Purchase vouchers"
            icon={<FileCode className="w-5 h-5 sm:w-6 sm:h-6" />}
            gradient="from-amber-600 to-orange-600"
            onClick={() => setShowTallyModal(true)}
          />
        </div>

        {/* Invoice List Section */}
        <div id="tour-invoice-list" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          {/* Section Header with Live Search and Filters */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Recorded Invoices</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {filteredInvoices.length} of {invoices.length} invoices shown
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice or GSTIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tally XML Quick Export */}
              <button
                onClick={() => setShowTallyModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Export vouchers to Tally Prime XML"
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Tally XML
              </button>

              {/* Try Demo Bill Action */}
              <button
                onClick={loadDemoSampleInvoice}
                className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-1.5 transition"
                title="Load a demo invoice to test instantly"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Demo Bill
              </button>
            </div>
          </div>

          {/* Filter Chips Bar */}
          <div className="px-4 py-2.5 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { id: "all", label: "ALL" },
              { id: "b2b", label: "B2B" },
              { id: "b2c", label: "B2C" },
              { id: "confirmed", label: "CONFIRMED" },
              { id: "draft", label: "DRAFT" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setFilterType(opt.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1 rounded-full font-bold text-xs tracking-wider transition-all ${
                  filterType === opt.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* List or Empty State */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredInvoices.length === 0 ? (
              invoices.length === 0 ? (
                <EmptyState
                  onUpload={() => setShowUploadSheet(true)}
                  onDemo={loadDemoSampleInvoice}
                />
              ) : (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                  No invoices match your search query &quot;{searchQuery}&quot;.
                </div>
              )
            ) : (
              filteredInvoices
                .slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage)
                .map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    onClick={() => setReviewInvoice(inv.raw)}
                  />
                ))
            )}
          </div>

          {/* Pagination Controls */}
          {filteredInvoices.length > 0 && (
            <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span>
                  Showing{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {Math.min(currentPage * itemsPerPage, filteredInvoices.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {filteredInvoices.length}
                  </span>{" "}
                  invoices
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <label className="flex items-center gap-1">
                  <span>Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>

                {Array.from(
                  { length: Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage)) },
                  (_, i) => i + 1
                )
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === Math.ceil(filteredInvoices.length / itemsPerPage) ||
                      Math.abs(p - currentPage) <= 1
                  )
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <span key={page} className="flex items-center">
                        {prev && page - prev > 1 && (
                          <span className="px-1 text-slate-400 text-xs">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                            currentPage === page
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}

                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(Math.ceil(filteredInvoices.length / itemsPerPage), p + 1)
                    )
                  }
                  disabled={
                    currentPage >= Math.ceil(filteredInvoices.length / itemsPerPage)
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Desktop Floating Quick Button */}
      <button
        onClick={() => setShowUploadSheet(true)}
        className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl items-center justify-center hover:scale-105 active:scale-95 transition-all z-40"
        title="Upload or scan bill"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Upload Sheet Modal */}
      {showUploadSheet && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUploadSheet(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 pb-8 w-full md:max-w-md shadow-2xl animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Upload or Snap Invoice</h3>
                <button
                  onClick={() => setShowUploadSheet(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/25 active:scale-98 transition"
                >
                  <Upload className="w-5 h-5" /> Choose Invoices (Single or Batch)
                </button>

                <button
                  onClick={() => captureRef.current?.click()}
                  className="w-full py-4 bg-slate-50 border-2 border-slate-200 text-slate-800 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-100 active:scale-98 transition"
                >
                  <Camera className="w-5 h-5 text-indigo-600" /> Take Camera Photo
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden Inputs */}
      <input
        ref={uploadRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={onFileChange}
      />
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />

      {isUploading && <UploadingModal />}

      {/* Multi-Invoice Batch Concurrency Modal */}
      <BatchUploadModal
        isOpen={showBatchModal}
        items={batchItems}
        summary={batchSummary}
        onRetryFailed={retryFailedBatch}
        onClose={() => {
          setShowBatchModal(false);
          loadInvoices();
        }}
      />

      {/* Tally Prime & ERP 9 XML Export Modal */}
      <TallyExportModal
        isOpen={showTallyModal}
        onClose={() => setShowTallyModal(false)}
        userGSTIN={userProfile?.primary_gstin || ""}
        invoices={invoices}
        defaultCompanyName={userProfile?.business_name || "My Business"}
      />

      {/* Preview Modal */}
      {selectedFile && previewUrl && (
        <FilePreviewModal
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

      {/* Review Modal */}
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
            await deleteInvoice(reviewInvoice._local_id);
            setReviewInvoice(null);
            await loadInvoices();
          }}
          onConfirm={async () => {
            await saveInvoiceDraft(reviewInvoice, "confirmed");
            setReviewInvoice(null);
            await loadInvoices();
          }}
        />
      )}

      {/* Edit Modal */}
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

/* ---------------- Subcomponents ---------------- */

function StatCard({ title, value, icon, gradient, bg }: any) {
  return (
    <div className={`${bg} rounded-3xl p-4 sm:p-5 border shadow-xs flex items-center gap-4 transition-colors`}>
      <div className={`w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr ${gradient} rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{title}</p>
        <p className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight truncate tabular-nums font-mono">{value}</p>
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon, gradient, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all active:scale-98 text-left group flex items-center justify-between"
    >
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 bg-gradient-to-tr ${gradient} rounded-2xl flex items-center justify-center text-white shadow-md`}>
          {icon}
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

function EmptyState({ onUpload, onDemo }: { onUpload: () => void; onDemo: () => void }) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
        <FileText className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">No Invoices Added Yet</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">
        Scan your first bill or test immediately with a ready-made demo invoice.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onUpload}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 hover:shadow-xl active:scale-98 transition flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" /> Upload First Invoice
        </button>
        <button
          onClick={onDemo}
          className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl font-bold active:scale-98 transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-500" /> Try Sample Bill
        </button>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onClick }: { invoice: InvoiceUI; onClick: () => void }) {
  const isConfirmed = invoice.status === "confirmed";
  const isB2B = invoice.raw?.invoice_type === "B2B";
  const isSynced = invoice.synced_to_cloud;

  return (
    <button
      onClick={onClick}
      className="w-full p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 active:bg-slate-100/60 dark:active:bg-slate-800 transition-all text-left flex items-center justify-between gap-3 group"
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <FileCheckCorner className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{invoice.name}</p>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                isB2B
                  ? "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {isB2B ? "B2B" : "B2C"}
            </span>
            {invoice.raw?.warning && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                Warning
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {invoice.date} • {invoice.raw?.buyer_gstin_info?.trade_name || invoice.raw?.buyer_gstin || "Direct Consumer"}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isConfirmed
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isConfirmed ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isConfirmed ? "Confirmed" : "Draft"}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isSynced
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              {isSynced ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
              {isSynced ? "Synced" : "Local"}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50 tabular-nums font-mono">
          {formatINR(invoice.amount)}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums font-mono">
          Tax {formatINR(invoice.gst)}
        </p>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 ml-auto mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}
