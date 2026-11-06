"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Trash2,
  Edit3,
  X,
  FileText,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  TrendingDown,
  ShieldCheck,
  CreditCard,
  Camera,
  Upload,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Check,
  RotateCcw,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  PurchaseBill,
  PurchaseItem,
  getAllPurchases,
  savePurchase,
  deletePurchase,
  adjustProductStock,
  getAllProducts,
  Product,
  getBusinessProfile,
  BusinessProfile,
} from "@/lib/storage";
import {
  INDIAN_STATES,
  GST_RATES,
  BUILTIN_UNITS,
  formatINR,
  getLocalToday,
  getStateCodeFromGSTIN,
} from "@/lib/gstBillingEngine";
import { fetchGSTInfo, uploadInvoice, GstInfo } from "@/lib/api";
import {
  runBatchUploadQueue,
  BatchFileItem,
  BatchSummaryState,
} from "@/lib/batchUpload";
import {
  getFinancialYear,
  normalizeInvoiceNumber,
  normalizeGSTIN,
  StoredInvoiceRef,
} from "@/lib/duplicates";
import { UPDATE_CREDIT_EVENT } from "@/lib/constants";
import { autoMasterVendorFromPurchase } from "@/lib/vendorMaster";
import UploadingModal from "@/components/UploadingModal";
import BatchUploadModal from "@/components/BatchUploadModal";
import toast from "react-hot-toast";

/* ---------------- Image Compression Helper ---------------- */

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
      const maxDim = 3000;
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
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
  });
}

/* ---------------- Date Normalizer for HTML Input ---------------- */

function normalizeToHtmlDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== "string") return getLocalToday();
  const cleaned = dateStr.replace(/[./\s]+/g, "-").trim();
  const parts = cleaned.split("-").filter(Boolean);
  if (parts.length === 3) {
    // YYYY-MM-DD
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    // DD-MM-YYYY
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return getLocalToday();
}

/* ---------------- Statutory Section 16(2) Duplicate Check ---------------- */

function checkPurchaseDuplicate(
  candidate: {
    invoiceNumber: string;
    supplierGstin?: string;
    supplierName: string;
    date: string;
    id?: string;
  },
  existingBills: PurchaseBill[]
): { isDuplicate: boolean; warning?: string } {
  const cNum = normalizeInvoiceNumber(candidate.invoiceNumber);
  const cGstin = normalizeGSTIN(candidate.supplierGstin);
  const cName = (candidate.supplierName || "").trim().toLowerCase();
  const cFy = getFinancialYear(candidate.date);

  if (!cNum) return { isDuplicate: false };

  for (const bill of existingBills) {
    if (candidate.id && bill.id === candidate.id) continue;
    const bNum = normalizeInvoiceNumber(bill.invoiceNumber);
    const bGstin = normalizeGSTIN(bill.supplierGstin);
    const bName = (bill.supplierName || "").trim().toLowerCase();
    const bFy = getFinancialYear(bill.date);

    const sameNumber = cNum === bNum;
    const sameSupplier =
      (cGstin && bGstin && cGstin === bGstin) ||
      (cName && bName && cName === bName);
    const sameFy =
      cFy !== "UNKNOWN_FY" && bFy !== "UNKNOWN_FY" ? cFy === bFy : true;

    if (sameNumber && sameSupplier && sameFy) {
      return {
        isDuplicate: true,
        warning: `Statutory Warning (Section 16(2) CGST Act): Purchase bill #${candidate.invoiceNumber} from ${bill.supplierName} already exists for FY ${cFy} (Recorded on ${bill.date}). Input Tax Credit (ITC) cannot be claimed twice on identical invoices.`,
      };
    }
  }

  return { isDuplicate: false };
}

