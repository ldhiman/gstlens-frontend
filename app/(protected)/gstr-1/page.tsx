"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  Building2,
  ChevronDown,
  CheckCircle2,
  Copy,
  Loader2,
} from "lucide-react";

import { getAllInvoices } from "@/lib/storage";
import { generateGSTR1JSON } from "@/lib/gstr1";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function GSTR1Page() {
  const router = useRouter();
  const { userProfile } = useAuth();

  const sellerGSTIN = userProfile?.primary_gstin;

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showJSON, setShowJSON] = useState(false);
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
  const invoicesForGSTR1 = useMemo(() => {
    if (!sellerGSTIN) return [];
    return allInvoices.filter((inv) => inv?.data?.seller_gstin === sellerGSTIN);
  }, [allInvoices, sellerGSTIN]);

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
      const json = generateGSTR1JSON(sellerGSTIN, fp, invoicesForGSTR1);
      setPreview(json);
      setGenerating(false);
      setShowJSON(false);
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
    a.download = `GSTR1_${sellerGSTIN}_${preview.fp}.json`;
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

  // Default to previous month
  useEffect(() => {
    if (!month && !year) {
      const prev = new Date();
      prev.setMonth(prev.getMonth() - 1);
      setMonth(String(prev.getMonth() + 1).padStart(2, "0"));
      setYear(String(prev.getFullYear()));
    }
  }, []);

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 pb-24 md:pb-0">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 border-b border-white/50 bg-white/90 backdrop-blur-xl">
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              GSTR-1 Return
            </h1>
            <p className="text-xs text-gray-600 truncate">
              {sellerGSTIN || "Loading GSTIN..."}
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 text-black py-6 space-y-6 max-w-2xl mx-auto">
        {/* Period Selector Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="w-6 h-6 text-indigo-600" />
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
                className="w-full px-4 py-4 rounded-2xl border border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-base"
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
                className="w-full px-4 py-4 rounded-2xl border border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-base"
              >
                <option value="">Choose year</option>
                {["2023", "2024", "2025", "2026", "2027"].map((y) => (
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
            {/* Summary Stats */}
            <div className="grid grid-cols-1 gap-4">
              <MobileSummaryCard
                label="GSTIN"
                value={preview.gstin}
                icon={<Building2 className="w-5 h-5" />}
              />
              <MobileSummaryCard
                label="Period"
                value={`${monthNames[+month - 1]} ${year}`}
                subtitle={`FP: ${preview.fp}`}
                icon={<Calendar className="w-5 h-5" />}
              />
              <MobileSummaryCard
                label="Total Invoices"
                value={invoicesForGSTR1.length}
                icon={<FileText className="w-5 h-5" />}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white">
                <p className="text-3xl font-bold">{preview.b2b?.length || 0}</p>
                <p className="text-sm mt-1 opacity-90">B2B</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 text-white">
                <p className="text-3xl font-bold">{preview.b2c?.length || 0}</p>
                <p className="text-sm mt-1 opacity-90">B2C</p>
              </div>
            </div>

            {/* JSON Preview */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowJSON(!showJSON)}
                className="w-full px-5 py-5 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-gray-900">
                    View JSON Preview
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 transition-transform ${
                    showJSON ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showJSON && (
                <div className="border-t border-gray-200">
                  <div className="bg-gray-900 p-4 relative">
                    <button
                      onClick={copyJSON}
                      className="absolute top-3 right-3 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 active:scale-95 transition"
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

      {/* Mobile Fixed Bottom Actions */}
      <div className="fixed md:max-w-2xl bottom-0 left-0 right-0 mx-auto rounded-t-md justify-center z-20 bg-white border-t border-gray-200 shadow-2xl md:static md:shadow-none">
        <div className="px-4 py-4 space-y-3">
          <button
            onClick={generatePreview}
            disabled={!month || !year || generating}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-lg active:scale-98 transition-all disabled:opacity-60 flex items-center justify-center gap-3"
          >
            {generating ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate GSTR-1 Preview"
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

/* ---------------- Mobile-Friendly Components ---------------- */
function MobileSummaryCard({ label, value, subtitle, icon }: any) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-indigo-600">{icon}</div>}
      </div>
    </div>
  );
}
