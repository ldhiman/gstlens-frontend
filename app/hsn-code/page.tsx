"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Tag,
  Package,
  ArrowRight,
  Copy,
} from "lucide-react";
import { POPULAR_HSN_SAC_CODES, searchHsnSac, HsnSacItem } from "@/lib/hsnData";
import { Header } from "@/components/header";
import toast from "react-hot-toast";

const CATEGORIES = [
  "All",
  "Professional & IT",
  "Electronics & Tech",
  "Apparel & Textiles",
  "Food & Agriculture",
  "Healthcare & Pharma",
  "Construction & Hardware",
  "Automobiles & Parts",
  "Transport & Logistics",
  "Food & Hospitality",
  "Jewellery & Metals",
];

function HsnDirectoryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "HSN" | "SAC">("ALL");
  const [rateFilter, setRateFilter] = useState<string>("ALL");

  const filteredItems = useMemo(() => {
    let list = searchHsnSac(query, selectedCategory);

    if (typeFilter !== "ALL") {
      list = list.filter((item) => item.type === typeFilter);
    }

    if (rateFilter !== "ALL") {
      const targetRate = Number(rateFilter);
      list = list.filter((item) => item.gstRate === targetRate);
    }

    return list;
  }, [query, selectedCategory, typeFilter, rateFilter]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied code ${code} to clipboard`);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Title & SEO Header */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 mb-3">
          <Tag className="w-3.5 h-3.5" />
          <span>Official CBIC Rates Database</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
          HSN & SAC Code Directory
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
          Search Harmonized System of Nomenclature (HSN) and Services Accounting Codes (SAC). Find statutory GST slabs (0%, 5%, 12%, 18%, 28%) for invoices.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code (e.g. 8471, 998311) or description (e.g. laptop, consulting, cotton)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 shadow-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-hidden focus:ring-1 focus:ring-[#047857] text-sm font-normal"
          />
        </div>
      </div>

      {/* Filters: Category, Type, Slabs */}
      <div className="space-y-3 mb-8">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-[#047857] text-white shadow-xs"
                  : "bg-white dark:bg-[#1a1a1c] text-stone-600 dark:text-stone-400 border border-stone-200/80 dark:border-stone-800 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary filters: Type and Rate */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/60 p-1 rounded-lg border border-stone-200/60 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setTypeFilter("ALL")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                typeFilter === "ALL"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200 dark:border-stone-700/60"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              All types
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("HSN")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                typeFilter === "HSN"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200 dark:border-stone-700/60"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              HSN (Goods)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("SAC")}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                typeFilter === "SAC"
                  ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200 dark:border-stone-700/60"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              SAC (Services)
            </button>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/60 p-1 rounded-lg border border-stone-200/60 dark:border-stone-800">
            <span className="px-2 text-stone-400 font-mono text-[11px]">Slab:</span>
            {["ALL", "0", "5", "12", "18", "28"].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setRateFilter(rate)}
                className={`px-2 py-0.5 rounded-md font-mono text-xs transition ${
                  rateFilter === rate
                    ? "bg-[#047857] text-white shadow-xs"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                {rate === "ALL" ? "All" : `${rate}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400 mb-4 px-1">
        <span>Showing {filteredItems.length} code{filteredItems.length === 1 ? "" : "s"}</span>
        <span>Click code to copy</span>
      </div>

      {/* Code List Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl p-12 text-center border border-stone-200/80 dark:border-stone-800 space-y-3">
          <Package className="w-8 h-8 text-stone-400 mx-auto" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">No matching HSN or SAC code found</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try searching with broader terms or clear category filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedCategory("All");
              setTypeFilter("ALL");
              setRateFilter("ALL");
            }}
            className="px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium text-xs"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.code}
              className="bg-white dark:bg-[#1a1a1c] rounded-xl p-4 sm:p-5 border border-stone-200/80 dark:border-stone-800 shadow-xs hover:border-stone-300 dark:hover:border-stone-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyCode(item.code)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 font-mono text-xs font-semibold tracking-wide transition"
                      title="Click to copy"
                    >
                      <span>{item.code}</span>
                      <Copy className="w-3 h-3 text-stone-400" />
                    </button>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                      {item.type}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-medium ${
                    item.gstRate === 0
                      ? "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                      : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                  }`}>
                    {item.gstRate}% GST
                  </span>
                </div>

                <h3 className="font-medium text-stone-900 dark:text-stone-100 text-sm leading-snug">
                  {item.description}
                </h3>
                {item.details && (
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                    {item.details}
                  </p>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-400 text-[11px]">
                  {item.category}
                </span>

                <Link
                  href={`/free-invoice-generator`}
                  className="inline-flex items-center gap-1 font-medium text-[#047857] dark:text-emerald-400 hover:underline"
                >
                  <span>Use in invoice</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function HsnDirectoryPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 transition-colors">
      <Header />
      <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-16 text-center text-stone-500">Loading HSN database...</div>}>
        <HsnDirectoryContent />
      </Suspense>
    </div>
  );
}