/* ---------------- Preview Modal for Bill Image / PDF ---------------- */

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
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center p-0 md:p-4">
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl p-6 w-full md:max-w-2xl shadow-2xl max-h-[92vh] flex flex-col border border-slate-200/80 dark:border-slate-800 animate-slide-up">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Preview & Confirm Vendor Bill
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto mb-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl flex items-center justify-center p-2 min-h-[260px] border border-slate-200/60 dark:border-slate-800">
            {isImage && (
              <img
                src={previewUrl}
                alt="Bill Preview"
                className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-xs"
              />
            )}
            {isPdf && (
              <iframe
                src={previewUrl}
                className="w-full h-[55vh] rounded-xl border-0"
                title="PDF Preview"
              />
            )}
            {!isImage && !isPdf && (
              <div className="text-center text-slate-500 py-12">
                <FileText className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-semibold">{file.name}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-98 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCompressing}
              onClick={() => onConfirm(file)}
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Optimizing Image...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" /> Process with AI OCR
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Main Purchases Page Component ---------------- */

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [date, setDate] = useState<string>(getLocalToday());
  const [supplierName, setSupplierName] = useState<string>("");
  const [supplierGstin, setSupplierGstin] = useState<string>("");
  const [supplierAddress, setSupplierAddress] = useState<string>("");
  const [interstate, setInterstate] = useState<boolean>(false);
  const [itcEligibility, setItcEligibility] =
    useState<PurchaseBill["itcEligibility"]>("eligible");
  const [paymentStatus, setPaymentStatus] =
    useState<PurchaseBill["paymentStatus"]>("Paid");
  const [note, setNote] = useState<string>("");
  const [isFetchingGst, setIsFetchingGst] = useState<boolean>(false);
  const [gstVerified, setGstVerified] = useState<GstInfo | null>(null);

  // AI OCR States
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isOcrPopulated, setIsOcrPopulated] = useState<boolean>(false);

  // Batch Upload States
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
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

  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const modalFileRef = useRef<HTMLInputElement>(null);
  const modalCameraRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PurchaseItem[]>([
    {
      name: "",
      hsn: "",
      quantity: 1,
      unit: "Pcs",
      rate: 0,
      taxPercent: 18,
      cessPercent: 0,
    },
  ]);

  const loadData = async () => {
    try {
      const [pData, prodData] = await Promise.all([
        getAllPurchases(),
        getAllProducts(),
      ]);
      setPurchases(
        pData.sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
      );
      setProducts(prodData);
    } catch (err: any) {
      toast.error("Failed to load purchases: " + err.message);
    }
  };

  useEffect(() => {
    loadData();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("scan") === "camera") {
        setTimeout(() => cameraInputRef.current?.click(), 300);
      } else if (params.get("scan") === "file") {
        setTimeout(() => fileInputRef.current?.click(), 300);
      } else if (params.get("action") === "new") {
        setTimeout(() => openAddModal(), 300);
      }
    }
  }, []);

  const handleGstLookup = async (lookupGstin?: string) => {
    const clean = (lookupGstin || supplierGstin).trim().toUpperCase();
    if (clean.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }
    setIsFetchingGst(true);
    try {
      const [res, myProfile] = await Promise.all([
        fetchGSTInfo(clean),
        getBusinessProfile().catch(() => null),
      ]);
      if (res && res.data) {
        const info = res.data;
        setGstVerified(info);
        setSupplierName(info.trade_name || info.legal_name || supplierName);
        const fullAddr = [info.address, info.city, info.pincode]
          .filter(Boolean)
          .join(", ");
        if (fullAddr) setSupplierAddress(fullAddr);

        // Auto-detect interstate vs intra-state
        const myStateCode =
          myProfile?.stateCode ||
          (myProfile?.gstin ? myProfile.gstin.slice(0, 2) : "27");
        if (info.state_code && myStateCode) {
          setInterstate(info.state_code !== myStateCode);
        }

        toast.success(
          `Supplier verified: ${info.trade_name || info.legal_name}`
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch details from GST portal");
    } finally {
      setIsFetchingGst(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setInvoiceNumber("");
    setDate(getLocalToday());
    setSupplierName("");
    setSupplierGstin("");
    setSupplierAddress("");
    setInterstate(false);
    setItcEligibility("eligible");
    setPaymentStatus("Paid");
    setNote("");
    setGstVerified(null);
    setDuplicateWarning(null);
    setIsOcrPopulated(false);
    setItems([
      {
        name: "",
        hsn: "",
        quantity: 1,
        unit: "Pcs",
        rate: 0,
        taxPercent: 18,
        cessPercent: 0,
      },
    ]);
    setShowModal(true);
  };

  const openEditModal = (p: PurchaseBill) => {
    setEditingId(p.id);
    setInvoiceNumber(p.invoiceNumber);
    setDate(p.date || getLocalToday());
    setSupplierName(p.supplierName);
    setSupplierGstin(p.supplierGstin || "");
    setSupplierAddress(p.supplierAddress || "");
    setInterstate(p.interstate);
    setItcEligibility(p.itcEligibility);
    setPaymentStatus(p.paymentStatus);
    setNote(p.note || "");
    setGstVerified(null);
    setDuplicateWarning(null);
    setIsOcrPopulated(false);
    setItems(
      p.items && p.items.length > 0
        ? p.items.map((it) => ({
            name: it.name,
            hsn: it.hsn || "",
            quantity: it.quantity || 1,
            unit: it.unit || "Pcs",
            rate: it.rate || 0,
            taxPercent: it.taxPercent || 18,
            cessPercent: it.cessPercent || 0,
          }))
        : [
            {
              name: "",
              hsn: "",
              quantity: 1,
              unit: "Pcs",
              rate: 0,
              taxPercent: 18,
              cessPercent: 0,
            },
          ]
    );
    setShowModal(true);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        hsn: "",
        quantity: 1,
        unit: "Pcs",
        rate: 0,
        taxPercent: 18,
        cessPercent: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof PurchaseItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Calculations
  const calcTotals = React.useMemo(() => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let cess = 0;

    for (const it of items) {
      const lineTaxable = (Number(it.quantity) || 0) * (Number(it.rate) || 0);
      taxable += lineTaxable;
      const rate = Number(it.taxPercent) || 0;
      if (interstate) {
        igst += (lineTaxable * rate) / 100;
      } else {
        cgst += (lineTaxable * (rate / 2)) / 100;
        sgst += (lineTaxable * (rate / 2)) / 100;
      }
      cess += (lineTaxable * (Number(it.cessPercent) || 0)) / 100;
    }

    const total = taxable + cgst + sgst + igst + cess;
    return {
      taxableAmount: Math.round(taxable * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      cess: Math.round(cess * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }, [items, interstate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error("Vendor invoice number is required");
      return;
    }

    const existing = purchases.find((p) => p.id === editingId);
    const payload: PurchaseBill = {
      id: editingId || `pur-${Date.now()}`,
      invoiceNumber: invoiceNumber.trim(),
      date,
      supplierName: supplierName.trim(),
      supplierGstin: supplierGstin.trim().toUpperCase() || undefined,
      supplierAddress: supplierAddress.trim() || undefined,
      items,
      interstate,
      itcEligibility,
      paymentStatus,
      taxableAmount: calcTotals.taxableAmount,
      cgst: calcTotals.cgst,
      sgst: calcTotals.sgst,
      igst: calcTotals.igst,
      cess: calcTotals.cess,
      total: calcTotals.total,
      note: note.trim() || undefined,
      created_at: existing?.created_at || Date.now(),
    };

    try {
      await savePurchase(payload);

      // Auto-increment stock on purchased items
      for (const it of items) {
        const match = products.find(
          (p) =>
            p.name.toLowerCase() === it.name.toLowerCase() ||
            (it.hsn && p.hsn === it.hsn)
        );
        if (match && !match.isService) {
          await adjustProductStock(match.id, it.quantity);
        }
      }

      // Auto-master vendor profile into clients store
      await autoMasterVendorFromPurchase({
        supplierName: payload.supplierName,
        supplierGstin: payload.supplierGstin,
        supplierAddress: payload.supplierAddress,
      }).catch((err) => console.warn("Vendor auto-master skipped:", err));

      toast.success(
        editingId
          ? `Purchase bill ${payload.invoiceNumber} updated!`
          : `Purchase bill ${payload.invoiceNumber} recorded!`
      );
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    }
  };

  const handleDelete = async (id: string, num: string) => {
    if (!confirm(`Delete purchase bill ${num}?`)) return;
    try {
      await deletePurchase(id);
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      toast.success("Purchase bill removed");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  /* ---------------- Single Bill OCR Extraction ---------------- */

  const handleFileSelect = (file: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
  };

  const handleConfirmSingleUpload = async (file: File) => {
    setIsCompressing(true);
    let fileToUpload = file;
    try {
      fileToUpload = await compressImageIfNeeded(file);
    } catch (e) {
      console.warn("Compression failed, using original", e);
    } finally {
      setIsCompressing(false);
    }

    // Close preview modal
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }

    setIsUploading(true);

    try {
      const res = await uploadInvoice(fileToUpload);
      const data = res.data;

      // Fetch user profile to detect interstate
      const myProfile = await getBusinessProfile().catch(() => null);
      const myStateCode =
        myProfile?.stateCode ||
        (myProfile?.gstin ? myProfile.gstin.slice(0, 2) : "27");

      const sellerGstin = (data.seller_gstin || "").trim().toUpperCase();
      let supplierNameVal = data.seller_name || "";
      let supplierAddressVal = "";
      let isInterstateVal = false;
      let verifiedGstInfo: GstInfo | null = null;

      if (sellerGstin && sellerGstin.length === 15) {
        try {
          const gstRes = await fetchGSTInfo(sellerGstin);
          if (gstRes?.data) {
            verifiedGstInfo = gstRes.data;
            supplierNameVal =
              gstRes.data.trade_name ||
              gstRes.data.legal_name ||
              supplierNameVal;
            supplierAddressVal = [
              gstRes.data.address,
              gstRes.data.city,
              gstRes.data.pincode,
            ]
              .filter(Boolean)
              .join(", ");
            if (gstRes.data.state_code && myStateCode) {
              isInterstateVal = gstRes.data.state_code !== myStateCode;
            }
          }
        } catch (e) {
          console.warn("Live GST lookup failed:", e);
        }
      }

      if (!isInterstateVal && data.pos && myStateCode) {
        isInterstateVal = data.pos !== myStateCode;
      }

      const htmlDate = normalizeToHtmlDate(data.invoice_date);
      const invNo = data.invoice_number || "";

      // Items resolution
      let parsedItems: PurchaseItem[] = [];
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        parsedItems = data.items.map((it: any) => ({
          name: it.name || "Purchased Goods / Services",
          hsn: it.hsn || "",
          quantity: Number(it.quantity) || 1,
          unit: it.unit || "Pcs",
          rate: Number(it.rate) || 0,
          taxPercent: Number(it.tax_percent) || 18,
          cessPercent: 0,
        }));
      } else {
        const taxable = Number(data.taxable_value) || 0;
        const totalTax =
          (Number(data.cgst) || 0) +
          (Number(data.sgst) || 0) +
          (Number(data.igst) || 0);
        let taxRate = 18;
        if (taxable > 0 && totalTax > 0) {
          const calcRate = (totalTax / taxable) * 100;
          const standard = [0, 5, 12, 18, 28];
          taxRate = standard.reduce((prev, curr) =>
            Math.abs(curr - calcRate) < Math.abs(prev - calcRate) ? curr : prev
          );
        }
        parsedItems = [
          {
            name: supplierNameVal
              ? `Purchased Supplies from ${supplierNameVal}`
              : "Purchased Goods / Services",
            hsn: "",
            quantity: 1,
            unit: "Pcs",
            rate: taxable || Number(data.invoice_total) || 0,
            taxPercent: taxRate,
            cessPercent: 0,
          },
        ];
      }

      // Check duplicate
      const dupCheck = checkPurchaseDuplicate(
        {
          invoiceNumber: invNo,
          supplierGstin: sellerGstin,
          supplierName: supplierNameVal,
          date: htmlDate,
        },
        purchases
      );

      // Populate modal form
      setEditingId(null);
      setInvoiceNumber(invNo);
      setDate(htmlDate);
      setSupplierName(supplierNameVal);
      setSupplierGstin(sellerGstin);
      setSupplierAddress(supplierAddressVal);
      setInterstate(isInterstateVal);
      setItcEligibility("eligible");
      setPaymentStatus("Paid");
      setItems(parsedItems);
      setGstVerified(verifiedGstInfo);
      setDuplicateWarning(
        dupCheck.isDuplicate
          ? dupCheck.warning || "Duplicate detected"
          : null
      );
      setIsOcrPopulated(true);

      setShowModal(true);

      if (dupCheck.isDuplicate) {
        toast.error("Duplicate bill detected! Verify Section 16(2) warning.", {
          duration: 6000,
        });
      } else {
        toast.success(
          "AI OCR bill extracted! Review details and click Record Bill."
        );
      }
    } catch (err: any) {
      console.error("AI OCR failed:", err);
      toast.error(err.message || "Failed to extract bill details");
    } finally {
      setIsUploading(false);
    }
  };

  /* ---------------- Helper: Save OCR Data Directly (Batch) ---------------- */

  const savePurchaseFromOcrData = async (data: any): Promise<string> => {
    const profile = await getBusinessProfile().catch(() => null);
    const myState =
      profile?.stateCode || (profile?.gstin ? profile.gstin.slice(0, 2) : "27");
    const sellerGstin = data.seller_gstin || "";
    const sellerState = sellerGstin.length >= 2 ? sellerGstin.slice(0, 2) : "";
    const isInter = Boolean(sellerState && myState && sellerState !== myState);

    const taxable = Number(data.taxable_value) || 0;
    const cgst = Number(data.cgst) || 0;
    const sgst = Number(data.sgst) || 0;
    const igst = Number(data.igst) || 0;
    const total = Number(data.invoice_total) || taxable + cgst + sgst + igst;
    const totalTax = cgst + sgst + igst;

    let taxRate = 18;
    if (taxable > 0 && totalTax > 0) {
      const calcRate = (totalTax / taxable) * 100;
      const standard = [0, 5, 12, 18, 28];
      taxRate = standard.reduce((prev, curr) =>
        Math.abs(curr - calcRate) < Math.abs(prev - calcRate) ? curr : prev
      );
    }

    const billItems: PurchaseItem[] =
      data.items && Array.isArray(data.items) && data.items.length > 0
        ? data.items.map((it: any) => ({
            name: it.name || "Purchased Goods / Services",
            hsn: it.hsn || "",
            quantity: Number(it.quantity) || 1,
            unit: it.unit || "Pcs",
            rate:
              Number(it.rate) ||
              (Number(it.amount) || taxable) / (Number(it.quantity) || 1),
            taxPercent: Number(it.tax_percent) || taxRate,
            cessPercent: 0,
          }))
        : [
            {
              name: data.seller_name
                ? `Supplies from ${data.seller_name}`
                : "Purchased Goods / Services",
              hsn: "",
              quantity: 1,
              unit: "Pcs",
              rate: taxable || total,
              taxPercent: taxRate,
              cessPercent: 0,
            },
          ];

    const bill: PurchaseBill = {
      id: `pur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      invoiceNumber: data.invoice_number || `PB-${Date.now()}`,
      date: normalizeToHtmlDate(data.invoice_date),
      supplierName:
        data.seller_gstin_info?.trade_name ||
        data.seller_gstin_info?.legal_name ||
        data.seller_name ||
        "Vendor",
      supplierGstin: sellerGstin || undefined,
      supplierAddress:
        [
          data.seller_gstin_info?.address,
          data.seller_gstin_info?.city,
          data.seller_gstin_info?.pincode,
        ]
          .filter(Boolean)
          .join(", ") || undefined,
      items: billItems,
      interstate: isInter,
      itcEligibility: "eligible",
      paymentStatus: "Paid",
      taxableAmount: taxable,
      cgst,
      sgst,
      igst,
      cess: 0,
      total,
      note:
        data.duplicate_warning ||
        (data.warning ? `AI Warning: ${data.warning}` : undefined),
      created_at: Date.now(),
    };

    const savedId = await savePurchase(bill);

    // Auto-master vendor profile into clients store
    await autoMasterVendorFromPurchase({
      supplierName: bill.supplierName,
      supplierGstin: bill.supplierGstin,
      supplierAddress: bill.supplierAddress,
      supplierCity: data.seller_gstin_info?.city,
      supplierPincode: data.seller_gstin_info?.pincode,
      pos: data.pos,
    }).catch((err) => console.warn("Vendor auto-master skipped:", err));

    return savedId;
  };

  /* ---------------- Multi-Bill Batch Upload (Concurrency 3x) ---------------- */

  const startBatchUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    lastBatchFilesRef.current = files;
    setShowBatchModal(true);

    const existingStored: StoredInvoiceRef[] = purchases.map((p) => ({
      id: p.id,
      status: p.paymentStatus,
      fp: p.date,
      data: {
        seller_gstin: p.supplierGstin,
        seller_name: p.supplierName,
        invoice_number: p.invoiceNumber,
        invoice_date: p.date,
        invoice_total: p.total,
      },
      created_at: p.created_at,
      updated_at: p.created_at,
      synced_to_cloud: 0,
      deleted: 0,
    }));

    try {
      await runBatchUploadQueue(files, {
        concurrency: 3,
        uploadFn: uploadInvoice,
        verifyGSTFn: fetchGSTInfo,
        compressImageFn: compressImageIfNeeded,
        saveDraftFn: async (data, status) => {
          return await savePurchaseFromOcrData(data);
        },
        existingInvoices: existingStored,
        onProgress: (items, summary) => {
          setBatchItems([...items]);
          setBatchSummary({ ...summary });
        },
      });
    } catch (err: any) {
      console.error("Batch upload encountered error:", err);
      toast.error("Batch upload encountered an error");
    } finally {
      await loadData();
    }
  };

  const handleRetryFailedBatch = async () => {
    const failedNames = new Set(
      batchItems.filter((i) => i.status === "error").map((i) => i.name)
    );
    const filesToRetry = lastBatchFilesRef.current.filter((f) =>
      failedNames.has(f.name)
    );
    if (filesToRetry.length > 0) {
      await startBatchUpload(filesToRetry);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    if (fileList.length === 1) {
      handleFileSelect(fileList[0]);
    } else {
      startBatchUpload(Array.from(fileList));
    }
    e.target.value = "";
  };

  /* ---------------- Try Demo Sample Vendor Bill ---------------- */

  const loadDemoSampleBill = async () => {
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
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 30px sans-serif";
      ctx.fillText("TAX INVOICE / PURCHASE BILL", 40, 95);

      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("Original for Recipient", canvas.width - 200, 95);

      // Divider line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 120);
      ctx.lineTo(canvas.width - 40, 120);
      ctx.stroke();

      // Supplier Details (Left)
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("SUPPLIER / VENDOR DETAILS:", 40, 160);
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("Apex Precision Industrial Spares Ltd", 40, 190);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText("GSTIN: 27AAPFU0939F1ZV", 40, 215);
      ctx.fillText(
        "Plot 42, MIDC Industrial Area, Pune, Maharashtra - 411018",
        40,
        240
      );

      // Invoice Meta (Right)
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("Invoice No: INV-2026-9042", 520, 160);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText(`Date: 25-10-2026`, 520, 190);
      ctx.fillText("Place of Supply: 27 (Maharashtra)", 520, 215);
      ctx.fillText("Reverse Charge: No", 520, 240);

      // Recipient Details
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("BILLED TO (BUYER):", 40, 290);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText("Customer Business Corp", 40, 315);
      ctx.fillText("GSTIN: 27AABCT3518Q1ZV", 40, 340);

      // Table Header
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(40, 380, canvas.width - 80, 40);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(40, 380, canvas.width - 80, 40);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("Item Description", 55, 405);
      ctx.fillText("HSN", 380, 405);
      ctx.fillText("Qty", 480, 405);
      ctx.fillText("Rate", 560, 405);
      ctx.fillText("Tax %", 660, 405);
      ctx.fillText("Amount", 760, 405);

      // Table Rows
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#1e293b";
      ctx.fillText("High Pressure Hydraulic Flanges", 55, 450);
      ctx.fillText("7307", 380, 450);
      ctx.fillText("5", 480, 450);
      ctx.fillText("2,000.00", 560, 450);
      ctx.fillText("18%", 660, 450);
      ctx.fillText("10,000.00", 760, 450);

      // Bottom Summary
      const boxY = 540;
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(500, boxY, 360, 180);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(500, boxY, 360, 180);

      ctx.fillStyle = "#334155";
      ctx.font = "14px sans-serif";
      ctx.fillText("Taxable Subtotal:", 520, boxY + 35);
      ctx.fillText("₹ 10,000.00", 740, boxY + 35);

      ctx.fillText("CGST (9%):", 520, boxY + 70);
      ctx.fillText("₹ 900.00", 740, boxY + 70);

      ctx.fillText("SGST (9%):", 520, boxY + 105);
      ctx.fillText("₹ 900.00", 740, boxY + 105);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("Invoice Total:", 520, boxY + 150);
      ctx.fillText("₹ 11,800.00", 740, boxY + 150);

      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Could not create image blob");
        const sampleFile = new File([blob], "sample_vendor_bill.png", {
          type: "image/png",
        });
        handleFileSelect(sampleFile);
      }, "image/png");
    } catch (err: any) {
      console.error("Failed to generate demo sample bill:", err);
      toast.error("Could not generate demo sample bill");
    }
  };

  // Filter & Search
  const filtered = purchases.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.invoiceNumber.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q) ||
      (p.supplierGstin || "").toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      p.paymentStatus.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const totalPurchases = purchases.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalITC = purchases
    .filter(
      (p) =>
        p.itcEligibility === "eligible" || p.itcEligibility === "capital_goods"
    )
    .reduce((acc, p) => acc + (p.cgst + p.sgst + p.igst + p.cess), 0);
  const pendingPayables = purchases
    .filter((p) => p.paymentStatus !== "Paid")
    .reduce((acc, p) => acc + (p.total || 0), 0);

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length === 1) handleFileSelect(files[0]);
        else if (files.length > 1) startBatchUpload(files);
      }}
    >
      <Header />

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={onFileInputChange}
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
      <input
        ref={modalFileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleConfirmSingleUpload(f);
          }
          e.target.value = "";
        }}
      />
      <input
        ref={modalCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            handleConfirmSingleUpload(f);
          }
          e.target.value = "";
        }}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-5">
        {/* Title & Primary Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs shrink-0">
              <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-extrabold tracking-tight truncate">
                Purchase Bills
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                AI OCR auto-extracts vendor bills, checks Section 16(2) duplicates, and claims ITC.
              </p>
            </div>
          </div>

          {/* Mobile Actions: Just 2 clear buttons */}
          <div className="flex sm:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200/80 dark:border-indigo-800 shadow-2xs active:scale-95 transition"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Draft</span>
            </button>
          </div>

          {/* Desktop Actions */}
          <div className="hidden sm:flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={loadDemoSampleBill}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 transition cursor-pointer"
              title="Try sample vendor bill OCR extraction with 1-click"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Bill OCR</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs transition cursor-pointer"
              title="Snap physical vendor bill using camera"
            >
              <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs transition cursor-pointer"
              title="Upload vendor bill image or PDF for AI OCR extraction"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Scan Bill (AI OCR)</span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bill</span>
            </button>
          </div>
        </div>

        {/* AI Auto OCR Interactive Drag & Drop Banner - Hidden on mobile */}
        <div
          className={`hidden md:flex p-4 rounded-3xl border-2 border-dashed transition-all flex-wrap items-center justify-between gap-4 ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 scale-[1.01]"
              : "border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>AI Auto OCR for Purchase & Vendor Bills</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-blue-500 text-white uppercase tracking-wide">
                  Gemini 2.5
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Drop single or batch bills (PDF / PNG / JPG) or snap with camera. Auto-extracts Supplier GSTIN, Bill No, Dates, Items & Tax.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Camera</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Browse Bills</span>
            </button>
          </div>
        </div>

        {/* Mobile Compact KPI Strip (block md:hidden) */}
        <div className="grid grid-cols-3 gap-2 md:hidden">
          <div className="bg-white dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Purchases
            </span>
            <span className="text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums block mt-0.5 truncate">
              {formatINR(totalPurchases)}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Eligible ITC
            </span>
            <span className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5 truncate">
              {formatINR(totalITC)}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Unpaid
            </span>
            <span className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums block mt-0.5 truncate">
              {formatINR(pendingPayables)}
            </span>
          </div>
        </div>

        {/* Desktop Summary Cards (hidden md:grid) */}
        <div className="hidden md:grid grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Inward Purchases</span>
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <ShoppingCart className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {formatINR(totalPurchases)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {purchases.length} bills recorded
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Eligible Input Tax Credit (ITC)</span>
              <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
              {formatINR(totalITC)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Available for set-off in GSTR-3B Table 4
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Unpaid Vendor Payables</span>
              <span className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl">
                <CreditCard className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-2">
              {formatINR(pendingPayables)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Pending supplier dues to clear
            </p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by bill number, vendor name or GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl text-xs font-semibold">
            {(["all", "Paid", "Unpaid", "Partial"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-xl capitalize transition-all cursor-pointer ${
                  statusFilter === s
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {s === "all" ? "All Bills" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4 px-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No purchase bills found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {search || statusFilter !== "all"
                  ? "No bills match your search criteria. Try modifying your filters."
                  : "Scan vendor purchase bills with AI OCR to automatically extract GSTINs, compute eligible ITC, and update inventory stock."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-2xl shadow-sm transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  Scan Bill (AI OCR)
                </button>
                <button
                  type="button"
                  onClick={loadDemoSampleBill}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Try Demo Bill
                </button>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Record Manually
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card List (block md:hidden) */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 space-y-2.5 active:bg-slate-50 dark:active:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => openEditModal(p)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {p.supplierName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                          <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                            {p.invoiceNumber}
                          </span>
                          <span>•</span>
                          <span>{p.date}</span>
                        </div>
                        {p.supplierGstin && (
                          <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 uppercase mt-0.5">
                            {p.supplierGstin}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-sm text-slate-900 dark:text-white tabular-nums">
                          {formatINR(p.total)}
                        </div>
                        <span
                          className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                            p.paymentStatus === "Paid"
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60"
                              : "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200/60"
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          p.itcEligibility === "eligible" ||
                          p.itcEligibility === "capital_goods"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
                        }`}
                      >
                        {p.itcEligibility === "eligible" ? "Eligible ITC" : p.itcEligibility}
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.invoiceNumber)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Full Table (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Bill No</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Supplier</th>
                      <th className="py-3.5 px-4">ITC Claim</th>
                      <th className="py-3.5 px-4">Taxable Val</th>
                      <th className="py-3.5 px-4">Total Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {p.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {p.date}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          <div>{p.supplierName}</div>
                          {p.supplierGstin && (
                            <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 uppercase">
                              {p.supplierGstin}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                              p.itcEligibility === "eligible" ||
                              p.itcEligibility === "capital_goods"
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                                : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
                            }`}
                          >
                            {p.itcEligibility === "eligible"
                              ? "Eligible ITC"
                              : p.itcEligibility}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                          {formatINR(p.taxableAmount)}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black tabular-nums text-slate-900 dark:text-white">
                          {formatINR(p.total)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                              p.paymentStatus === "Paid"
                                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                                : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
                            }`}
                          >
                            {p.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-xl transition cursor-pointer"
                              title="Edit Purchase Bill"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.invoiceNumber)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Preview & Confirmation Modal */}
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
          onConfirm={handleConfirmSingleUpload}
        />
      )}

      {/* AI OCR Processing Animation Modal */}
      {isUploading && <UploadingModal />}

      {/* Enterprise Batch Upload Modal */}
      <BatchUploadModal
        isOpen={showBatchModal}
        items={batchItems}
        summary={batchSummary}
        onClose={() => setShowBatchModal(false)}
        onRetryFailed={handleRetryFailedBatch}
      />

      {/* Add / Edit Purchase Bill Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {editingId
                        ? `Edit Purchase Bill (${invoiceNumber || "Draft"})`
                        : "Record Vendor Purchase Bill"}
                    </span>
                    {isOcrPopulated && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 to-blue-500 text-white uppercase tracking-wide flex items-center gap-1 shadow-xs">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        AI Extracted
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Input Tax Credit (ITC) claim for GSTR-3B Table 4 & automatic inventory update
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In-Modal Section 16(2) Duplicate Warning Banner */}
            {duplicateWarning && (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 rounded-2xl flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Statutory Duplicate Warning (Section 16(2))
                  </p>
                  <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                    {duplicateWarning}
                  </p>
                </div>
              </div>
            )}

            {/* In-Modal AI OCR Quick-Scan Bar */}
            <div className="p-3 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>Auto-fill form with AI OCR</span>
                    {isOcrPopulated && (
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-extrabold">
                        ✓ Extracted
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                    Upload or snap vendor bill to auto-populate supplier, GSTIN, bill number & items
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => modalCameraRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => modalFileRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Bill</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Invoice No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="INV/2026/001"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e: any) => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid (Credit)</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>

                {/* Supplier GSTIN with Instant Auto-Fill */}
                <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Supplier GSTIN (15 Digits)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleGstLookup()}
                      disabled={
                        isFetchingGst ||
                        !supplierGstin ||
                        supplierGstin.length < 15
                      }
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                    >
                      {isFetchingGst ? (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          Fetching Supplier...
                        </span>
                      ) : (
                        "Auto-Fill from GST Portal"
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={supplierGstin}
                    onChange={(e) => {
                      const val = e.target.value
                        .toUpperCase()
                        .replace(/[^0-9A-Z]/g, "");
                      setSupplierGstin(val);
                      if (val.length === 15) {
                        handleGstLookup(val);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {gstVerified && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 shrink-0" />
                      Verified Supplier:{" "}
                      {gstVerified.trade_name || gstVerified.legal_name} (
                      {gstVerified.status || "Active"})
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Supplier / Vendor Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vendor Business Name"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ITC Eligibility (GSTR-3B Table 4)
                  </label>
                  <select
                    value={itcEligibility}
                    onChange={(e: any) => setItcEligibility(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="eligible">All Other ITC (Eligible)</option>
                    <option value="capital_goods">Capital Goods (Eligible)</option>
                    <option value="ineligible_17_5">
                      Ineligible (Section 17(5) Blocked)
                    </option>
                    <option value="ineligible_other">Ineligible (Other)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="interstate"
                    checked={interstate}
                    onChange={(e) => setInterstate(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label
                    htmlFor="interstate"
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Interstate Supply (Charge IGST)
                  </label>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Purchased Items
                  </h4>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 items-center"
                    >
                      <div className="col-span-4">
                        <input
                          type="text"
                          required
                          placeholder="Item name"
                          value={it.name}
                          onChange={(e) =>
                            updateItem(idx, "name", e.target.value)
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="0.01"
                          step="0.01"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Rate ₹"
                          min="0"
                          step="0.01"
                          value={it.rate}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "rate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={it.taxPercent}
                          onChange={(e) =>
                            updateItem(
                              idx,
                              "taxPercent",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}% GST
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Calculation Summary */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Taxable Subtotal
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                    {formatINR(calcTotals.taxableAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    GST Total (ITC)
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatINR(
                      calcTotals.cgst +
                        calcTotals.sgst +
                        calcTotals.igst +
                        calcTotals.cess
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Grand Total
                  </span>
                  <span className="font-mono font-black text-base text-slate-900 dark:text-white tabular-nums">
                    {formatINR(calcTotals.total)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
                >
                  {editingId ? "Update Purchase Bill" : "Record Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
