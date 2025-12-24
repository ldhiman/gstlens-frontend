"use client";

import { useState, useRef, useEffect } from "react";
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
  Image as ImageIcon,
  File as FileIcon,
  Loader2,
} from "lucide-react";

import { SYNC_EVENT } from "@/lib/constants";
import { uploadInvoice, fetchGSTInfo } from "@/lib/api";
import InvoiceReviewModal from "@/components/InvoiceReviewModal";
import { getAPPSettings, getSettings } from "@/lib/settings";
import { saveInvoiceDraft, getAllInvoices, deleteInvoice } from "@/lib/storage";
import UploadingModal from "@/components/UploadingModal";
import EditInvoiceModal from "@/components/InvoiceEditModal";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useAuth } from "@/context/AuthContext";
import {
  performCloudSync,
  startBackgroundSync,
  stopBackgroundSync,
} from "@/lib/sync";

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

/* ---------------- New Preview Modal ---------------- */

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
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center">
        <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 w-full md:max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Preview & Upload
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center">
            {isImage && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            )}
            {isPdf && (
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-xl"
                title="PDF Preview"
              />
            )}
            {!isImage && !isPdf && (
              <div className="text-center text-gray-500">
                <FileIcon className="w-16 h-16 mx-auto mb-2" />
                <p>Preview not available for this file type</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              File: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>

            {isCompressing && (
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Compressing image...
              </div>
            )}

            <button
              disabled={isCompressing}
              onClick={() => onConfirm(file)}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-98 transition-all disabled:opacity-70"
            >
              <Upload className="w-5 h-5" />
              {isCompressing ? "Compressing..." : "Upload Invoice"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Helper: Compress Image ---------------- */

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= 1 * 1024 * 1024) {
    return file; // No compression needed
  }

  // Simple canvas-based compression with iterative quality reduction
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.src = URL.createObjectURL(file);

  await new Promise((resolve) => (img.onload = resolve));

  // Optional: resize if very large (e.g., > 3000px)
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
    if (blob && blob.size <= 1 * 1024 * 1024) {
      break;
    }
    quality -= 0.1;
  }

  if (!blob || blob.size > 1 * 1024 * 1024) {
    // Fallback: lowest quality
    blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), file.type, 0.3)
    );
  }

  URL.revokeObjectURL(img.src);

  return new File([blob!], file.name, { type: file.type });
}

/* ---------------- Component ---------------- */

