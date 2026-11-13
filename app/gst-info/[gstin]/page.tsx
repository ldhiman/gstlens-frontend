type Props = {
  params: Promise<{ gstin: string }>;
};

import Link from "next/link";
import {
  Building2,
  CheckCircle,
  XCircle,
  MapPin,
  FileText,
  Award,
  Shield,
  Hash,
  ArrowLeft,
  Copy,
  ExternalLink,
} from "lucide-react";
import { fetchGSTInfo } from "@/lib/api";
import { Header } from "@/components/header";

/* ---------- Server Fetch ---------- */
async function fetchGSTInfoSSR(gstin: string) {
  try {
    const res = await fetchGSTInfo(gstin);
    if (!res?.data) return null;
    return res.data;
  } catch (e) {
    return null;
  }
}

/* ---------- Page ---------- */
export default async function GSTInfoResultPage({ params }: Props) {
  const resolvedParams = await params;
  const gstin = resolvedParams.gstin.toUpperCase();
  const data = await fetchGSTInfoSSR(gstin);

  const isActive = data && data.status && data.status.toLowerCase().includes("active") && data.legal_name !== "N/A";

  if (!data || data.legal_name === "N/A") {
    return (
      <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 transition-colors">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl p-6 sm:p-8 border border-stone-200/80 dark:border-stone-800 shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
              GSTIN Not Found or Inactive
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
              No active GST registration record was found for <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{gstin}</span>. Please verify the 15-digit number and try again.
            </p>
            <div className="pt-4">
              <Link
                href="/gst-info"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs shadow-sm transition active:scale-95 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Try another GSTIN
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 transition-colors pb-24 md:pb-12">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/gst-info"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#047857] dark:text-stone-400 dark:hover:text-emerald-400 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Search Another GSTIN
          </Link>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
            isActive
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          }`}>
            <CheckCircle className="w-3.5 h-3.5" /> {data.status || (isActive ? "Active" : "Inactive")}
          </span>
        </div>

        {/* Hero Card */}
        <div className="p-6 sm:p-7 bg-white dark:bg-[#1a1a1c] rounded-2xl border border-stone-200/80 dark:border-stone-800 text-stone-900 dark:text-stone-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-mono text-[11px] block">
                Trade Name
              </span>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mt-0.5 text-stone-900 dark:text-stone-100">
                {data.trade_name || data.legal_name}
              </h1>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-white/20 backdrop-blur-md self-start sm:self-auto text-xs font-mono font-bold tracking-wider">
              {data.gstin}
            </div>
          </div>

          <div className="pt-2 border-t border-white/20 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-emerald-200 text-[10px] block">State</span>
              <span className="font-bold">{data.state || "N/A"}</span>
            </div>
            <div>
              <span className="text-emerald-200 text-[10px] block">State Code</span>
              <span className="font-bold font-mono">{data.state_code || gstin.slice(0, 2)}</span>
            </div>
            <div>
              <span className="text-emerald-200 text-[10px] block">PAN Number</span>
              <span className="font-bold font-mono">{data.pan_number || gstin.slice(2, 12)}</span>
            </div>
          </div>
        </div>

        {/* Business Details Card */}
        <div className="bg-white dark:bg-[#1a1a1c] rounded-3xl p-6 border border-stone-200/80 dark:border-stone-800 shadow-sm transition-colors space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
            <Building2 className="w-5 h-5 text-[#047857] dark:text-emerald-400" />
            <h2 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
              Business & Registration Particulars
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoTile label="Legal Name" value={data.legal_name} />
            <InfoTile label="Trade Name" value={data.trade_name} />
            <InfoTile label="Taxpayer Constitution" value={data.constitution || "Proprietorship / Company"} />
            <InfoTile label="PAN Number" value={data.pan_number || gstin.slice(2, 12)} mono />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/dashboard"
            className="flex-1 py-2.5 px-5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white font-semibold text-xs text-center shadow-sm transition active:scale-98 cursor-pointer"
          >
            Create invoice with this GSTIN
          </Link>
          <Link
            href="/gst-info"
            className="flex-1 py-2.5 px-5 rounded-xl bg-white dark:bg-[#1a1a1c] border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold text-xs text-center shadow-xs transition active:scale-98 cursor-pointer"
          >
            Verify another number
          </Link>
        </div>
      </main>
    </div>
  );
}

function InfoTile({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/60/60 border border-stone-100 dark:border-stone-800">
      <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">{label}</p>
      <p className={`text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 mt-1 truncate ${mono ? "font-mono" : ""}`}>
        {value || "-"}
      </p>
    </div>
  );
}
