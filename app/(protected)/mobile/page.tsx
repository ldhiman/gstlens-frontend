"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Plus,
  FileText,
  ShoppingCart,
  TrendingUp,
  ShieldCheck,
  Search,
  Sparkles,
  Receipt,
  X,
  ChevronRight,
  Upload,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Trash2,
  Share2,
  Clock,
  Eye,
  AlertCircle,
  FileCheck,
  Building2,
  User,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getAllInvoices,
  getAllPurchases,
  getBusinessProfile,
  savePurchase,
  saveInvoiceDraft,
  updateInvoice,
  deleteInvoice,
  deletePurchase,
  PurchaseBill,
  BusinessProfile,
  StoredInvoice,
} from "@/lib/storage";
import { formatINR } from "@/lib/currency";
import {
  extractInvoiceTotal,
  extractInvoiceTaxable,
  extractInvoiceTax,
  extractCustomerName,
  getStateCodeFromGSTIN,
  getLocalToday,
} from "@/lib/gstBillingEngine";
import { uploadInvoice } from "@/lib/api";
import { openWhatsAppInvoice } from "@/lib/whatsapp";
import UploadingModal from "@/components/UploadingModal";
import { isAbortError, type ScanStage } from "@/lib/scanProgress";
import toast from "react-hot-toast";

type InvoiceUI = {
  id: string;
  name: string;
  date: string;
  amount: string;
  taxable: string;
  gst: string;
  status: string;
  synced_to_cloud?: 0 | 1 | boolean;
  raw?: any;
};

/* ---------------- Image Compression Helper for Mobile ---------------- */
async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 1024 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      let width = img.width;
      let height = img.height;
      const maxDim = 2400;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
  });
}

