"use client";

import { useEffect, useState } from "react";
import {
  Download,
  Calendar,
  FileCheck,
  Building2,
  DollarSign,
  TrendingUp,
  Loader2,
  Copy,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

import { getAllInvoices } from "@/lib/storage";
import { generateGSTR3BJSON } from "@/lib/gstr3b";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function GSTR3BPage() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const sellerGSTIN = userProfile?.primary_gstin;

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  /* ---------------- Guards ---------------- */
  useEffect(() => {
    if (userProfile && !sellerGSTIN) {
      router.replace("/profile");
    }
  }, [userProfile, sellerGSTIN, router]);

  /* ---------------- Load Invoices ---------------- */
  useEffect(() => {
    if (!sellerGSTIN) return;

    (async () => {
      const data = await getAllInvoices();
      setAllInvoices(data);
    })();
  }, [sellerGSTIN]);

  /* ---------------- Filter Invoices ---------------- */
  const invoicesFor3B = allInvoices.filter(
    (inv) => inv?.data?.seller_gstin === sellerGSTIN
  );

  /* ---------------- Generate Preview ---------------- */
  async function generatePreview() {
    if (!month || !year) {
      alert("Please select both month and year");
      return;
    }

    setGenerating(true);
    setPreview(null);

    setTimeout(() => {
      const fp = `${month}${year}`;
      const json = generateGSTR3BJSON(sellerGSTIN, fp, invoicesFor3B);
      setPreview(json);
      setGenerating(false);
    }, 600);
  }

  /* ---------------- Actions ---------------- */
  function downloadJSON() {
    if (!preview) return;

    const blob = new Blob([JSON.stringify(preview, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR3B_${sellerGSTIN}_${preview.fp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyJSON() {
    if (!preview) return;
    navigator.clipboard.writeText(JSON.stringify(preview, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Default to previous month (common for GSTR-3B filing)
  useEffect(() => {
    if (!month && !year) {
      const prev = new Date();
      prev.setMonth(prev.getMonth() - 1);
      setMonth(String(prev.getMonth() + 1).padStart(2, "0"));
      setYear(String(prev.getFullYear()));
    }
  }, []);

  const periodLabel =
    month && year
      ? `${monthNames[parseInt(month) - 1]} ${year} (${month}${year})`
      : "Select period";

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 pb-24 md:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/90 backdrop-blur-xl">
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <FileCheck className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              GSTR-3B Return
            </h1>
            <p className="text-xs text-gray-600 truncate">
              {sellerGSTIN || "Loading GSTIN..."}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Period Selector Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Select Return Period
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-4 text-black rounded-2xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 text-base"
              >
                <option value="">Choose month</option>
                {monthNames.map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-4 text-black rounded-2xl border border-gray-300 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 text-base"
              >
                <option value="">Choose year</option>
                {["2024", "2025", "2026", "2027"].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {preview && (
          <div className="space-y-6">
            {/* Basic Info Cards */}
            <div className="grid grid-cols-1 gap-4">
              <MobileSummaryCard
                label="GSTIN"
                value={preview.gstin}
                icon={<Building2 className="w-5 h-5" />}
              />
              <MobileSummaryCard
                label="Return Period"
                value={periodLabel}
                icon={<Calendar className="w-5 h-5" />}
              />
            </div>

            {/* Tax Summary */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-5 flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                Tax Liability Summary
              </h3>

              <div className="space-y-4">
                <TaxRow
                  label="Total Taxable Value"
                  value={preview.sup_details?.osup_det?.txval || 0}
                />
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <TaxRow
                    label="IGST"
                    value={preview.sup_details?.osup_det?.igst || 0}
                  />
                  <TaxRow
                    label="CGST"
                    value={preview.sup_details?.osup_det?.cgst || 0}
                  />
                  <TaxRow
                    label="SGST/UTGST"
                    value={preview.sup_details?.osup_det?.sgst || 0}
                  />
                  <TaxRow
                    label="Total Tax Payable"
                    value={
                      (preview.sup_details?.osup_det?.igst || 0) +
                      (preview.sup_details?.osup_det?.cgst || 0) +
                      (preview.sup_details?.osup_det?.sgst || 0)
                    }
                    bold
                  />
                </div>
              </div>
            </div>

            {/* JSON Preview (Collapsible) */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() =>
                  setPreview((p: any) => ({ ...p, showJSON: !p.showJSON }))
                }
                className="w-full px-5 py-5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">
                    View Full JSON
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    preview.showJSON ? "rotate-180" : ""
                  }`}
                />
              </button>

              {preview.showJSON && (
                <div className="border-t border-gray-200">
                  <div className="bg-gray-900 p-4 relative">
                    <button
                      onClick={copyJSON}
                      className="absolute top-3 right-3 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 active:scale-95 transition"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <pre className="text-green-300 text-xs overflow-x-auto pt-12 pb-4 max-h-96">
                      {JSON.stringify(preview, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Actions (Mobile-First) */}
      <div className="fixed md:max-w-2xl bottom-0 left-0 mx-auto right-0 z-20 bg-white border-t border-gray-200 shadow-2xl md:static md:shadow-none">
        <div className="px-4 py-4 space-y-3">
          <button
            onClick={generatePreview}
            disabled={!month || !year || generating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-lg shadow-lg active:scale-98 transition-all disabled:opacity-60 flex items-center justify-center gap-3"
          >
            {generating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate GSTR-3B"
            )}
          </button>

          {preview && (
            <button
              onClick={downloadJSON}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-lg active:scale-98 transition-all flex items-center justify-center gap-3"
            >
              <Download className="w-6 h-6" />
              Download JSON File
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Mobile Components ---------------- */
function MobileSummaryCard({ label, value, icon }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1 truncate">
            {value}
          </p>
        </div>
        {icon && <div className="text-purple-600">{icon}</div>}
      </div>
    </div>
  );
}

function TaxRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  const formatted = Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex justify-between items-center py-2">
      <span className={`text-gray-700 ${bold ? "font-semibold" : ""}`}>
        {label}
      </span>
      <span
        className={`font-bold text-lg ${
          bold ? "text-purple-700" : "text-gray-900"
        }`}
      >
        ₹{formatted}
      </span>
    </div>
  );
}
