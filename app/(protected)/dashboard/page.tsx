"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
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
  ShoppingCart,
  Clock,
  Edit3,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  MessageSquare,
  Eye,
  Share2,
  Send,
  Calendar,
} from "lucide-react";

import { SYNC_EVENT } from "@/lib/constants";
import { uploadInvoice, fetchGSTInfo } from "@/lib/api";
import InvoiceReviewModal from "@/components/InvoiceReviewModal";
import { getAPPSettings } from "@/lib/settings";
import {
  saveInvoiceDraft,
  getAllInvoices,
  deleteInvoice,
  getAllPurchases,
  getAllProducts,
  type PurchaseBill,
  type Product,
} from "@/lib/storage";
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
import {
  extractInvoiceTotal,
  extractInvoiceTaxable,
  extractInvoiceTax,
  extractCustomerName,
} from "@/lib/gstBillingEngine";
import { checkDuplicateInvoice } from "@/lib/duplicates";
import toast from "react-hot-toast";

/* ---------------- Types ---------------- */

type InvoiceUI = {
  id: string;
  name: string;
  date: string;
  amount: string;
  taxable: string;
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
              className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 active:scale-98 transition text-sm"
            >
              Cancel
            </button>
            <button
              disabled={isCompressing}
              onClick={() => onConfirm(file)}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xs active:scale-98 transition flex items-center justify-center gap-2 text-sm"
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
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, boolean>>({});
  const [mobileTab, setMobileTab] = useState<"invoices" | "purchases">("invoices");
  const [timeRange, setTimeRange] = useState<"all" | "month" | "30d" | "quarter">("all");
  const [isUploading, setIsUploading] = useState(false);
  const [reviewInvoice, setReviewInvoice] = useState<any>(null);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "b2b" | "b2c" | "draft" | "confirmed" | "unpaid" | "paid">("all");
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
      router.replace("/settings?tab=profile");
    }
  }, [user, userProfile, router]);

  // Auto-redirect mobile browsers to dedicated mobile experience
  useEffect(() => {
    function checkMobile() {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        router.replace("/mobile");
      }
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [router]);

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
    const [stored, storedPurchases, storedProducts] = await Promise.all([
      getAllInvoices(),
      getAllPurchases().catch(() => []),
      getAllProducts().catch(() => []),
    ]);
    const uiInvoices: InvoiceUI[] = stored.map((r) => {
      const total = extractInvoiceTotal(r.data);
      const taxable = extractInvoiceTaxable(r.data);
      const tax = extractInvoiceTax(r.data);
      return {
        id: r.id,
        name: r.data.invoice_number || "Invoice",
        date: r.data.invoice_date || "-",
        amount: total.toFixed(2),
        taxable: taxable.toFixed(2),
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
    setPurchases(
      storedPurchases.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
    );
    setProducts(storedProducts || []);
  }

  function sendOverdueReminder(inv: InvoiceUI) {
    const invNum = inv.name;
    const amount = inv.amount;
    const party = extractCustomerName(inv.raw);
    const seller = userProfile?.trade_name || userProfile?.business_name || "Our Business";
    const text = encodeURIComponent(
      `*PAYMENT REMINDER*\n\n` +
      `Dear ${party},\n` +
      `This is a gentle reminder regarding payment for invoice *${invNum}* dated ${inv.date}.\n\n` +
      `• *Amount Due:* ₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n` +
      `• *Status:* Payment Pending\n\n` +
      `Please clear the outstanding balance at your earliest convenience.\n` +
      `Thank you,\n*${seller}*`
    );
    const phone = (inv.raw?.buyer?.phone || inv.raw?.client?.phone || "").replace(/[^0-9]/g, "");
    const url = phone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${phone.startsWith("91") ? phone : "91" + phone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
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

      // Duplicate Check
      const storedInvoices = await getAllInvoices();
      const dupCheck = checkDuplicateInvoice(data, storedInvoices);
      if (dupCheck.isDuplicate) {
        data.duplicate_warning = dupCheck.warningMessage;
        toast.error(dupCheck.warningMessage, {
          duration: 7000,
        });
      }

      if (settings.autoSave && !dupCheck.isDuplicate) {
        await saveInvoiceDraft(data, "auto_saved");
        await loadInvoices();
        toast.success("Invoice saved automatically!");
      } else {
        const localId = await saveInvoiceDraft(data, "draft");
        setReviewInvoice({
          ...data,
          duplicate_warning: dupCheck.isDuplicate ? dupCheck.warningMessage : undefined,
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

  // Date range helper for Zoho Books style period filtering
  function isDateInPeriod(dateStr: string | undefined, period: "all" | "month" | "30d" | "quarter"): boolean {
    if (period === "all" || !dateStr || dateStr === "-") return true;
    const parts = String(dateStr).trim().split(/[-/.]/);
    if (parts.length < 3) return true;
    let d: Date;
    if (parts[0].length === 4) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else if (parts[2].length === 4) {
      d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      return true;
    }
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    if (period === "30d") {
      const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diff >= 0 && diff <= 30;
    }
    if (period === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === "quarter") {
      const currentQ = Math.floor(now.getMonth() / 3);
      const dateQ = Math.floor(d.getMonth() / 3);
      return dateQ === currentQ && d.getFullYear() === now.getFullYear();
    }
    return true;
  }

  // Filtered invoices computation
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!isDateInPeriod(inv.date || inv.raw?.invoice_date, timeRange)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = inv.name.toLowerCase().includes(q);
        const matchBuyerGstin = (inv.raw?.buyer_gstin || "").toLowerCase().includes(q);
        const matchSellerGstin = (inv.raw?.seller_gstin || "").toLowerCase().includes(q);
        const matchTradeName = (inv.raw?.buyer_gstin_info?.trade_name || extractCustomerName(inv.raw)).toLowerCase().includes(q);
        if (!matchName && !matchBuyerGstin && !matchSellerGstin && !matchTradeName) return false;
      }

      if (filterType === "b2b") return inv.raw?.invoice_type === "B2B";
      if (filterType === "b2c") return inv.raw?.invoice_type === "B2C";
      if (filterType === "draft") return inv.status === "draft";
      if (filterType === "confirmed") return inv.status === "confirmed";
      if (filterType === "unpaid") {
        return (inv.raw?.payment_status || inv.raw?.paymentStatus || "Unpaid") !== "Paid";
      }
      if (filterType === "paid") {
        return (inv.raw?.payment_status || inv.raw?.paymentStatus || "Unpaid") === "Paid";
      }

      return true;
    });
  }, [invoices, searchQuery, filterType, timeRange]);

  // Filtered purchases computation
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (!isDateInPeriod(p.date, timeRange)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = (p.invoiceNumber || "").toLowerCase().includes(q);
        const matchSupplier = (p.supplierName || "").toLowerCase().includes(q);
        const matchGstin = (p.supplierGstin || "").toLowerCase().includes(q);
        if (!matchNumber && !matchSupplier && !matchGstin) return false;
      }
      if (filterType === "unpaid") {
        return (p.paymentStatus || "Unpaid") !== "Paid";
      }
      if (filterType === "paid") {
        return (p.paymentStatus || "Unpaid") === "Paid";
      }
      return true;
    });
  }, [purchases, searchQuery, filterType, timeRange]);


  // Financial aggregates (calculated across current time range)
  const periodInvoices = useMemo(() => {
    return invoices.filter((inv) => isDateInPeriod(inv.date || inv.raw?.invoice_date, timeRange));
  }, [invoices, timeRange]);

  const periodPurchases = useMemo(() => {
    return purchases.filter((p) => isDateInPeriod(p.date, timeRange));
  }, [purchases, timeRange]);

  const totalAmount = periodInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalTax = periodInvoices.reduce((s, i) => s + Number(i.gst), 0);
  const totalTaxable = Math.max(0, totalAmount - totalTax);

  const totalPurchases = periodPurchases.reduce(
    (s, p) => s + (Number(p.total) || 0),
    0
  );
  const totalITC = periodPurchases
    .filter(
      (p) =>
        p.itcEligibility === "eligible" || p.itcEligibility === "capital_goods"
    )
    .reduce(
      (s, p) =>
        s +
        ((Number(p.cgst) || 0) +
          (Number(p.sgst) || 0) +
          (Number(p.igst) || 0) +
          (Number(p.cess) || 0)),
      0
    );

  const netGstPayable = Math.max(0, totalTax - totalITC);
  const surplusITC = Math.max(0, totalITC - totalTax);

  const unpaidSalesInvoices = useMemo(() => {
    return invoices.filter(
      (i) => (i.raw?.payment_status || i.raw?.paymentStatus || "Unpaid") !== "Paid"
    );
  }, [invoices]);

  const unpaidSales = unpaidSalesInvoices.reduce((s, i) => s + Number(i.amount), 0);

  const unpaidPurchasesList = useMemo(() => {
    return purchases.filter((p) => (p.paymentStatus || "Unpaid") !== "Paid");
  }, [purchases]);

  const unpaidPurchases = unpaidPurchasesList.reduce(
    (s, p) => s + (Number(p.total) || 0),
    0
  );

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const overdueInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isPaid = (inv.raw?.payment_status || inv.raw?.paymentStatus || "Unpaid") === "Paid";
      if (isPaid) return false;
      const due = inv.raw?.due_date || inv.raw?.dueDate;
      if (!due) return false;
      const parts = String(due).trim().split(/[-/.]/);
      if (parts.length < 3) return false;
      let parsedDue = "";
      if (parts[0].length === 4) {
        parsedDue = `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else if (parts[2].length === 4) {
        parsedDue = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
      return Boolean(parsedDue && parsedDue < todayStr);
    });
  }, [invoices, todayStr]);

  const overdueSalesAmount = useMemo(() => {
    return overdueInvoices.reduce((s, i) => s + Number(i.amount), 0);
  }, [overdueInvoices]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (p) => !p.isService && Number(p.stock ?? 0) <= Number(p.minStockAlert ?? 5)
    );
  }, [products]);

  // Zoho Books style Receivables Aging Breakdown (0-30, 31-60, 60+ days)
  const aging = useMemo(() => {
    const todayMs = Date.now();
    let current_0_30 = 0;
    let count_0_30 = 0;
    let overdue_31_60 = 0;
    let count_31_60 = 0;
    let overdue_60_plus = 0;
    let count_60_plus = 0;

    invoices.forEach((inv) => {
      const isPaid = (inv.raw?.payment_status || inv.raw?.paymentStatus || "Unpaid") === "Paid";
      if (isPaid) return;
      const amt = Number(inv.amount) || 0;
      const due = inv.raw?.due_date || inv.raw?.dueDate || inv.date;
      let diffDays = 0;
      if (due && due !== "-") {
        const parts = String(due).trim().split(/[-/.]/);
        if (parts.length >= 3) {
          let dueMs = 0;
          if (parts[0].length === 4) {
            dueMs = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`).getTime();
          } else if (parts[2].length === 4) {
            dueMs = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
          }
          if (dueMs > 0) {
            diffDays = Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24));
          }
        }
      }

      if (diffDays <= 30) {
        current_0_30 += amt;
        count_0_30++;
      } else if (diffDays <= 60) {
        overdue_31_60 += amt;
        count_31_60++;
      } else {
        overdue_60_plus += amt;
        count_60_plus++;
      }
    });

    const totalReceivables = current_0_30 + overdue_31_60 + overdue_60_plus;
    return {
      current_0_30,
      count_0_30,
      overdue_31_60,
      count_31_60,
      overdue_60_plus,
      count_60_plus,
      totalReceivables,
    };
  }, [invoices]);

  // 6-Month Cash Flow & Trend Calculation
  const monthlyCashFlow = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const months: { key: string; label: string; year: number; month: number; sales: number; purchases: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: `${monthNames[m]} '${String(y).slice(2)}`,
        year: y,
        month: m,
        sales: 0,
        purchases: 0,
      });
    }

    invoices.forEach((inv) => {
      const dateStr = inv.date || inv.raw?.invoice_date || inv.raw?.invoiceDate;
      if (!dateStr || dateStr === "-") return;
      const parts = String(dateStr).trim().split(/[-/.]/);
      if (parts.length < 3) return;
      let y = 0, m = 0;
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
      } else if (parts[2].length === 4) {
        y = parseInt(parts[2], 10);
        m = parseInt(parts[1], 10) - 1;
      }
      const found = months.find((mo) => mo.year === y && mo.month === m);
      if (found) {
        found.sales += Number(inv.amount) || 0;
      }
    });

    purchases.forEach((p) => {
      const dateStr = p.date || (p as any).invoiceDate;
      if (!dateStr) return;
      const parts = String(dateStr).trim().split(/[-/.]/);
      if (parts.length < 3) return;
      let y = 0, m = 0;
      if (parts[0].length === 4) {
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10) - 1;
      } else if (parts[2].length === 4) {
        y = parseInt(parts[2], 10);
        m = parseInt(parts[1], 10) - 1;
      }
      const found = months.find((mo) => mo.year === y && mo.month === m);
      if (found) {
        found.purchases += Number(p.total) || 0;
      }
    });

    return months;
  }, [invoices, purchases]);

  const maxMonthlyVal = useMemo(() => {
    const vals = monthlyCashFlow.flatMap((m) => [m.sales, m.purchases]);
    return Math.max(1000, ...vals);
  }, [monthlyCashFlow]);

  const grossProfit = totalAmount - totalPurchases;
  const profitMargin = totalAmount > 0 ? ((grossProfit / totalAmount) * 100).toFixed(1) : "0.0";
  const itcCoverage = totalTax > 0 ? Math.min(100, Math.round((totalITC / totalTax) * 100)) : 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28">
        {/* Top Bar: Business Identity & Primary Action Buttons */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 mb-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {userProfile?.business_name || userProfile?.trade_name || "My Business"}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 font-mono">
                FY 2026-27
              </span>
              {userProfile?.primary_gstin && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  GSTIN: {userProfile.primary_gstin}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Billing, purchases, and customer collections
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link
              href="/invoices/new"
              className="flex-1 sm:flex-initial py-2 px-3.5 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Sale</span>
            </Link>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="flex-1 sm:flex-initial py-2 px-3.5 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Add Purchase</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTallyModal(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              title="Export to Tally XML"
            >
              <FileCode className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={loadDemoSampleInvoice}
              className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 transition"
              title="Load demo sample bill"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Primary Business Metric Tiles (Compact) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
          {/* Card 1: To Collect */}
          <div
            onClick={() => {
              setMobileTab("invoices");
              setFilterType("unpaid");
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400/60 dark:hover:border-emerald-600/60 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                You&apos;ll Get (To Collect)
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowDownRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {formatINR(unpaidSales)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{unpaidSalesInvoices.length} unpaid customer bills</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• Filter</span>
            </p>
          </div>

          {/* Card 2: To Pay */}
          <div
            onClick={() => {
              setMobileTab("purchases");
              setFilterType("unpaid");
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-rose-400/60 dark:hover:border-rose-600/60 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                You&apos;ll Give (To Pay)
              </span>
              <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              {formatINR(unpaidPurchases)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{unpaidPurchasesList.length} vendor bills pending</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">• View</span>
            </p>
          </div>

          {/* Card 3: Total Sales */}
          <div
            onClick={() => {
              setMobileTab("invoices");
              setFilterType("all");
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/60 dark:hover:border-indigo-600/60 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Total Sales
              </span>
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
              {formatINR(totalAmount)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              {invoices.length} invoices recorded
            </p>
          </div>

          {/* Card 4: Net GST to Pay */}
          <Link
            href="/gstr-3b"
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-purple-400/60 dark:hover:border-purple-600/60 rounded-xl p-3.5 sm:p-4 shadow-xs transition-all cursor-pointer group block"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {netGstPayable > 0 ? "Net GST to Pay" : "Surplus Tax Credit"}
              </span>
              <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono tracking-tight">
              {netGstPayable > 0 ? formatINR(netGstPayable) : formatINR(surplusITC)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
              <span>ITC: {formatINR(totalITC)}</span>
              <span className="text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-0.5 transition">
                GSTR-3B &rarr;
              </span>
            </p>
          </Link>
        </div>

        {/* Alerts (Only when actionable items exist) */}
        {((overdueInvoices.length > 0 && !dismissedWarnings["overdue"]) ||
          (lowStockProducts.length > 0 && !dismissedWarnings["lowStock"])) && (
          <div className="space-y-2 mb-4">
            {overdueInvoices.length > 0 && !dismissedWarnings["overdue"] && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>{overdueInvoices.length} {overdueInvoices.length === 1 ? "bill" : "bills"} overdue</strong> ({formatINR(overdueSalesAmount)}) past due date
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {overdueInvoices[0] && (
                    <button
                      onClick={() => sendOverdueReminder(overdueInvoices[0])}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 transition active:scale-95 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp Reminder</span>
                    </button>
                  )}
                  <button
                    onClick={() => setDismissedWarnings((prev) => ({ ...prev, overdue: true }))}
                    className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {lowStockProducts.length > 0 && !dismissedWarnings["lowStock"] && (
              <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-orange-900 dark:text-orange-200">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>
                    <strong>{lowStockProducts.length} items low in stock</strong> ({lowStockProducts.slice(0, 2).map((p) => p.name).join(", ")}{lowStockProducts.length > 2 ? ` +${lowStockProducts.length - 2} more` : ""})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/inventory"
                    className="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 transition active:scale-95"
                  >
                    <span>Manage Stock</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => setDismissedWarnings((prev) => ({ ...prev, lowStock: true }))}
                    className="p-1 text-orange-500 hover:text-orange-700 dark:hover:text-orange-300"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transaction Ledger */}
        <div id="tour-invoice-list" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          {/* Header with 2 Tabs and Search */}
          <div className="p-3 sm:px-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMobileTab("invoices")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    mobileTab === "invoices"
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Sales Invoices ({invoices.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("purchases")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    mobileTab === "purchases"
                      ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Purchase Bills ({purchases.length})</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search party, invoice #, GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Chips Bar */}
          <div className="px-4 py-2 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { id: "all", label: "ALL" },
              { id: "unpaid", label: "UNPAID" },
              { id: "paid", label: "PAID" },
              { id: "b2b", label: "B2B" },
              { id: "b2c", label: "B2C" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setFilterType(opt.id as any);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1 rounded-full font-bold text-xs tracking-wider transition-all cursor-pointer ${
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
            {mobileTab === "invoices" ? (
              filteredInvoices.length === 0 ? (
                invoices.length === 0 ? (
                  <EmptyState
                    onUpload={() => setShowUploadSheet(true)}
                    onDemo={loadDemoSampleInvoice}
                  />
                ) : (
                  <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No sales invoices match your search query &quot;{searchQuery}&quot;.
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
                      onWhatsApp={() => sendOverdueReminder(inv)}
                    />
                  ))
              )
            ) : (
              filteredPurchases.length === 0 ? (
                purchases.length === 0 ? (
                  <div className="py-16 px-6 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No Purchase Bills Recorded Yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 max-w-sm mx-auto">
                      Scan vendor bills to claim Input Tax Credit (ITC) automatically.
                    </p>
                    <button
                      onClick={() => uploadRef.current?.click()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs shadow-xs active:scale-98 transition inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Scan Purchase Bill
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                    No purchase bills match your search query &quot;{searchQuery}&quot;.
                  </div>
                )
              ) : (
                filteredPurchases
                  .slice((currentPage - 1) * itemsPerPage, (currentPage - 1) * itemsPerPage + itemsPerPage)
                  .map((p) => (
                    <PurchaseRow
                      key={p.id}
                      purchase={p}
                      onClick={() => router.push("/purchases")}
                    />
                  ))
              )
            )}
          </div>

          {/* Pagination Controls */}
          {((mobileTab === "invoices" ? filteredInvoices.length : filteredPurchases.length) > 0) && (
            <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span>
                  Showing{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {Math.min(currentPage * itemsPerPage, mobileTab === "invoices" ? filteredInvoices.length : filteredPurchases.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {mobileTab === "invoices" ? filteredInvoices.length : filteredPurchases.length}
                  </span>{" "}
                  {mobileTab === "invoices" ? "invoices" : "bills"}
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
                  { length: Math.max(1, Math.ceil((mobileTab === "invoices" ? filteredInvoices.length : filteredPurchases.length) / itemsPerPage)) },
                  (_, i) => i + 1
                )
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === Math.ceil((mobileTab === "invoices" ? filteredInvoices.length : filteredPurchases.length) / itemsPerPage) ||
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
                      Math.min(Math.ceil((mobileTab === "invoices" ? filteredInvoices.length : filteredPurchases.length) / itemsPerPage), p + 1)
                    )
                  }
                  disabled={
                    currentPage >= Math.ceil((mobileTab === "invoices" ? filteredInvoices.length : filteredPurchases.length) / itemsPerPage)
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

function StatCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  badgeColor = "indigo",
  onClick,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: "indigo" | "emerald" | "amber" | "rose" | "blue";
  onClick?: () => void;
}) {
  const badgeClasses = {
    indigo: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60",
    emerald: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
    amber: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
    rose: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60",
    blue: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
  }[badgeColor];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all ${
        onClick ? "cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 active:scale-98 group" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        {badge && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-[130px] font-mono ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{title}</p>
        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate tabular-nums font-mono mt-0.5">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function ActionCard({ title, description, icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all active:scale-98 text-left group flex items-center justify-between"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
    </button>
  );
}

function EmptyState({ onUpload, onDemo }: { onUpload: () => void; onDemo: () => void }) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">No Invoices Added Yet</h3>
      <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 max-w-sm mx-auto">
        Scan your first bill or test immediately with a ready-made demo invoice.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onUpload}
          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-xs active:scale-98 transition flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" /> Upload First Invoice
        </button>
        <button
          onClick={onDemo}
          className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-semibold text-xs active:scale-98 transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-500" /> Try Sample Bill
        </button>
      </div>
    </div>
  );
}

function InvoiceRow({
  invoice,
  onClick,
  onWhatsApp,
}: {
  invoice: InvoiceUI;
  onClick: () => void;
  onWhatsApp?: () => void;
}) {
  const isConfirmed = invoice.status === "confirmed";
  const isB2B = invoice.raw?.invoice_type === "B2B";
  const isSynced = invoice.synced_to_cloud;
  const isPaid = (invoice.raw?.payment_status || invoice.raw?.paymentStatus || "Unpaid") === "Paid";
  const customerName = extractCustomerName(invoice.raw);
  const initials = customerName
    ? customerName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "INV";

  return (
    <div
      onClick={onClick}
      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-50/90 dark:hover:bg-slate-800/60 active:bg-slate-100/70 dark:active:bg-slate-800 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60 font-mono group-hover:scale-105 transition-transform">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
              {customerName}
            </p>
            <span className="text-[11px] text-slate-400 font-mono">({invoice.name})</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                isB2B
                  ? "bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {isB2B ? "B2B" : "B2C"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold ${
                isPaid
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isPaid ? "Paid" : "Unpaid"}
            </span>
            {invoice.raw?.warning && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300">
                Warning
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-2 flex-wrap">
            <span>{invoice.date}</span>
            {invoice.raw?.buyer_gstin && (
              <>
                <span>•</span>
                <span className="font-mono text-[10px] text-slate-400">GSTIN: {invoice.raw.buyer_gstin}</span>
              </>
            )}
            <span>•</span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold ${
                isConfirmed
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${isConfirmed ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isConfirmed ? "Confirmed" : "Draft"}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold ${
                isSynced
                  ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              }`}
            >
              {isSynced ? <Cloud className="w-2.5 h-2.5" /> : <CloudOff className="w-2.5 h-2.5" />}
              {isSynced ? "Synced" : "Local"}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right flex items-center gap-2.5 shrink-0">
        <div>
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 tabular-nums font-mono">
            {formatINR(invoice.amount)}
          </p>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums font-mono flex items-center justify-end gap-1">
            <span>Taxable: {formatINR(invoice.taxable || 0)}</span>
            <span>•</span>
            <span>Tax: {formatINR(invoice.gst)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 ml-1">
          {onWhatsApp && !isPaid && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWhatsApp();
              }}
              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
              title="Send WhatsApp payment reminder"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
}

function PurchaseRow({ purchase, onClick }: { purchase: PurchaseBill; onClick: () => void }) {
  const isEligible = purchase.itcEligibility === "eligible" || purchase.itcEligibility === "capital_goods";
  const taxCredit = (Number(purchase.cgst) || 0) + (Number(purchase.sgst) || 0) + (Number(purchase.igst) || 0) + (Number(purchase.cess) || 0);

  return (
    <button
      onClick={onClick}
      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 active:bg-slate-100/60 dark:active:bg-slate-800 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
          <ShoppingCart className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm truncate">
              {purchase.invoiceNumber || "Purchase Bill"}
            </p>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                isEligible
                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {isEligible ? "ITC Eligible" : "ITC Blocked"}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {purchase.paymentStatus || "Unpaid"}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-2 flex-wrap">
            <span>{purchase.date || "-"}</span>
            <span>•</span>
            <span className="truncate">{purchase.supplierName || purchase.supplierGstin || "Vendor Bill"}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Tax Credit: {formatINR(taxCredit)}
            </span>
            {purchase.supplierGstin && (
              <span className="text-[10px] text-slate-400 font-mono">
                GSTIN: {purchase.supplierGstin}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 tabular-nums font-mono">
          {formatINR(purchase.total || 0)}
        </p>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums font-mono flex items-center justify-end gap-1">
          <span>Taxable: {formatINR(purchase.taxableAmount || 0)}</span>
          <span>•</span>
          <span>ITC: {formatINR(taxCredit)}</span>
        </div>
      </div>
    </button>
  );
}