export default function MobileDashboardPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceUI[]>([]);
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [activeTab, setActiveTab] = useState<"drafts" | "sales" | "purchases">("drafts");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanType, setScanType] = useState<"purchase" | "sale">("purchase");

  // Scanner states
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadMeta, setUploadMeta] = useState<{
    fileName: string;
    fileSize: number;
    previewUrl?: string;
    isPdf: boolean;
    stage: ScanStage;
  } | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  // Hidden camera & file inputs
  const uploadRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);

  // Draft review modal state
  const [reviewingDraft, setReviewingDraft] = useState<{
    type: "purchase" | "sale";
    item: any;
  } | null>(null);

  // Auto-redirect to Desktop Dashboard if screen width >= 768px
  useEffect(() => {
    function handleResize() {
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        router.replace("/dashboard");
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [router]);

  // Load business profile and stored documents
  useEffect(() => {
    getBusinessProfile().then(setProfile).catch(() => {});
    loadData();
  }, []);

  async function loadData() {
    try {
      const [stored, purList] = await Promise.all([
        getAllInvoices(),
        getAllPurchases().catch(() => []),
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
        [...purList].sort((a, b) => {
          const tA = new Date(a.updated_time || a.updated_at || a.created_at || 0).getTime();
          const tB = new Date(b.updated_time || b.updated_at || b.created_at || 0).getTime();
          return tB - tA;
        })
      );
    } catch (err) {
      console.error("Failed to load mobile data:", err);
    }
  }

  // Split into confirmed and drafts
  const draftSales = useMemo(() => invoices.filter((i) => i.status === "draft"), [invoices]);
  const confirmedSales = useMemo(() => invoices.filter((i) => i.status !== "draft"), [invoices]);
  const draftPurchases = useMemo(() => purchases.filter((p) => p.status === "draft"), [purchases]);
  const confirmedPurchases = useMemo(() => purchases.filter((p) => p.status !== "draft"), [purchases]);
  const totalDraftsCount = draftSales.length + draftPurchases.length;

  // Unified list of all drafts sorted by date/time
  const allDrafts = useMemo(() => {
    const list: Array<
      | { type: "sale"; data: InvoiceUI }
      | { type: "purchase"; data: PurchaseBill }
    > = [
      ...draftSales.map((s) => ({ type: "sale" as const, data: s })),
      ...draftPurchases.map((p) => ({ type: "purchase" as const, data: p })),
    ];
    return list;
  }, [draftSales, draftPurchases]);

  // Financial calculations (confirmed only for clean books)
  const totalSales = confirmedSales.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalTax = confirmedSales.reduce((s, i) => s + (Number(i.gst) || 0), 0);
  const totalPurchases = confirmedPurchases.reduce((s, p) => s + (Number(p.total) || 0), 0);
  const totalITC = confirmedPurchases.reduce(
    (s, p) =>
      s +
      ((Number(p.cgst) || 0) +
        (Number(p.sgst) || 0) +
        (Number(p.igst) || 0) +
        (Number(p.cess) || 0)),
    0
  );
  const netGstPayable = Math.max(0, totalTax - totalITC);

  const isUnlimited = Boolean(
    userProfile?.unlimited_credits ||
      (userProfile?.subscription?.active &&
        (userProfile?.subscription?.unlimited_credits === true ||
          userProfile?.subscription?.unlimited_credits === "true" ||
          userProfile?.subscription?.plan?.toLowerCase().includes("unlimited")))
  );

  /* ---------------- AI OCR Scanning Handler ---------------- */
  async function handleScanFile(file: File) {
    if (!file) return;

    let fileToUpload = file;
    try {
      fileToUpload = await compressImageIfNeeded(file);
    } catch (e) {
      console.warn("Compression failed, uploading original", e);
    }

    const controller = new AbortController();
    uploadAbortRef.current = controller;
    const bgPreviewUrl = fileToUpload.type.startsWith("image/")
      ? URL.createObjectURL(fileToUpload)
      : undefined;

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
      const data: any = res.data;
      setUploadMeta((prev) => (prev ? { ...prev, stage: "verifying" } : prev));

      if (scanType === "purchase") {
        // Build purchase draft
        const myProfile = await getBusinessProfile().catch(() => null);
        const myStateCode =
          myProfile?.stateCode || (myProfile?.gstin ? getStateCodeFromGSTIN(myProfile.gstin) : "");
        const sellerGstin = (data.seller_gstin || "").trim().toUpperCase();
        const sellerStateCode = sellerGstin ? getStateCodeFromGSTIN(sellerGstin) : "";
        const isInterstateVal =
          Boolean(myStateCode && sellerStateCode && myStateCode !== sellerStateCode);

        let parsedItems: import("@/lib/storage").PurchaseItem[] = [];
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          parsedItems = data.items.map((it: any) => ({
            name: it.name || it.description || "Purchased Goods / Services",
            hsn: it.hsn || it.hsn_code || "",
            quantity: Number(it.quantity) || 1,
            unit: it.unit || "Pcs",
            rate: Number(it.rate) || Number(it.unit_price) || 0,
            taxPercent: Number(it.tax_percent) || Number(it.gst_rate) || 18,
            cessPercent: 0,
          }));
        } else {
          const taxable = Number(data.taxable_value) || Number(data.taxable_amount) || 0;
          parsedItems = [
            {
              name: (data.seller_name || "Vendor") + " Supplies",
              hsn: "",
              quantity: 1,
              unit: "Pcs",
              rate: taxable || Number(data.invoice_total) || 0,
              taxPercent: 18,
              cessPercent: 0,
            },
          ];
        }

        let draftTaxable = 0;
        let draftCgst = 0;
        let draftSgst = 0;
        let draftIgst = 0;
        for (const it of parsedItems) {
          const lineTax = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
          draftTaxable += lineTax;
          const rate = Number(it.taxPercent) || 0;
          if (isInterstateVal) {
            draftIgst += (lineTax * rate) / 100;
          } else {
            draftCgst += (lineTax * (rate / 2)) / 100;
            draftSgst += (lineTax * (rate / 2)) / 100;
          }
        }
        const draftTotal = draftTaxable + draftCgst + draftSgst + draftIgst;

        const draftPurchase: PurchaseBill = {
          id: `pur-${Date.now()}`,
          invoiceNumber: data.invoice_number || `PUR-DRAFT-${Date.now().toString().slice(-4)}`,
          date: data.invoice_date || getLocalToday(),
          supplierName:
            data.seller_name ||
            data.seller_gstin_info?.trade_name ||
            data.seller_gstin_info?.legal_name ||
            "Vendor (Extracted)",
          supplierGstin: sellerGstin || undefined,
          supplierAddress: data.seller_address || undefined,
          items: parsedItems,
          interstate: isInterstateVal,
          itcEligibility: "eligible",
          paymentStatus: "Paid",
          taxableAmount: Math.round(draftTaxable * 100) / 100,
          cgst: Math.round(draftCgst * 100) / 100,
          sgst: Math.round(draftSgst * 100) / 100,
          igst: Math.round(draftIgst * 100) / 100,
          cess: 0,
          total: Number(data.invoice_total) || Math.round(draftTotal * 100) / 100,
          created_at: Date.now(),
          updated_at: Date.now(),
          created_time: new Date().toISOString(),
          updated_time: new Date().toISOString(),
          status: "draft",
        };

        await savePurchase(draftPurchase);
        toast.success("Bill scanned & saved to drafts! Review & confirm below.");
      } else {
        // Build sale draft
        const draftData = {
          ...data,
          invoice_type: "tax-invoice",
          status: "draft",
        };
        await saveInvoiceDraft(draftData, "draft");
        toast.success("Sale invoice scanned & saved to drafts! Review & confirm below.");
      }

      await loadData();
      setActiveTab("drafts");
    } catch (err: any) {
      if (isAbortError(err)) {
        toast("Scan cancelled");
      } else {
        console.error("OCR scan failed:", err);
        toast.error(err.message || "Failed to extract bill details");
      }
    } finally {
      setIsUploading(false);
      setUploadMeta(null);
    }
  }

  /* ---------------- Draft Action Handlers ---------------- */
  async function handleConfirmDraftSale(inv: InvoiceUI) {
    try {
      await updateInvoice(inv.id, {
        status: "confirmed",
        updated_time: new Date().toISOString(),
      });
      toast.success(`Invoice ${inv.name} confirmed & recorded!`);
      await loadData();
      setReviewingDraft(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to confirm invoice");
    }
  }

  async function handleConfirmDraftPurchase(p: PurchaseBill) {
    try {
      const updated: PurchaseBill = {
        ...p,
        status: "confirmed",
        updated_at: Date.now(),
        updated_time: new Date().toISOString(),
      };
      await savePurchase(updated);
      toast.success(`Bill ${p.invoiceNumber} confirmed & ITC claimed!`);
      await loadData();
      setReviewingDraft(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to confirm purchase bill");
    }
  }

  async function handleDeleteDraft(type: "purchase" | "sale", id: string) {
    if (!window.confirm("Discard this draft document? This cannot be undone.")) {
      return;
    }
    try {
      if (type === "purchase") {
        await deletePurchase(id);
      } else {
        await deleteInvoice(id);
      }
      toast.success("Draft discarded");
      await loadData();
      setReviewingDraft(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to discard draft");
    }
  }

  // Fast WhatsApp Share for confirmed sales
  function handleWhatsAppShare(inv: InvoiceUI) {
    openWhatsAppInvoice({
      invoice: {
        invoice_number: inv.name,
        invoice_date: inv.date,
        invoice_total: Number(inv.amount) || 0,
        buyer_gstin_info: { trade_name: extractCustomerName(inv.raw) },
      },
      sellerName: profile?.tradeName || profile?.businessName,
      sellerUpiId: profile?.upiId,
    });
  }

  // Filtered queries for search
  const filteredDrafts = allDrafts.filter(({ type, data }) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (type === "sale") {
      const s = data as InvoiceUI;
      return (
        s.name.toLowerCase().includes(q) ||
        (extractCustomerName(s.raw) || "").toLowerCase().includes(q)
      );
    } else {
      const p = data as PurchaseBill;
      return (
        p.invoiceNumber.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        (p.supplierGstin || "").toLowerCase().includes(q)
      );
    }
  });

  const filteredConfirmedSales = confirmedSales.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      (extractCustomerName(i.raw) || "").toLowerCase().includes(q)
    );
  });

  const filteredConfirmedPurchases = confirmedPurchases.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      (p.supplierGstin || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 pb-28">
      {/* Hidden file & camera inputs */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleScanFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleScanFile(file);
          e.target.value = "";
        }}
      />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#141415]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#047857] text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
              {profile?.tradeName || profile?.businessName || "GSTLens Mobile"}
            </h1>
            <p className="text-[10px] text-stone-400 font-mono truncate">
              {profile?.gstin || "GST Billing & Tax"}
            </p>
          </div>
        </div>

        {/* Scan Credits Pill */}
        <Link
          href="/credits"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-800 text-xs font-semibold shrink-0"
        >
          <Sparkles className="w-3 h-3 text-[#047857] dark:text-emerald-400" />
          <span className="font-mono tabular-nums">
            {isUnlimited ? "∞ Unlimited" : `${userProfile?.credits || 0} scans`}
          </span>
        </Link>
      </header>

      {/* Main Content Hub */}
      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* ============================================================== */}
        {/* HERO MOBILE SCANNER CARD (Camera First for Phone Users) */}
        {/* ============================================================== */}
        <div className="bg-gradient-to-br from-[#047857] to-emerald-800 text-white rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-tight">
                  Scan Bill or Invoice
                </h2>
                <p className="text-[11px] text-emerald-100">
                  Instant AI OCR • Saved directly to drafts
                </p>
              </div>
            </div>

            {/* Document Type Selector Pill */}
            <div className="flex bg-black/20 p-0.5 rounded-lg text-[10px] font-bold shrink-0">
              <button
                type="button"
                onClick={() => setScanType("purchase")}
                className={`px-2 py-1 rounded-md transition ${
                  scanType === "purchase"
                    ? "bg-white text-emerald-900 shadow-2xs font-bold"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                Purchase
              </button>
              <button
                type="button"
                onClick={() => setScanType("sale")}
                className={`px-2 py-1 rounded-md transition ${
                  scanType === "sale"
                    ? "bg-white text-emerald-900 shadow-2xs font-bold"
                    : "text-emerald-100 hover:text-white"
                }`}
              >
                Sale
              </button>
            </div>
          </div>

          {/* High-Contrast Thumb Scan Triggers */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => captureRef.current?.click()}
              className="py-2.5 px-3 bg-white text-emerald-900 hover:bg-emerald-50 active:scale-98 rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#047857]" />
              <span>Camera Scan</span>
            </button>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="py-2.5 px-3 bg-white/20 hover:bg-white/30 text-white active:scale-98 rounded-xl font-bold text-xs border border-white/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>Upload PDF / Pic</span>
            </button>
          </div>
        </div>

        {/* Pending Drafts Alert Pill (when not on Drafts tab) */}
        {totalDraftsCount > 0 && activeTab !== "drafts" && (
          <button
            type="button"
            onClick={() => setActiveTab("drafts")}
            className="w-full p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-between text-left transition hover:border-amber-300"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  {totalDraftsCount} draft {totalDraftsCount === 1 ? "bill" : "bills"} pending review
                </p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  Auto-saved from camera scans • Tap to review & confirm
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-0.5 shrink-0">
              <span>View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        {/* 2x2 Metric Summary Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Sales */}
          <div className="bg-white dark:bg-[#161513] p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 tabular-nums">
              {formatINR(totalSales)}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">
              {confirmedSales.length} confirmed sales
            </p>
          </div>

          {/* Purchases */}
          <div className="bg-white dark:bg-[#161513] p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Purchases</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-base font-bold font-mono text-stone-900 dark:text-stone-100 tabular-nums">
              {formatINR(totalPurchases)}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">
              {confirmedPurchases.length} confirmed bills
            </p>
          </div>

          {/* Tax to Pay */}
          <div className="bg-white dark:bg-[#161513] p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Tax to Pay</span>
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-base font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {formatINR(netGstPayable)}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">Net GSTR-3B</p>
          </div>

          {/* Tax Credit (ITC) */}
          <div className="bg-white dark:bg-[#161513] p-3 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Tax Saved</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatINR(totalITC)}
            </p>
            <p className="text-[10px] text-stone-400 mt-0.5">Eligible ITC</p>
          </div>
        </div>

        {/* Quick Navigation Shortcuts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <Link
            href="/gstr-3b"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161513] border border-stone-200/80 dark:border-stone-800 font-semibold text-stone-700 dark:text-stone-200 shrink-0 shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-[#047857] dark:text-emerald-400" />
            <span>Tax Summary</span>
          </Link>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161513] border border-stone-200/80 dark:border-stone-800 font-semibold text-stone-700 dark:text-stone-200 shrink-0 shadow-2xs"
          >
            <span>Parties</span>
          </Link>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161513] border border-stone-200/80 dark:border-stone-800 font-semibold text-stone-700 dark:text-stone-200 shrink-0 shadow-2xs"
          >
            <span>Items & Stock</span>
          </Link>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#161513] border border-stone-200/80 dark:border-stone-800 font-semibold text-stone-700 dark:text-stone-200 shrink-0 shadow-2xs"
          >
            <span>Expenses</span>
          </Link>
        </div>

        {/* ============================================================== */}
        {/* MOBILE TRANSACTION REGISTER (Drafts, Saved Sales & Saved Bills) */}
        {/* ============================================================== */}
        <div className="bg-white dark:bg-[#161513] rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xs overflow-hidden">
          {/* 3-Way Segmented Switcher */}
          <div className="p-2.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
            <div className="grid grid-cols-3 gap-1 bg-stone-200/60 dark:bg-stone-800/80 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("drafts")}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 text-[11px] ${
                  activeTab === "drafts"
                    ? "bg-white dark:bg-[#161513] text-amber-700 dark:text-amber-400 shadow-xs font-bold"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                <span>Drafts</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    totalDraftsCount > 0
                      ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold"
                      : "bg-stone-100 dark:bg-stone-800 text-stone-500"
                  }`}
                >
                  {totalDraftsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("sales")}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 text-[11px] ${
                  activeTab === "sales"
                    ? "bg-white dark:bg-[#161513] text-[#047857] dark:text-emerald-400 shadow-xs font-bold"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                <span>Saved Sales</span>
                <span className="text-[10px] text-stone-400 font-mono">
                  ({confirmedSales.length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("purchases")}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1 text-[11px] ${
                  activeTab === "purchases"
                    ? "bg-white dark:bg-[#161513] text-purple-700 dark:text-purple-400 shadow-xs font-bold"
                    : "text-stone-600 dark:text-stone-400"
                }`}
              >
                <span>Saved Bills</span>
                <span className="text-[10px] text-stone-400 font-mono">
                  ({confirmedPurchases.length})
                </span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-stone-100 dark:border-stone-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={
                  activeTab === "drafts"
                    ? "Search drafts by document # or party..."
                    : activeTab === "sales"
                    ? "Search saved sales or customers..."
                    : "Search saved bills or vendors..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl pl-8 pr-8 py-2 text-xs text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-[#047857]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: DRAFTS (Scanned Bills & Invoices Pending Confirmation) */}
          {/* ============================================================== */}
          {activeTab === "drafts" && (
            <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {filteredDrafts.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-stone-400 space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="font-semibold text-stone-700 dark:text-stone-300">
                    No pending draft documents
                  </p>
                  <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                    Physical bills scanned with the camera are automatically saved here for quick verification.
                  </p>
                  <button
                    type="button"
                    onClick={() => captureRef.current?.click()}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Bill Now</span>
                  </button>
                </div>
              ) : (
                filteredDrafts.map(({ type, data }) => {
                  if (type === "purchase") {
                    const p = data as PurchaseBill;
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 hover:bg-stone-50 dark:hover:bg-stone-900/40 transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                            Draft Purchase
                          </span>
                          <span className="text-[11px] font-mono text-stone-400">
                            {p.date}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              {p.supplierName}
                            </p>
                            <p className="text-[11px] font-mono text-stone-400 truncate">
                              #{p.invoiceNumber}
                              {p.supplierGstin ? ` • ${p.supplierGstin}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100 tabular-nums">
                              {formatINR(p.total)}
                            </p>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                              ITC: {formatINR(p.cgst + p.sgst + p.igst)}
                            </span>
                          </div>
                        </div>

                        {/* Draft Card Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft("purchase", p.id)}
                            className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Discard draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewingDraft({ type: "purchase", item: p })}
                            className="px-2.5 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmDraftPurchase(p)}
                            className="px-3.5 py-1.5 bg-[#047857] hover:bg-[#065f46] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                        </div>
                      </div>
                    );
                  } else {
                    const inv = data as InvoiceUI;
                    return (
                      <div
                        key={inv.id}
                        className="p-3.5 hover:bg-stone-50 dark:hover:bg-stone-900/40 transition space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Draft Sale
                          </span>
                          <span className="text-[11px] font-mono text-stone-400">
                            {inv.date}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              {extractCustomerName(inv.raw) || "Direct Customer"}
                            </p>
                            <p className="text-[11px] font-mono text-stone-400 truncate">
                              #{inv.name}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100 tabular-nums">
                              {formatINR(inv.amount)}
                            </p>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              GST: {formatINR(inv.gst)}
                            </span>
                          </div>
                        </div>

                        {/* Draft Card Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft("sale", inv.id)}
                            className="p-2 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Discard draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/invoices/new?id=${inv.id}`}
                            className="px-2.5 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleConfirmDraftSale(inv)}
                            className="px-3.5 py-1.5 bg-[#047857] hover:bg-[#065f46] active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                        </div>
                      </div>
                    );
                  }
                })
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: SAVED SALES (Confirmed Customer Invoices + WhatsApp) */}
          {/* ============================================================== */}
          {activeTab === "sales" && (
            <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {filteredConfirmedSales.length === 0 ? (
                <div className="py-12 px-4 text-center text-stone-400 text-xs space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700" />
                  <p className="font-semibold text-stone-700 dark:text-stone-300">
                    No confirmed sales yet
                  </p>
                  <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                    Create invoices with + New Sale or confirm scanned drafts.
                  </p>
                  <Link
                    href="/invoices/new"
                    className="mt-2 inline-flex items-center gap-1 text-[#047857] dark:text-emerald-400 font-bold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Invoice</span>
                  </Link>
                </div>
              ) : (
                filteredConfirmedSales.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-900/40 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                          {inv.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          Confirmed
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {extractCustomerName(inv.raw) || "Direct Customer"}
                        {inv.date ? ` • ${inv.date}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
                          {formatINR(inv.amount)}
                        </p>
                        <span className="text-[10px] text-stone-400">
                          GST: {formatINR(inv.gst)}
                        </span>
                      </div>

                      {/* 1-Tap WhatsApp Share */}
                      <button
                        type="button"
                        onClick={() => handleWhatsAppShare(inv)}
                        className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-2xs"
                        title="Share on WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* View Link */}
                      <Link
                        href="/invoices"
                        className="w-8 h-8 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        title="View invoice"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: SAVED BILLS (Confirmed Purchases with Eligible ITC) */}
          {/* ============================================================== */}
          {activeTab === "purchases" && (
            <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {filteredConfirmedPurchases.length === 0 ? (
                <div className="py-12 px-4 text-center text-stone-400 text-xs space-y-2">
                  <ShoppingCart className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-700" />
                  <p className="font-semibold text-stone-700 dark:text-stone-300">
                    No confirmed purchase bills yet
                  </p>
                  <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                    Scan vendor bills to extract GSTIN, auto-claim ITC, and save bills here.
                  </p>
                  <button
                    type="button"
                    onClick={() => captureRef.current?.click()}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Vendor Bill</span>
                  </button>
                </div>
              ) : (
                filteredConfirmedPurchases.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-900/40 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                          #{p.invoiceNumber}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400">
                          ITC Active
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                        {p.supplierName}
                        {p.date ? ` • ${p.date}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-mono font-bold text-xs text-stone-900 dark:text-stone-100 tabular-nums">
                          {formatINR(p.total)}
                        </p>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ITC: {formatINR(p.cgst + p.sgst + p.igst)}
                        </span>
                      </div>

                      <Link
                        href="/purchases"
                        className="w-8 h-8 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        title="View purchase bill"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* ============================================================== */}
      {/* QUICK DRAFT REVIEW MODAL */}
      {/* ============================================================== */}
      {reviewingDraft && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#161513] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Review {reviewingDraft.type === "purchase" ? "Purchase Bill" : "Sales Invoice"}
                </h3>
                <p className="text-[11px] text-stone-400">
                  Auto-saved draft from camera scan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingDraft(null)}
                className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Details Card */}
            <div className="bg-stone-50 dark:bg-stone-900/60 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">Party Name:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100 text-right truncate max-w-[200px]">
                  {reviewingDraft.type === "purchase"
                    ? reviewingDraft.item.supplierName
                    : extractCustomerName(reviewingDraft.item.raw) || "Direct Customer"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Document #:</span>
                <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                  {reviewingDraft.type === "purchase"
                    ? reviewingDraft.item.invoiceNumber
                    : reviewingDraft.item.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Date:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">
                  {reviewingDraft.item.date}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800/80 flex justify-between items-baseline">
                <span className="font-bold text-stone-700 dark:text-stone-300">Total Amount:</span>
                <span className="font-mono font-bold text-base text-stone-900 dark:text-stone-100 tabular-nums">
                  {formatINR(
                    reviewingDraft.type === "purchase"
                      ? reviewingDraft.item.total
                      : reviewingDraft.item.amount
                  )}
                </span>
              </div>
              {reviewingDraft.type === "purchase" && (
                <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
                  <span>Eligible ITC Claim:</span>
                  <span className="font-mono font-bold">
                    {formatINR(
                      reviewingDraft.item.cgst +
                        reviewingDraft.item.sgst +
                        reviewingDraft.item.igst
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() =>
                  handleDeleteDraft(
                    reviewingDraft.type,
                    reviewingDraft.item.id
                  )
                }
                className="py-2.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard Draft</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (reviewingDraft.type === "purchase") {
                    handleConfirmDraftPurchase(reviewingDraft.item);
                  } else {
                    handleConfirmDraftSale(reviewingDraft.item);
                  }
                }}
                className="py-2.5 px-3 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI OCR Scanning Progress Modal */}
      {isUploading && (
        <UploadingModal
          title={scanType === "purchase" ? "Scanning Purchase Bill" : "Scanning Sales Invoice"}
          subtitle="Extracting GSTIN, HSN & tax totals • Auto-saving to drafts"
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

      {/* Sticky Bottom Action Bar (Fixed Thumb Reach) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#141415]/95 backdrop-blur-md border-t border-stone-200/80 dark:border-stone-800 p-3 z-40">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-2.5">
          <Link
            href="/invoices/new"
            className="py-3 px-4 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95 text-stone-800 dark:text-stone-100 font-bold text-xs shadow-2xs transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 text-[#047857] dark:text-emerald-400" />
            <span>+ New Sale</span>
          </Link>

          <button
            type="button"
            onClick={() => captureRef.current?.click()}
            className="py-3 px-4 rounded-2xl bg-[#047857] hover:bg-[#065f46] active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>📸 Scan Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
}
