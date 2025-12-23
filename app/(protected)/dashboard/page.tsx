"use client";

import { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  DollarSign,
  TrendingUp,
  Camera,
  ChevronRight,
  Receipt,
  X,
  Cloud,
  CloudOff,
  FileCheckCorner,
} from "lucide-react";

import { SYNC_EVENT } from "@/lib/constants";
import { uploadInvoice, fetchGSTInfo } from "@/lib/api";
import InvoiceReviewModal from "@/components/InvoiceReviewModal";
import { getSettings } from "@/lib/settings";
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

/* ---------------- Component ---------------- */

export default function Home() {
  const [invoices, setInvoices] = useState<InvoiceUI[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviewInvoice, setReviewInvoice] = useState<any>(null);
  const [editInvoice, setEditInvoice] = useState<any>(null);
  const [showUploadSheet, setShowUploadSheet] = useState(false);

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

  /* -------- Load stored invoices on mount -------- */
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

  /* -------- Upload handler -------- */

  async function handleUpload(file: File) {
    setIsUploading(true);
    setShowUploadSheet(false);
    setMenuOpen(false);

    try {
      const res = await uploadInvoice(file);
      const settings = getSettings();
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

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      alert("No image captured");
      return;
    }
    console.log("Captured file:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    handleUpload(file);
    e.target.value = "";
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
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @media (min-width: 768px) {
          .animate-fade-in {
            animation: fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
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

      {reviewInvoice && (
        <InvoiceReviewModal
          isNew={!reviewInvoice._local_id}
          invoice={reviewInvoice}
          onClose={() => setReviewInvoice(null)}
          onEdit={() => {
            setEditInvoice(reviewInvoice); // 🔥 open edit modal
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
            setReviewInvoice(updatedInvoice); // 🔁 return to review
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Small Components ---------------- */

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
        {/* Left: Icon + Details */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Invoice Icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
            <FileCheckCorner className="w-6 h-6 text-white" />
          </div>

          {/* Text Details */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {invoice.name}
            </p>
            <p className="text-sm text-gray-500 mt-1">{invoice.date}</p>

            {/* Status + Sync Row */}
            <div className="flex items-center gap-4 mt-3">
              {/* Status Badge */}
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

              {/* Sync Status - Icon Only */}
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

        {/* Right: Amount */}
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-bold text-gray-900">
            ₹{parseFloat(invoice.amount).toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            GST ₹{parseFloat(invoice.gst).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Chevron - appears on hover */}
      <div className="flex justify-end mt-4">
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </button>
  );
}
