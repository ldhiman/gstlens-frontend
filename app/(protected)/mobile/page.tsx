"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getAllInvoices,
  getAllPurchases,
  getBusinessProfile,
  PurchaseBill,
  BusinessProfile,
} from "@/lib/storage";
import { formatINR } from "@/lib/currency";
import {
  extractInvoiceTotal,
  extractInvoiceTaxable,
  extractInvoiceTax,
  extractCustomerName,
} from "@/lib/gstBillingEngine";

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

export default function MobileDashboardPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [invoices, setInvoices] = useState<InvoiceUI[]>([]);
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [activeTab, setActiveTab] = useState<"sales" | "purchases">("sales");
  const [searchQuery, setSearchQuery] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);

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

  // Load business profile and data
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
      setPurchases(purList.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
    } catch (err) {
      console.error("Failed to load mobile data:", err);
    }
  }

  // Financial calculations
  const totalSales = invoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalTax = invoices.reduce((s, i) => s + (Number(i.gst) || 0), 0);
  const totalPurchases = purchases.reduce(
    (s, p) => s + (Number(p.total) || 0),
    0
  );
  const totalITC = purchases.reduce(
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
    (userProfile?.subscription?.active && (
      userProfile?.subscription?.unlimited_credits === true ||
      userProfile?.subscription?.unlimited_credits === "true" ||
      userProfile?.subscription?.plan?.toLowerCase().includes("unlimited")
    ))
  );

  // Filtered lists
  const filteredInvoices = invoices.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (i.name || "").toLowerCase().includes(q) ||
      (i.raw?.invoice_number || "").toLowerCase().includes(q) ||
      (extractCustomerName(i.raw) || "").toLowerCase().includes(q)
    );
  });

  const filteredPurchases = purchases.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.invoiceNumber || "").toLowerCase().includes(q) ||
      (p.supplierName || "").toLowerCase().includes(q) ||
      (p.supplierGstin || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28">
      {/* Hidden file inputs */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={() => router.push("/purchases")}
      />
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={() => router.push("/purchases")}
      />

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-slate-900 dark:text-white truncate">
              {profile?.tradeName || profile?.businessName || "GSTLens Mobile"}
            </h1>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              {profile?.gstin || "GST Billing & Tax"}
            </p>
          </div>
        </div>

        {/* Scan Credits Pill */}
        <Link
          href="/credits"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold shrink-0"
        >
          <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
          <span className="font-mono tabular-nums">
            {isUnlimited ? "∞ Unlimited" : `${userProfile?.credits || 0} scans`}
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* 1. Vyapar-Style 2x2 Metric Summary Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Sales */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Sales</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {formatINR(totalSales)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
            </p>
          </div>

          {/* Purchases */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Purchases</span>
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-black font-mono text-slate-900 dark:text-white tabular-nums">
              {formatINR(totalPurchases)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {purchases.length} {purchases.length === 1 ? "bill" : "bills"}
            </p>
          </div>

          {/* Tax to Pay */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Tax to Pay</span>
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {formatINR(netGstPayable)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Net GSTR-3B</p>
          </div>

          {/* Tax Credit (ITC) */}
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Tax Saved</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatINR(totalITC)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Eligible ITC</p>
          </div>
        </div>

        {/* 2. Quick Navigation Shortcuts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <Link
            href="/gstr-3b"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-200 shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Tax Summary</span>
          </Link>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-200 shrink-0"
          >
            <span>Parties ({profile?.gstin ? "Active" : "List"})</span>
          </Link>
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-200 shrink-0"
          >
            <span>Items & Stock</span>
          </Link>
          <Link
            href="/expenses"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-200 shrink-0"
          >
            <span>Expenses</span>
          </Link>
        </div>

        {/* 3. Transaction Register (Vyapar Tabbed Style) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Tabs: Sales vs Purchases */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("sales")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === "sales"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-500"
                }`}
              >
                Sales ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("purchases")}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === "purchases"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold"
                    : "text-slate-500"
                }`}
              >
                Purchases ({purchases.length})
              </button>
            </div>

            <Link
              href={activeTab === "sales" ? "/invoices" : "/purchases"}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <span>All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${activeTab === "sales" ? "invoices or customer..." : "bills or vendor..."}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Transaction List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {activeTab === "sales" ? (
              filteredInvoices.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p>No sales invoices recorded yet.</p>
                  <Link
                    href="/invoices/new"
                    className="mt-2 inline-block text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    + Create First Invoice
                  </Link>
                </div>
              ) : (
                filteredInvoices.slice(0, 8).map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices`}
                    className="p-3 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-800 transition block"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {inv.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {inv.raw?.invoice_type || "B2B"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {extractCustomerName(inv.raw) || "Direct Customer"}
                        {inv.date ? ` • ${inv.date}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-xs text-slate-900 dark:text-white tabular-nums">
                        {formatINR(inv.amount)}
                      </p>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {inv.status === "confirmed" ? "Confirmed" : "Draft"}
                      </span>
                    </div>
                  </Link>
                ))
              )
            ) : filteredPurchases.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p>No purchase bills recorded yet.</p>
                <button
                  onClick={() => router.push("/purchases")}
                  className="mt-2 inline-block text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  📸 Scan First Bill
                </button>
              </div>
            ) : (
              filteredPurchases.slice(0, 8).map((p) => (
                <Link
                  key={p.id}
                  href="/purchases"
                  className="p-3 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-800 transition block"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {p.invoiceNumber}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {p.supplierName}
                      {p.date ? ` • ${p.date}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-xs text-slate-900 dark:text-white tabular-nums">
                      {formatINR(p.total)}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      ITC: {formatINR(p.cgst + p.sgst + p.igst)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Sticky Bottom Action Bar (Fixed Thumb Actions) */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-3 z-40">
        <div className="max-w-lg mx-auto grid grid-cols-2 gap-2.5">
          <Link
            href="/invoices/new"
            className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Sale</span>
          </Link>
          <button
            type="button"
            onClick={() => router.push("/purchases")}
            className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>📸 Scan Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
}