export default function Home() {
  const [invoices, setInvoices] = useState<InvoiceUI[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviewInvoice, setReviewInvoice] = useState<any>(null);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  // New states for preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isCompressing, setIsCompressing] = useState(false);

  const router = useRouter();

  const uploadRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const { user, userProfile } = useAuth();
  const pageRouter = useRouter();

  useEffect(() => {
    const isSubscribed = Boolean(user && userProfile?.subscription?.active);

    if (isSubscribed) {
      startBackgroundSync(true, 120000); // 2 Minute
    } else {
      console.log("No active subscription — background sync disabled");
      stopBackgroundSync();
    }

    return () => stopBackgroundSync();
  }, [user, userProfile]);

  useEffect(() => {
    if (!user) return;
    if (!userProfile) return;

    if (!userProfile.primary_gstin) {
      pageRouter.replace("/profile?require=gstin");
    }
  }, [user, userProfile, pageRouter]);

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    function handleSyncComplete() {
      loadInvoices(); // reload from IndexedDB
    }

    window.addEventListener(SYNC_EVENT, handleSyncComplete);

    return () => {
      window.removeEventListener(SYNC_EVENT, handleSyncComplete);
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

  /* -------- File selection handler -------- */

  async function handleFileSelect(file: File) {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setShowUploadSheet(false);
    setMenuOpen(false);
  }

  /* -------- Confirm upload from preview -------- */

  async function handleConfirmUpload(originalFile: File) {
    let fileToUpload = originalFile;

    if (
      originalFile.type.startsWith("image/") &&
      originalFile.size > 1 * 1024 * 1024
    ) {
      setIsCompressing(true);
      try {
        fileToUpload = await compressImageIfNeeded(originalFile);
        setPreviewUrl(URL.createObjectURL(fileToUpload));
        setSelectedFile(fileToUpload);
      } catch (err) {
        console.error("Compression failed", err);
        alert("Compression failed, uploading original");
      } finally {
        setIsCompressing(false);
      }
    }

    // Close preview
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");

    // Proceed to actual upload
    await handleUpload(fileToUpload);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = "";
  }

  /* -------- Upload handler -------- */

  async function handleUpload(file: File) {
    setIsUploading(true);

    try {
      const res = await uploadInvoice(file);
      const settings = getAPPSettings();
      const data = res.data;
      let seller_gstin_info = null;
      if (data.seller_gstin) {
        seller_gstin_info = (await fetchGSTInfo(data.seller_gstin)).data;
      }

      let buyer_gstin_info = null;
      if (data.buyer_gstin) {
        buyer_gstin_info = (await fetchGSTInfo(data.buyer_gstin)).data;
      }

      data.seller_gstin_info = seller_gstin_info ?? undefined;
      data.buyer_gstin_info = buyer_gstin_info ?? undefined;

      if (settings.autoSave) {
        await saveInvoiceDraft(data, "auto_saved");
        await loadInvoices();
      } else {
        await saveInvoiceDraft(data, "draft");
        setReviewInvoice(data);
      }

      const isSubscribed = Boolean(user && userProfile?.subscription?.active);

      if (isSubscribed) {
        performCloudSync();
      }
    } catch (error: any) {
      console.error("Upload failed", error);
      alert(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <Header />
      {/* Stats */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total Invoices"
            value={invoices.length}
            icon={<FileText className="w-6 h-6" />}
            gradient="from-blue-500 to-indigo-600"
            bgGradient="from-blue-50 to-indigo-50"
          />
          <StatCard
            title="Total Amount"
            value={`₹${invoices
              .reduce((s, i) => s + Number(i.amount), 0)
              .toFixed(2)}`}
            icon={<DollarSign className="w-6 h-6" />}
            gradient="from-emerald-500 to-teal-600"
            bgGradient="from-emerald-50 to-teal-50"
          />
          <div className="hidden md:block">
            <StatCard
              title="Total GST"
              value={`₹${invoices
                .reduce((s, i) => s + Number(i.gst), 0)
                .toFixed(2)}`}
              icon={<TrendingUp className="w-6 h-6" />}
              gradient="from-violet-500 to-purple-600"
              bgGradient="from-violet-50 to-purple-50"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <ActionCard
            title="Generate GSTR-1"
            description="Outward supplies return"
            icon={<FileText className="w-6 h-6" />}
            gradient="from-blue-600 to-indigo-600"
            onClick={() => router.push("/gstr-1")}
          />

          <ActionCard
            title="Generate GSTR-3B"
            description="Monthly summary return"
            icon={<FileText className="w-6 h-6" />}
            gradient="from-violet-600 to-purple-600"
            onClick={() => router.push("/gstr-3b")}
          />
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          {invoices.length === 0 ? (
            <EmptyState onClick={() => setShowUploadSheet(true)} />
          ) : (
            invoices.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                onClick={() => setReviewInvoice(inv.raw)}
              />
            ))
          )}
        </div>
      </main>

      {/* Floating Menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* FAB */}
      <button
        onClick={() => setShowUploadSheet(true)}
        className="fixed bottom-5 right-5 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-50"
      >
        <Upload />
      </button>

      {showUploadSheet && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowUploadSheet(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center">
            <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 pb-8 w-full md:w-96 shadow-2xl animate-slide-up">
              <div className="flex justify-center mb-4 md:hidden">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  Upload Invoice
                </h3>
                <button
                  onClick={() => setShowUploadSheet(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 hover:shadow-xl active:scale-98 transition-all"
                  onClick={() => uploadRef.current?.click()}
                >
                  <Upload className="w-5 h-5" />
                  Upload from Device
                </button>

                <button
                  className="w-full py-4 bg-white border-2 border-gray-200 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 active:scale-98 transition-all"
                  onClick={() => captureRef.current?.click()}
                >
                  <Camera className="w-5 h-5 text-gray-700" />
                  Take Photo
                </button>
              </div>

              <p className="text-xs text-center text-gray-500 mt-4">
                Supports images and PDF files
              </p>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* Hidden Inputs */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*,application/pdf"
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

      {/* Preview Modal */}
      {selectedFile && previewUrl && (
        <FilePreviewModal
          file={selectedFile}
          previewUrl={previewUrl}
          isCompressing={isCompressing}
          onClose={() => {
            setSelectedFile(null);
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl("");
          }}
          onConfirm={handleConfirmUpload}
        />
      )}

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

/* ---------------- Small Components (unchanged) ---------------- */

function StatCard({ title, value, icon, gradient, bgGradient }: any) {
  return (
    <div
      className={`bg-gradient-to-br ${bgGradient} rounded-3xl p-6 border border-gray-100 shadow-lg transform hover:scale-105 transition-transform`}
    >
      <div
        className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}
      >
        {icon}
      </div>
      <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function ActionCard({ title, description, icon, gradient, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all active:scale-98 text-left group"
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}
        >
          {icon}
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </button>
  );
}

function EmptyState({ onClick }: any) {
  return (
    <div className="py-16 px-6 text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FileText className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">No Invoices Yet</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Start by uploading your first invoice to automatically extract GST
        details
      </p>
      <button
        onClick={onClick}
        className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl active:scale-98 transition-all"
      >
        Upload Invoice
      </button>
    </div>
  );
}

function InvoiceRow({ invoice, onClick }: any) {
  const isConfirmed = invoice.status === "confirmed";
  const isSynced = invoice.synced_to_cloud;

  return (
    <button
      onClick={onClick}
      className="w-full p-5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 text-left group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
            <FileCheckCorner className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {invoice.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">{invoice.date}</p>

            <div className="flex items-center gap-4 mt-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isConfirmed
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConfirmed ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
                {isConfirmed ? "Confirmed" : "Auto Saved"}
              </span>

              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSynced
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-500"
                }`}
                title={isSynced ? "Synced to cloud" : "Not synced yet"}
              >
                {isSynced ? (
                  <Cloud className="w-4 h-4" />
                ) : (
                  <CloudOff className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isSynced ? "Synced" : "Local"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-gray-900">
            ₹{parseFloat(invoice.amount).toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            GST ₹{parseFloat(invoice.gst).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </button>
  );
}
