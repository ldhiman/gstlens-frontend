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

  Wallet,

  Package,

  BarChart3,

  Users,

  Trash2,

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

  deletePurchase,

  getAllProducts,

  type PurchaseBill,

  type Product,

} from "@/lib/storage";

import UploadingModal from "@/components/UploadingModal";

import { isAbortError, type ScanStage } from "@/lib/scanProgress";

import EditInvoiceModal from "@/components/InvoiceEditModal";

import BatchUploadModal from "@/components/BatchUploadModal";

import TallyExportModal from "@/components/TallyExportModal";

import TaxHealthWidget from "@/components/TaxHealthWidget";

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

              className="flex-1 py-3 bg-[#047857] hover:bg-[#065f46] text-white font-semibold rounded-xl shadow-xs active:scale-98 transition flex items-center justify-center gap-2 text-sm"

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

  const [mobileTab, setMobileTab] = useState<"invoices" | "purchases" | "drafts">("invoices");

  const [timeRange, setTimeRange] = useState<"all" | "month" | "30d" | "quarter">("all");

  const [isUploading, setIsUploading] = useState(false);

  const [uploadMeta, setUploadMeta] = useState<{

    fileName: string;

    fileSize: number;

    previewUrl?: string;

    isPdf: boolean;

    stage: ScanStage;

  } | null>(null);

  const uploadAbortRef = useRef<AbortController | null>(null);

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

    const sortedStored = [...stored].sort((a, b) => {
      const tA = new Date(a.updated_time || a.updated_at || a.created_at || 0).getTime();
      const tB = new Date(b.updated_time || b.updated_at || b.created_at || 0).getTime();
      return tB - tA;
    });

    const uiInvoices: InvoiceUI[] = sortedStored.map((r) => {
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

    setInvoices(uiInvoices);
    setPurchases(
      [...storedPurchases].sort((a, b) => {
        const tA = new Date(a.updated_time || a.updated_at || a.created_at || 0).getTime();
        const tB = new Date(b.updated_time || b.updated_at || b.created_at || 0).getTime();
        return tB - tA;
      })
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

        saveDraftFn: async (data) => {

          return await saveInvoiceDraft(data, "draft");

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

    const controller = new AbortController();

    uploadAbortRef.current = controller;

    const bgPreviewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;



    setUploadMeta({

      fileName: file.name,

      fileSize: file.size,

      previewUrl: bgPreviewUrl,

      isPdf: file.type === "application/pdf",

      stage: "ocr",

    });

    setIsUploading(true);



    try {

      const res = await uploadInvoice(file, { signal: controller.signal });

      const data = res.data;

      setUploadMeta((prev) => (prev ? { ...prev, stage: "verifying" } : prev));



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



      setUploadMeta((prev) => (prev ? { ...prev, stage: "finalizing" } : prev));

      // Duplicate Check

      const storedInvoices = await getAllInvoices();

      const dupCheck = checkDuplicateInvoice(data, storedInvoices);

      if (dupCheck.isDuplicate) {

        data.duplicate_warning = dupCheck.warningMessage;

        toast.error(dupCheck.warningMessage, {

          duration: 7000,

        });

      }



      // First work after scanning: always immediately save as draft
      const localId = await saveInvoiceDraft(data, "draft");
      await loadInvoices();

      setReviewInvoice({
        ...data,
        duplicate_warning: dupCheck.isDuplicate ? dupCheck.warningMessage : undefined,
        _local_id: localId,
      });

      if (!dupCheck.isDuplicate) {
        toast.success("Bill scanned and saved to drafts! Review and confirm.");
      }



      if (user && userProfile?.subscription?.active) {

        performCloudSync();

      }

    } catch (error: any) {



      if (isAbortError(error)) { toast("AI bill scan cancelled"); } else { console.error("Upload failed", error); toast.error(error.message || "Upload failed"); }

    } finally {

      if (bgPreviewUrl) URL.revokeObjectURL(bgPreviewUrl);

      uploadAbortRef.current = null;

      setUploadMeta(null);

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

      if (filterType !== "draft" && inv.status === "draft") return false;

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





  // Financial aggregates (calculated across current time range - drafts strictly excluded)
  const periodInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.status !== "draft" &&
        isDateInPeriod(inv.date || inv.raw?.invoice_date, timeRange)
    );
  }, [invoices, timeRange]);

  const periodPurchases = useMemo(() => {
    return purchases.filter(
      (p) =>
        p.status !== "draft" &&
        isDateInPeriod(p.date, timeRange)
    );
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
      (i) =>
        i.status !== "draft" &&
        (i.raw?.payment_status || i.raw?.paymentStatus || "Unpaid") !== "Paid"
    );
  }, [invoices]);

  const unpaidSales = unpaidSalesInvoices.reduce((s, i) => s + Number(i.amount), 0);

  const unpaidPurchasesList = useMemo(() => {
    return purchases.filter(
      (p) =>
        p.status !== "draft" &&
        (p.paymentStatus || "Unpaid") !== "Paid"
    );
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



  const totalStockValuation = useMemo(() => {

    return products.reduce((acc, p) => {

      if (p.isService) return acc;

      return acc + (Number(p.stock) || 0) * Number(p.purchasePrice || p.sellingPrice || 0);

    }, 0);

  }, [products]);



  const draftInvoices = useMemo(() => {

    return invoices.filter((inv) => inv.status === "draft");

  }, [invoices]);



  const draftPurchases = useMemo(() => {

    return purchases.filter((p) => p.status === "draft");

  }, [purchases]);



  const totalDraftsCount = draftInvoices.length + draftPurchases.length;



  const filteredDrafts = useMemo(() => {

    return draftInvoices.filter((inv) => {

      if (!isDateInPeriod(inv.date || inv.raw?.invoice_date, timeRange)) return false;

      if (searchQuery.trim()) {

        const q = searchQuery.toLowerCase();

        const matchName = inv.name.toLowerCase().includes(q);

        const matchBuyerGstin = (inv.raw?.buyer_gstin || "").toLowerCase().includes(q);

        const matchTradeName = (inv.raw?.buyer_gstin_info?.trade_name || extractCustomerName(inv.raw)).toLowerCase().includes(q);

        if (!matchName && !matchBuyerGstin && !matchTradeName) return false;

      }

      return true;

    });

  }, [draftInvoices, searchQuery, timeRange]);



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

  // Top Customers by Revenue for Visual Dashboard
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; gstin?: string; total: number; count: number }>();
    periodInvoices.forEach((inv) => {
      const name = extractCustomerName(inv.raw) || inv.name || "Walk-in Customer";
      const gstin = inv.raw?.buyer_gstin;
      const amt = Number(inv.amount) || 0;
      const cur = map.get(name) || { name, gstin, total: 0, count: 0 };
      cur.total += amt;
      cur.count += 1;
      map.set(name, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [periodInvoices]);

  const maxCustomerRevenue = useMemo(() => {
    return topCustomers[0]?.total || 1;
  }, [topCustomers]);

  // Top Products & Stock Radar for Visual Dashboard
  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    periodInvoices.forEach((inv) => {
      const items = inv.raw?.items || [];
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const name = item.description || item.name || "General Product";
          const qty = Number(item.quantity) || 1;
          const amt = Number(item.amount) || (Number(item.rate) * qty) || 0;
          const cur = map.get(name) || { name, quantity: 0, revenue: 0 };
          cur.quantity += qty;
          cur.revenue += amt;
          map.set(name, cur);
        });
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [periodInvoices]);

  const maxProductRevenue = useMemo(() => {
    return topSellingProducts[0]?.revenue || 1;
  }, [topSellingProducts]);

  // Streamlined Recent Transactions Activity Stream
  const recentTransactions = useMemo(() => {
    const sales = periodInvoices.map((inv) => ({
      id: inv.id,
      type: "sale" as const,
      partyName: extractCustomerName(inv.raw) || inv.name,
      partyGstin: inv.raw?.buyer_gstin,
      docNumber: inv.name,
      date: inv.date || inv.raw?.invoice_date || "",
      amount: Number(inv.amount) || 0,
      paymentStatus: (inv.raw?.payment_status || inv.raw?.paymentStatus || "Unpaid") as string,
      raw: inv.raw,
      createdAt: inv.raw?.created_at || 0,
    }));

    const purcs = periodPurchases.map((p) => ({
      id: p.id,
      type: "purchase" as const,
      partyName: p.supplierName,
      partyGstin: p.supplierGstin,
      docNumber: p.invoiceNumber || p.id.slice(0, 8),
      date: p.date,
      amount: Number(p.total) || 0,
      paymentStatus: p.paymentStatus || "Unpaid",
      raw: p,
      createdAt: p.created_at || 0,
    }));

    return [...sales, ...purcs]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 5);
  }, [periodInvoices, periodPurchases]);



  const grossProfit = totalAmount - totalPurchases;

  const profitMargin = totalAmount > 0 ? ((grossProfit / totalAmount) * 100).toFixed(1) : "0.0";

  const itcCoverage = totalTax > 0 ? Math.min(100, Math.round((totalITC / totalTax) * 100)) : 100;



  return (

    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 transition-colors">

      <Header />



      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28">

        {/* Top Bar: Vyapar Business Profile & Interactive Period Selector */}

        <div className="bg-white dark:bg-[#161513] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 mb-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">

          <div className="flex items-center gap-3.5">

            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-base shadow-xs shrink-0">

              {(userProfile?.business_name || userProfile?.trade_name || "GST")[0]?.toUpperCase() || "G"}

            </div>

            <div>

              <div className="flex items-center gap-2 flex-wrap">

                <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">

                  {userProfile?.business_name || userProfile?.trade_name || "My Business"}

                </h1>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-black/[0.06] dark:border-white/[0.06]">

                  FY 2026-27

                </span>

                {userProfile?.primary_gstin && (

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 flex items-center gap-1.5 font-medium">

                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />

                    GSTIN: {userProfile.primary_gstin}

                  </span>

                )}

              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">

                Vyapar Smart Dashboard &bull; Sales, Purchases &amp; Cash Flow

              </p>

            </div>

          </div>



          {/* Interactive Period Selector Tabs (All Time, This Month, Last 30 Days, This Quarter) */}

          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl text-xs font-medium self-stretch md:self-auto overflow-x-auto">

            {[

              { id: "all", label: "All Time" },

              { id: "month", label: "This Month" },

              { id: "30d", label: "Last 30 Days" },

              { id: "quarter", label: "This Quarter" },

            ].map((tab) => (

              <button

                key={tab.id}

                type="button"

                onClick={() => {

                  setTimeRange(tab.id as any);

                  setCurrentPage(1);

                }}

                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-xs ${

                  timeRange === tab.id

                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs font-semibold"

                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"

                }`}

              >

                {tab.label}

              </button>

            ))}

          </div>

        </div>



        {/* Vyapar Fast Action Dock */}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">

          {/* + Add Sale */}

          <Link

            href="/invoices/new"

            className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-xs hover:shadow-sm transition active:scale-98 group cursor-pointer"

          >

            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">

              <Plus className="w-4 h-4 text-white" />

            </div>

            <div className="min-w-0">

              <div className="text-xs font-bold leading-tight truncate">+ Add Sale</div>

              <div className="text-[10px] text-emerald-100/80 truncate">New Invoice</div>

            </div>

          </Link>



          {/* + Add Purchase */}

          <Link

            href="/purchases"

            className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-xs hover:shadow-sm transition active:scale-98 group cursor-pointer"

          >

            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">

              <ShoppingCart className="w-4 h-4 text-white" />

            </div>

            <div className="min-w-0">

              <div className="text-xs font-bold leading-tight truncate">+ Add Purchase</div>

              <div className="text-[10px] text-purple-100/80 truncate">Vendor Bill</div>

            </div>

          </Link>



          {/* Scan Bill OCR */}

          <button

            type="button"

            onClick={() => uploadRef.current?.click()}

            className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-xs hover:shadow-sm transition active:scale-98 group text-left cursor-pointer"

          >

            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">

              <Camera className="w-4 h-4 text-white" />

            </div>

            <div className="min-w-0">

              <div className="text-xs font-bold leading-tight truncate">Scan Bill</div>

              <div className="text-[10px] text-blue-100/80 truncate">AI Instant OCR</div>

            </div>

          </button>



          {/* Add Party */}

          <Link

            href="/clients"

            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#161513] border border-black/[0.08] dark:border-white/[0.08] hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/30 dark:hover:bg-amber-950/20 text-stone-800 dark:text-stone-200 shadow-xs hover:shadow-sm transition active:scale-98 group cursor-pointer"

          >

            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">

              <Users className="w-4 h-4" />

            </div>

            <div className="min-w-0">

              <div className="text-xs font-bold leading-tight truncate">Add Party</div>

              <div className="text-[10px] text-stone-400 truncate">Customer / Vendor</div>

            </div>

          </Link>



          {/* Items & Stock */}

          <Link

            href="/inventory"

            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#161513] border border-black/[0.08] dark:border-white/[0.08] hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 text-stone-800 dark:text-stone-200 shadow-xs hover:shadow-sm transition active:scale-98 group cursor-pointer"

          >

            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">

              <Package className="w-4 h-4" />

            </div>

            <div className="min-w-0">

              <div className="text-xs font-bold leading-tight truncate">Items &amp; Stock</div>

              <div className="text-[10px] text-stone-400 truncate">{products.length} Products</div>

            </div>

          </Link>



          {/* Batch Scan & More */}

          <button

            type="button"

            onClick={() => setShowBatchModal(true)}

            className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#161513] border border-black/[0.08] dark:border-white/[0.08] hover:border-rose-400 dark:hover:border-rose-600 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 text-stone-800 dark:text-stone-200 shadow-xs hover:shadow-sm transition active:scale-98 group text-left cursor-pointer"

          >

            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">

              <Layers className="w-4 h-4" />

            </div>

            <div className="min-w-0">

              <div className="text-xs font-bold leading-tight truncate">Batch Scan</div>

              <div className="text-[10px] text-stone-400 truncate">Up to 3 at once</div>

            </div>

          </button>

        </div>



        {/* 4 Vyapar Pillar Metric Cards */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">

          {/* Card 1: YOU'LL GET (Receivables) */}

          <div

            onClick={() => {

              setMobileTab("invoices");

              setFilterType("unpaid");

            }}

            className="bg-white dark:bg-[#161513] border-2 border-emerald-500/20 hover:border-emerald-500 dark:border-emerald-500/30 dark:hover:border-emerald-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group"

          >

            <div className="flex items-center justify-between mb-2">

              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">

                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />

                You&apos;ll Get

              </span>

              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">

                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />

              </div>

            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">

              {formatINR(unpaidSales)}

            </div>

            <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">

              <span>{unpaidSalesInvoices.length} unpaid sale bills</span>

              <span className="text-emerald-700 dark:text-emerald-400 font-semibold group-hover:underline">Filter &rarr;</span>

            </div>

          </div>



          {/* Card 2: YOU'LL GIVE (Payables) */}

          <div

            onClick={() => {

              setMobileTab("purchases");

              setFilterType("unpaid");

            }}

            className="bg-white dark:bg-[#161513] border-2 border-rose-500/20 hover:border-rose-500 dark:border-rose-500/30 dark:hover:border-rose-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group"

          >

            <div className="flex items-center justify-between mb-2">

              <span className="text-[11px] font-bold tracking-wider uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1.5">

                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />

                You&apos;ll Give

              </span>

              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">

                <ArrowDownRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />

              </div>

            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-700 dark:text-rose-400 tabular-nums">

              {formatINR(unpaidPurchases)}

            </div>

            <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">

              <span>{unpaidPurchasesList.length} vendor bills due</span>

              <span className="text-rose-700 dark:text-rose-400 font-semibold group-hover:underline">View &rarr;</span>

            </div>

          </div>



          {/* Card 3: TOTAL SALES */}

          <div

            onClick={() => {

              setMobileTab("invoices");

              setFilterType("all");

            }}

            className="bg-white dark:bg-[#161513] border-2 border-blue-500/20 hover:border-blue-500 dark:border-blue-500/30 dark:hover:border-blue-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group"

          >

            <div className="flex items-center justify-between mb-2">

              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1.5">

                <TrendingUp className="w-3.5 h-3.5" />

                Total Sales

              </span>

              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">

                <FileText className="w-4 h-4" />

              </div>

            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 dark:text-stone-100 tabular-nums">

              {formatINR(totalAmount)}

            </div>

            <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">

              <span>{periodInvoices.length} invoices &bull; Tax {formatINR(totalTax)}</span>

              <span className="text-blue-700 dark:text-blue-400 font-semibold group-hover:underline">All &rarr;</span>

            </div>

          </div>



          {/* Card 4: STOCK VALUATION */}

          <Link

            href="/inventory"

            className="bg-white dark:bg-[#161513] border-2 border-purple-500/20 hover:border-purple-500 dark:border-purple-500/30 dark:hover:border-purple-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all cursor-pointer group block"

          >

            <div className="flex items-center justify-between mb-2">

              <span className="text-[11px] font-bold tracking-wider uppercase text-purple-700 dark:text-purple-400 flex items-center gap-1.5">

                <Package className="w-3.5 h-3.5" />

                Stock Value

              </span>

              <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">

                <BarChart3 className="w-4 h-4" />

              </div>

            </div>

            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900 dark:text-stone-100 tabular-nums">

              {formatINR(totalStockValuation)}

            </div>

            <div className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">

              <span>{products.length} products in catalog</span>

              {lowStockProducts.length > 0 ? (

                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">

                  {lowStockProducts.length} low stock

                </span>

              ) : (

                <span className="text-purple-700 dark:text-purple-400 font-semibold group-hover:underline">Manage &rarr;</span>

              )}

            </div>

          </Link>

        </div>



        {/* Vyapar Cash Flow & Operating Margin Tracker */}

        <div className="bg-white dark:bg-[#161513] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 mb-5 shadow-xs transition-colors">

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-100 dark:border-stone-800">

            <div className="flex items-center gap-2">

              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">

                <BarChart3 className="w-4 h-4" />

              </div>

              <div>

                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">

                  Cash Flow &amp; Operating Margin

                </h3>

                <p className="text-[11px] text-stone-500 dark:text-stone-400">

                  Sales vs Purchases comparison over 6 months

                </p>

              </div>

            </div>



            {/* Margin Badge */}

            <div className="flex items-center gap-2">

              <span className="text-xs text-stone-500 dark:text-stone-400">Operating Margin:</span>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono ${

                grossProfit >= 0

                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"

                  : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"

              }`}>

                {grossProfit >= 0 ? "+" : ""}{profitMargin}% ({formatINR(grossProfit)})

              </span>

            </div>

          </div>



          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">

            {/* Left 4 Cols: Inflow / Outflow KPI Cards */}

            <div className="lg:col-span-4 space-y-2.5">

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <div className="w-3 h-3 rounded-full bg-emerald-500" />

                  <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Sales Inflow</span>

                </div>

                <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">

                  {formatINR(totalAmount)}

                </span>

              </div>



              <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <div className="w-3 h-3 rounded-full bg-purple-500" />

                  <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Purchase Outflow</span>

                </div>

                <span className="text-sm font-bold font-mono text-purple-700 dark:text-purple-400">

                  {formatINR(totalPurchases)}

                </span>

              </div>



              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between">

                <span className="text-xs font-medium text-stone-700 dark:text-stone-300">Net Gross Margin</span>

                <span className={`text-sm font-bold font-mono ${grossProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>

                  {formatINR(grossProfit)}

                </span>

              </div>

            </div>



            {/* Right 8 Cols: 6-Month Dual-Bar Chart */}

            <div className="lg:col-span-8">

              <div className="flex items-end justify-between gap-2 h-36 pt-4 pb-1 border-b border-stone-100 dark:border-stone-800">

                {monthlyCashFlow.map((m) => {

                  const salesHeight = Math.max(m.sales > 0 ? 8 : 3, Math.round((m.sales / maxMonthlyVal) * 110));

                  const purchaseHeight = Math.max(m.purchases > 0 ? 8 : 3, Math.round((m.purchases / maxMonthlyVal) * 110));

                  return (

                    <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group relative">

                      {/* Tooltip on Hover */}

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 pointer-events-none z-10 bg-stone-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg">

                        <div>Sales: {formatINR(m.sales)}</div>

                        <div>Purchases: {formatINR(m.purchases)}</div>

                      </div>



                      {/* Dual Bars */}

                      <div className="w-full flex items-end justify-center gap-1">

                        <div

                          style={{ height: `${salesHeight}px` }}

                          className="w-3 sm:w-4 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all"

                          title={`Sales: ${formatINR(m.sales)}`}

                        />

                        <div

                          style={{ height: `${purchaseHeight}px` }}

                          className="w-3 sm:w-4 bg-purple-500 hover:bg-purple-600 rounded-t-sm transition-all"

                          title={`Purchases: ${formatINR(m.purchases)}`}

                        />

                      </div>



                      {/* Month Label */}

                      <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400 mt-2 block truncate">

                        {m.label}

                      </span>

                    </div>

                  );

                })}

              </div>



              {/* Chart Legend */}

              <div className="flex items-center justify-end gap-4 mt-2.5 text-[11px] text-stone-500 dark:text-stone-400">

                <div className="flex items-center gap-1.5">

                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />

                  <span>Sales (Inflow)</span>

                </div>

                <div className="flex items-center gap-1.5">

                  <span className="w-2.5 h-2.5 rounded-xs bg-purple-500" />

                  <span>Purchases (Outflow)</span>

                </div>

              </div>

            </div>

          </div>

        </div>



        {/* Zero-CA Self-Filer Compliance Hub */}

        <div className="mb-5">

          <TaxHealthWidget

            outwardTax={totalTax}

            inwardTax={totalITC}

            totalInvoicesCount={periodInvoices.length}

            totalPurchasesCount={periodPurchases.length}

            unmatchedPurchasesCount={periodPurchases.filter((p) => p.itcEligibility === "ineligible").length}

          />

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



        {/* Dedicated Draft Bills Section (Pending Confirmation) - Desktop */}

        {totalDraftsCount > 0 && (

          <div className="hidden md:block bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 mb-5 shadow-xs transition-colors">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-3.5 border-b border-amber-200/80 dark:border-amber-900/60">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-300/60 dark:border-amber-700/60 shadow-xs">

                  <Clock className="w-5 h-5" />

                </div>

                <div>

                  <div className="flex items-center gap-2 flex-wrap">

                    <h3 className="text-sm font-bold text-amber-950 dark:text-amber-100">

                      Draft Bills Pending Confirmation

                    </h3>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-700">

                      {totalDraftsCount} {totalDraftsCount === 1 ? "draft bill" : "draft bills"}

                    </span>

                  </div>

                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">

                    These bills are saved locally and excluded from sales turnover, tax liability, and GSTR filing until confirmed.

                  </p>

                </div>

              </div>



              <div className="flex items-center gap-2 self-end sm:self-auto">

                <button

                  type="button"

                  onClick={() => {

                    setMobileTab("drafts");

                    const el = document.getElementById("tour-invoice-list");

                    el?.scrollIntoView({ behavior: "smooth" });

                  }}

                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs active:scale-98 transition cursor-pointer flex items-center gap-1.5"

                >

                  <span>View in Ledger</span>

                  <ArrowRight className="w-3.5 h-3.5" />

                </button>

              </div>

            </div>



            {/* Drafts Cards Grid */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

              {draftInvoices.map((inv) => (

                <div

                  key={inv.id}

                  className="bg-white dark:bg-[#161513] border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 flex flex-col justify-between hover:border-amber-400 dark:hover:border-amber-600 transition shadow-2xs group"

                >

                  <div>

                    <div className="flex items-center justify-between mb-2">

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">

                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />

                        Draft Sale

                      </span>

                      <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500">

                        {inv.date || "No date"}

                      </span>

                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">

                      {extractCustomerName(inv.raw) || inv.name}

                    </h4>

                    <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5 truncate">

                      Invoice #{inv.name}

                    </div>

                  </div>



                  <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">

                    <div>

                      <span className="text-[10px] text-stone-400 block">Total Amount</span>

                      <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">

                        {formatINR(inv.amount)}

                      </span>

                    </div>

                    <div className="flex items-center gap-1.5">

                      <button

                        type="button"

                        onClick={() => setReviewInvoice(inv.raw)}

                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1"

                      >

                        <Edit3 className="w-3 h-3" />

                        <span>Confirm</span>

                      </button>

                      <button

                        type="button"

                        onClick={async () => {

                          if (confirm("Delete this draft invoice?")) {

                            await deleteInvoice(inv.id);

                            await loadInvoices();

                          }

                        }}

                        className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"

                        title="Discard draft"

                      >

                        <X className="w-3.5 h-3.5" />

                      </button>

                    </div>

                  </div>

                </div>

              ))}



              {draftPurchases.map((p) => (

                <div

                  key={p.id}

                  className="bg-white dark:bg-[#161513] border border-purple-200 dark:border-purple-900/50 rounded-xl p-3.5 flex flex-col justify-between hover:border-purple-400 dark:hover:border-purple-600 transition shadow-2xs group"

                >

                  <div>

                    <div className="flex items-center justify-between mb-2">

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">

                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />

                        Draft Purchase

                      </span>

                      <span className="text-[11px] font-mono text-stone-400 dark:text-stone-500">

                        {p.date || "No date"}

                      </span>

                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">

                      {p.supplierName || "Vendor Bill"}

                    </h4>

                    <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5 truncate">

                      Bill #{p.invoiceNumber || p.id.slice(0, 8)}

                    </div>

                  </div>



                  <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">

                    <div>

                      <span className="text-[10px] text-stone-400 block">Total Amount</span>

                      <span className="text-sm font-bold font-mono text-purple-700 dark:text-purple-400">

                        {formatINR(p.total || 0)}

                      </span>

                    </div>

                    <div className="flex items-center gap-1.5">

                      <Link

                        href="/purchases"

                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition active:scale-95 flex items-center gap-1"

                      >

                        <Edit3 className="w-3 h-3" />

                        <span>Confirm</span>

                      </Link>

                      <button

                        type="button"

                        onClick={async () => {

                          if (confirm("Delete this draft purchase bill?")) {

                            await deletePurchase(p.id);

                            await loadInvoices();

                          }

                        }}

                        className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"

                        title="Discard draft"

                      >

                        <X className="w-3.5 h-3.5" />

                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </div>

        )}



        {/* ============================================================== */}
        {/* DESKTOP VIEW (Approved Blueprint: Visual Intelligence & Recent Activity) */}
        {/* ============================================================== */}
        <div id="tour-invoice-list" className="hidden md:block space-y-5">
          {/* 2-Column Visual Intelligence Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 5 Revenue Customers Card */}
            <div className="bg-white dark:bg-[#161513] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                      Top Customers by Revenue
                    </h3>
                    <p className="text-[10px] text-stone-400">
                      Key revenue contributors ({periodInvoices.length} sales)
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  Share of Sales
                </span>
              </div>

              {topCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  No sales recorded in this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {topCustomers.map((cust, idx) => {
                    const pct = Math.round((cust.total / maxCustomerRevenue) * 100);
                    return (
                      <div key={cust.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-4 text-[10px] font-mono font-bold text-stone-400 shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                              {cust.name}
                            </span>
                            {cust.gstin && (
                              <span className="text-[10px] font-mono text-stone-400 hidden xl:inline shrink-0">
                                • {cust.gstin}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              {formatINR(cust.total)}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-1.5">
                              ({cust.count} {cust.count === 1 ? "bill" : "bills"})
                            </span>
                          </div>
                        </div>
                        {/* Proportional bar */}
                        <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top 5 Best-Selling Products & Stock Radar */}
            <div className="bg-white dark:bg-[#161513] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                      Top Products & Stock Radar
                    </h3>
                    <p className="text-[10px] text-stone-400">
                      Fastest moving items & inventory status
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  Units & Revenue
                </span>
              </div>

              {topSellingProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  No product sales recorded in this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {topSellingProducts.map((prod, idx) => {
                    const matchedProd = products.find(
                      (p) => p.name.toLowerCase() === prod.name.toLowerCase()
                    );
                    const stock = matchedProd?.stock;
                    const isLowStock =
                      stock !== undefined && stock <= (matchedProd?.minStockAlert ?? 5);
                    const pct = Math.round((prod.revenue / maxProductRevenue) * 100);

                    return (
                      <div key={prod.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-4 text-[10px] font-mono font-bold text-stone-400 shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                              {prod.name}
                            </span>
                            {stock !== undefined && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                                  isLowStock
                                    ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                                }`}
                              >
                                {stock} left
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                              {formatINR(prod.revenue)}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-1.5">
                              ({prod.quantity} sold)
                            </span>
                          </div>
                        </div>
                        {/* Proportional bar */}
                        <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full rounded-full bg-purple-500 transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Receivables Aging Radar */}
          <div className="bg-white dark:bg-[#161513] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Payment Aging Radar (Money You'll Get)</span>
                </h3>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Total outstanding receivables:{" "}
                  <strong className="text-stone-900 dark:text-stone-100 font-mono">
                    {formatINR(aging.totalReceivables)}
                  </strong>
                </p>
              </div>

              {overdueInvoices.length > 0 && (
                <button
                  type="button"
                  onClick={() => sendOverdueReminder(overdueInvoices[0])}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Nudge Overdue ({overdueInvoices.length})</span>
                </button>
              )}
            </div>

            {/* Aging 3 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20">
                <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 block">
                  Current (0–30 Days)
                </span>
                <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 tabular-nums">
                  {formatINR(aging.current_0_30)}
                </div>
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-500 block">
                  {aging.count_0_30} invoices on schedule
                </span>
              </div>

              <div className="p-3 rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 block">
                  Due Soon (31–60 Days)
                </span>
                <div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-300 mt-0.5 tabular-nums">
                  {formatINR(aging.overdue_31_60)}
                </div>
                <span className="text-[10px] text-amber-600/80 dark:text-amber-500 block">
                  {aging.count_31_60} invoices pending follow-up
                </span>
              </div>

              <div className="p-3 rounded-lg border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
                <span className="text-[10px] font-semibold text-rose-800 dark:text-rose-400 block">
                  Critical Overdue (60+ Days)
                </span>
                <div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300 mt-0.5 tabular-nums">
                  {formatINR(aging.overdue_60_plus)}
                </div>
                <span className="text-[10px] text-rose-600/80 dark:text-rose-500 block">
                  {aging.count_60_plus} invoices require immediate action
                </span>
              </div>
            </div>
          </div>

          {/* Streamlined Recent Activity Ledger */}
          <div className="bg-white dark:bg-[#161513] rounded-xl border border-black/[0.08] dark:border-white/[0.08] p-4 sm:p-5 shadow-xs transition-colors space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  Recent Activity Stream
                </h3>
                <p className="text-[10px] text-stone-400">
                  Latest recorded business transactions
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Link
                  href="/invoices"
                  className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>All Sales ({periodInvoices.length})</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-stone-300 dark:text-stone-700">|</span>
                <Link
                  href="/purchases"
                  className="text-purple-700 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1"
                >
                  <span>All Purchases ({periodPurchases.length})</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                No recent transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800/60">
                {recentTransactions.map((tx) => (
                  <div
                    key={`${tx.type}-${tx.id}`}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-stone-50/50 dark:hover:bg-stone-800/20 px-2 rounded-lg transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          tx.type === "sale"
                            ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50"
                            : "bg-purple-50 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50"
                        }`}
                      >
                        {tx.type === "sale" ? "Sale" : "Purchase"}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                          {tx.partyName}
                        </span>
                        <div className="text-[11px] text-stone-400 font-mono">
                          #{tx.docNumber} • {tx.date}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-bold text-stone-900 dark:text-stone-100 tabular-nums block">
                          {formatINR(tx.amount)}
                        </span>
                        <span
                          className={`text-[9px] font-bold ${
                            tx.paymentStatus === "Paid"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {tx.paymentStatus}
                        </span>
                      </div>

                      {tx.type === "sale" ? (
                        <button
                          type="button"
                          onClick={() => setReviewInvoice(tx.raw)}
                          className="px-2.5 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-md hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium transition cursor-pointer"
                        >
                          View
                        </button>
                      ) : (
                        <Link
                          href="/purchases"
                          className="px-2.5 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded-md hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium transition"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* MOBILE VIEW (Scanning, Drafts & Saved Invoices Command Hub) */}
        {/* ============================================================== */}
        <div className="block md:hidden space-y-4">
          {/* Hero Mobile Scan CTA */}
          <div className="bg-emerald-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Scan Bill or Invoice
                </h3>
                <p className="text-[11px] text-emerald-100">
                  Instant AI OCR • Saved directly to drafts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => captureRef.current?.click()}
                className="px-3.5 py-2 bg-white text-emerald-800 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer shrink-0"
              >
                Scan Now
              </button>
            </div>
          </div>

          {/* Mobile Segmented Switcher */}
          <div className="bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl flex items-center text-xs">
            <button
              type="button"
              onClick={() => setMobileTab("drafts")}
              className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === "drafts"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Drafts ({totalDraftsCount})</span>
              {totalDraftsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileTab("invoices")}
              className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === "invoices"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Saved Sales ({periodInvoices.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab("purchases")}
              className={`flex-1 py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mobileTab === "purchases"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Saved Bills ({periodPurchases.length})</span>
            </button>
          </div>

          {/* Mobile Tab Content */}
          {mobileTab === "drafts" && (
            <div className="space-y-3">
              {totalDraftsCount === 0 ? (
                <div className="bg-white dark:bg-[#161513] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    No Pending Drafts
                  </h4>
                  <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                    All scanned bills have been confirmed. Tap "Scan Now" above to snap your next paper bill.
                  </p>
                </div>
              ) : (
                <>
                  {draftInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white dark:bg-[#161513] border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                            Draft Sale
                          </span>
                          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-1">
                            {extractCustomerName(inv.raw) || inv.name}
                          </h4>
                          <span className="text-[10px] text-stone-400 font-mono">
                            #{inv.name} • {inv.date}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400 tabular-nums block">
                            {formatINR(inv.amount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                        <button
                          type="button"
                          onClick={() => setReviewInvoice(inv.raw)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Review & Confirm</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Discard this draft?")) {
                              await deleteInvoice(inv.id);
                              await loadInvoices();
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {draftPurchases.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white dark:bg-[#161513] border border-purple-200 dark:border-purple-900/50 rounded-xl p-3.5 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                            Draft Purchase
                          </span>
                          <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 mt-1">
                            {p.supplierName || "Vendor Bill"}
                          </h4>
                          <span className="text-[10px] text-stone-400 font-mono">
                            Bill #{p.invoiceNumber || p.id.slice(0, 8)} • {p.date}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-purple-700 dark:text-purple-400 tabular-nums block">
                            {formatINR(p.total || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                        <Link
                          href="/purchases"
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Review & Confirm</span>
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Discard this draft purchase?")) {
                              await deletePurchase(p.id);
                              await loadInvoices();
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {mobileTab === "invoices" && (
            <div className="space-y-2.5">
              {periodInvoices.slice(0, 8).map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white dark:bg-[#161513] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate block">
                      {extractCustomerName(inv.raw) || inv.name}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">
                      #{inv.name} • {inv.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums block">
                        {formatINR(inv.amount)}
                      </span>
                      <span
                        className={`text-[9px] font-bold ${
                          (inv.raw?.payment_status || inv.raw?.paymentStatus) === "Paid"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {inv.raw?.payment_status || inv.raw?.paymentStatus || "Unpaid"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => sendOverdueReminder(inv)}
                      className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200/50 cursor-pointer"
                      title="Share on WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setReviewInvoice(inv.raw)}
                      className="px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md text-[11px] font-medium cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}

              <Link
                href="/invoices"
                className="block text-center py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
              >
                View all {periodInvoices.length} sales invoices →
              </Link>
            </div>
          )}

          {mobileTab === "purchases" && (
            <div className="space-y-2.5">
              {periodPurchases.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-[#161513] border border-black/[0.08] dark:border-white/[0.08] rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate block">
                      {p.supplierName}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">
                      #{p.invoiceNumber || p.id.slice(0, 8)} • {p.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums block">
                        {formatINR(p.total)}
                      </span>
                      <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400">
                        {p.itcEligibility}
                      </span>
                    </div>

                    <Link
                      href="/purchases"
                      className="px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md text-[11px] font-medium"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}

              <Link
                href="/purchases"
                className="block text-center py-2 text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline pt-1"
              >
                View all {periodPurchases.length} purchase bills →
              </Link>
            </div>
          )}
        </div>
        
        </main>



      {/* Desktop Floating Quick Button */}
      <button
        onClick={() => setShowUploadSheet(true)}
        className="hidden md:flex fixed bottom-8 right-8 w-13 h-13 bg-[#047857] hover:bg-[#065f46] text-white rounded-full shadow-lg items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
        title="Upload or scan bill"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Upload Sheet Modal */}
      {showUploadSheet && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-xs"
            onClick={() => setShowUploadSheet(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-4">
            <div className="bg-white dark:bg-[#161513] text-stone-900 dark:text-stone-100 rounded-t-3xl md:rounded-2xl p-6 pb-8 w-full md:max-w-md shadow-2xl border-t md:border border-stone-200/80 dark:border-white/[0.08] animate-slide-up">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-200/70 dark:border-white/[0.06]">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Upload or snap invoice</h3>
                <button
                  onClick={() => setShowUploadSheet(false)}
                  className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="w-full py-3 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-98 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" /> Choose invoices (single or batch)
                </button>

                <button
                  onClick={() => captureRef.current?.click()}
                  className="w-full py-3 bg-stone-50 dark:bg-[#1a1a1c] border border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-98 transition cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-[#047857] dark:text-emerald-400" /> Take camera photo
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

    indigo: "bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",

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

        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-[#047857] dark:text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">

          {icon}

        </div>

        <div className="min-w-0">

          <h4 className="font-medium text-stone-900 dark:text-stone-100 text-xs sm:text-sm truncate">{title}</h4>

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

          className="w-full sm:w-auto px-5 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl font-semibold text-xs shadow-xs active:scale-98 transition flex items-center justify-center gap-2"

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

      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors text-left flex items-center justify-between gap-3 cursor-pointer"

    >

      <div className="flex items-center gap-3 flex-1 min-w-0">

        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono border border-emerald-200/60 dark:border-emerald-800/40">

          {initials}

        </div>



        <div className="flex-1 min-w-0">

          <div className="flex items-center gap-1.5 flex-wrap">

            <p className="font-medium text-stone-900 dark:text-stone-100 text-xs sm:text-sm truncate">

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

          <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums font-mono">

            + {formatINR(invoice.amount)}

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

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-[#047857] dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />

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

      className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors text-left flex items-center justify-between gap-3 cursor-pointer"

    >

      <div className="flex items-center gap-3 flex-1 min-w-0">

        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-200/60 dark:border-purple-800/40">

          <ShoppingCart className="w-4 h-4" />

        </div>



        <div className="flex-1 min-w-0">

          <div className="flex items-center gap-1.5 flex-wrap">

            <p className="font-medium text-stone-900 dark:text-stone-100 text-xs sm:text-sm truncate">

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

        <p className="text-xs sm:text-sm font-bold text-purple-700 dark:text-purple-400 tabular-nums font-mono">

          - {formatINR(purchase.total || 0)}

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

