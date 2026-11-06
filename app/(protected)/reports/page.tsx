"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  FileSpreadsheet,
  Users,
  Package,
  Layers,
  ArrowRight,
  ShoppingCart,
  FileText,
  Boxes,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  getAllInvoices,
  getAllPurchases,
  getAllExpenses,
  getAllProducts,
  getAllClients,
  StoredInvoice,
  PurchaseBill,
  Expense,
  Product,
  Client,
} from "@/lib/storage";
import {
  formatINR,
  getLocalToday,
  extractInvoiceTotal,
  extractInvoiceTaxable,
  extractInvoiceTax,
  extractCustomerName,
  extractBuyerGstin,
} from "@/lib/gstBillingEngine";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseBill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activeReport, setActiveReport] = useState<"pl" | "sales" | "purchases" | "stock">("pl");

  const loadData = async () => {
    try {
      const [invs, purcs, exps, prods, cls] = await Promise.all([
        getAllInvoices(),
        getAllPurchases(),
        getAllExpenses(),
        getAllProducts(),
        getAllClients(),
      ]);
      setInvoices(invs);
      setPurchases(purcs);
      setExpenses(exps);
      setProducts(prods);
      setClients(cls);
    } catch (err: any) {
      toast.error("Failed to load report data: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Only outward sales (exclude purchases that may be flagged as inward)
  const salesInvoices = invoices.filter((inv) => !(inv.data?.is_inward === true));

  // Profit & Loss Aggregations
  const totalSalesRevenue = salesInvoices.reduce((acc, inv) => {
    const data = inv.data || inv || {};
    const grandTotal = extractInvoiceTotal(data);
    let taxable = extractInvoiceTaxable(data);
    if (!taxable && grandTotal > 0) {
      const taxes = extractInvoiceTax(data);
      taxable = taxes > 0 ? Math.max(0, grandTotal - taxes) : grandTotal;
    }
    return acc + taxable;
  }, 0);

  const totalSalesGross = salesInvoices.reduce((acc, inv) => {
    const data = inv.data || inv || {};
    return acc + extractInvoiceTotal(data);
  }, 0);

  const totalPurchasesCost = purchases.reduce(
    (acc, p) => acc + Number(p.taxableAmount || (p.total ? p.total - (p.cgst + p.sgst + p.igst) : 0) || 0),
    0
  );
  const totalOperatingExpenses = expenses.reduce(
    (acc, e) => acc + Number(e.amount || 0),
    0
  );
  const grossProfit = totalSalesRevenue - totalPurchasesCost;
  const netProfit = grossProfit - totalOperatingExpenses;

  // Export CSV Helper
  const handleExportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${getLocalToday()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filename}.csv`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Financial & Audit Reports
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                Statutory sales register, purchase register, P&L statement, and inventory valuation ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Report Segmented Tabs */}
        <div className="flex flex-wrap bg-white dark:bg-slate-800/90 p-1.5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs w-fit text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveReport("pl")}
            className={`px-4 py-2 rounded-2xl transition-all ${
              activeReport === "pl"
                ? "bg-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Profit & Loss Summary
          </button>
          <button
            onClick={() => setActiveReport("sales")}
            className={`px-4 py-2 rounded-2xl transition-all ${
              activeReport === "sales"
                ? "bg-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Sales Register
          </button>
          <button
            onClick={() => setActiveReport("purchases")}
            className={`px-4 py-2 rounded-2xl transition-all ${
              activeReport === "purchases"
                ? "bg-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Purchase Register
          </button>
          <button
            onClick={() => setActiveReport("stock")}
            className={`px-4 py-2 rounded-2xl transition-all ${
              activeReport === "stock"
                ? "bg-indigo-600 text-white shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Stock Valuation
          </button>
        </div>

        {/* ========================================================= */}
        {/* 1. REPORT: Profit & Loss                                  */}
        {/* ========================================================= */}
        {activeReport === "pl" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sales Revenue (Taxable)
                </span>
                <p className="text-2xl font-black font-mono tabular-nums text-indigo-600 dark:text-indigo-400 mt-2">
                  {formatINR(totalSalesRevenue)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Excludes GST output tax</p>
              </div>

              <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Cost of Goods (Purchases)
                </span>
                <p className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-2">
                  {formatINR(totalPurchasesCost)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Direct vendor stock procurement</p>
              </div>

              <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Operating Overheads
                </span>
                <p className="text-2xl font-black font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-2">
                  {formatINR(totalOperatingExpenses)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Rent, utilities, tools, salaries</p>
              </div>

              <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Estimated Net Profit
                </span>
                <p
                  className={`text-2xl font-black font-mono tabular-nums mt-2 ${
                    netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
                  }`}
                >
                  {formatINR(netProfit)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">After direct & indirect overheads</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800/90 p-6 md:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Statement of Profit & Loss (Income Tax Section 44AD / Schedule BP Preview)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Financial figures computed using double-entry matching for the current active period.
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-3 flex justify-between font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">Gross Turnover / Outward Sales Receipts:</span>
                  <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatINR(totalSalesRevenue)}
                  </span>
                </div>
                <div className="py-3 flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Less: Direct Inward Purchase Costs (COGS):</span>
                  <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                    ({formatINR(totalPurchasesCost)})
                  </span>
                </div>
                <div className="py-3 flex justify-between font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/60 px-3 rounded-2xl">
                  <span>Gross Operating Profit:</span>
                  <span className="font-mono font-bold tabular-nums">{formatINR(grossProfit)}</span>
                </div>
                <div className="py-3 flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Less: Business Operating Expenses (Rent, Utilities, Software, Salaries):</span>
                  <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                    ({formatINR(totalOperatingExpenses)})
                  </span>
                </div>
                <div className="py-3.5 flex justify-between font-black text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 px-3.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
                  <span>Estimated Net Business Profit:</span>
                  <span className="font-mono tabular-nums text-base">{formatINR(netProfit)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. REPORT: Sales Register                                 */}
        {/* ========================================================= */}
        {activeReport === "sales" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">
                  Total Sales: <strong className="text-slate-900 dark:text-white">{salesInvoices.length}</strong>
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Total Turnover: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{formatINR(totalSalesGross)}</strong>
                </span>
              </div>

              <button
                onClick={() =>
                  handleExportCSV(
                    "Sales_Register",
                    ["Invoice No", "Date", "Customer", "GSTIN", "Taxable Value", "CGST", "SGST", "IGST", "Grand Total"],
                    salesInvoices.map((inv) => {
                      const d = inv.data || inv || {};
                      const grandTotal = extractInvoiceTotal(d);
                      let taxable = extractInvoiceTaxable(d);
                      const cgst = Number(d.totals?.cgst ?? d.cgst ?? 0);
                      const sgst = Number(d.totals?.sgst ?? d.sgst ?? 0);
                      const igst = Number(d.totals?.igst ?? d.igst ?? 0);
                      const cess = Number(d.totals?.cess ?? d.cess ?? 0);
                      if (!taxable && grandTotal > 0) {
                        const taxSum = cgst + sgst + igst + cess;
                        taxable = taxSum > 0 ? Math.max(0, grandTotal - taxSum) : grandTotal;
                      }

                      return [
                        d.invoice_number || d.invoiceNumber || inv.id,
                        d.invoice_date || d.date || "—",
                        extractCustomerName(d),
                        extractBuyerGstin(d),
                        taxable,
                        cgst,
                        sgst,
                        igst,
                        grandTotal,
                      ];
                    })
                  )
                }
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-2xl shadow-xs transition w-fit cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Sales Register CSV</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              {salesInvoices.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No sales recorded yet</p>
                  <p className="text-[11px] text-slate-400">Generate tax invoices to populate the sales register.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">Invoice No</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Customer</th>
                        <th className="py-3.5 px-4">Taxable</th>
                        <th className="py-3.5 px-4">Tax Breakdown</th>
                        <th className="py-3.5 px-4">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                      {salesInvoices.map((inv) => {
                        const d = inv.data || inv || {};
                        const grandTotal = extractInvoiceTotal(d);
                        let taxable = extractInvoiceTaxable(d);
                        const cgst = Number(d.totals?.cgst ?? d.cgst ?? 0);
                        const sgst = Number(d.totals?.sgst ?? d.sgst ?? 0);
                        const igst = Number(d.totals?.igst ?? d.igst ?? 0);
                        const cess = Number(d.totals?.cess ?? d.cess ?? 0);
                        if (!taxable && grandTotal > 0) {
                          const taxSum = cgst + sgst + igst + cess;
                          taxable = taxSum > 0 ? Math.max(0, grandTotal - taxSum) : grandTotal;
                        }
                        const customerName = extractCustomerName(d);
                        const buyerGstin = extractBuyerGstin(d);

                        return (
                          <tr
                            key={inv.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white tabular-nums">
                              {d.invoice_number || d.invoiceNumber || inv.id}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                              {d.invoice_date || d.date || "—"}
                            </td>
                            <td className="py-3.5 px-4 font-sans font-semibold text-slate-900 dark:text-white">
                              <div>{customerName}</div>
                              {buyerGstin && (
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {buyerGstin}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                              {formatINR(taxable)}
                            </td>
                            <td className="py-3.5 px-4 text-[11px] text-slate-500 tabular-nums">
                              {igst > 0
                                ? `IGST: ${formatINR(igst)}`
                                : `CGST: ${formatINR(cgst)} | SGST: ${formatINR(sgst)}`}
                            </td>
                            <td className="py-3.5 px-4 font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                              {formatINR(grandTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. REPORT: Purchase Register                              */}
        {/* ========================================================= */}
        {activeReport === "purchases" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() =>
                  handleExportCSV(
                    "Purchase_Register",
                    ["Bill No", "Date", "Supplier", "GSTIN", "ITC Eligibility", "Taxable Value", "Total"],
                    purchases.map((p) => [
                      p.invoiceNumber,
                      p.date,
                      p.supplierName,
                      p.supplierGstin || "",
                      p.itcEligibility,
                      p.taxableAmount,
                      p.total,
                    ])
                  )
                }
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-2xl shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Purchase Register CSV</span>
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              {purchases.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <ShoppingCart className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No purchase bills recorded</p>
                  <p className="text-[11px] text-slate-400">Add vendor purchase bills to view inward supply ledger.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">Bill No</th>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Supplier</th>
                        <th className="py-3.5 px-4">ITC Claim</th>
                        <th className="py-3.5 px-4">Taxable</th>
                        <th className="py-3.5 px-4">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                      {purchases.map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white tabular-nums">
                            {p.invoiceNumber}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 tabular-nums">{p.date}</td>
                          <td className="py-3.5 px-4 font-sans font-semibold text-slate-900 dark:text-white">
                            {p.supplierName}
                          </td>
                          <td className="py-3.5 px-4 font-sans">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                              {p.itcEligibility}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                            {formatINR(p.taxableAmount || (p.total ? Math.max(0, p.total - ((p.cgst || 0) + (p.sgst || 0) + (p.igst || 0))) : 0))}
                          </td>
                          <td className="py-3.5 px-4 font-black tabular-nums text-slate-900 dark:text-white">
                            {formatINR(p.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. REPORT: Stock Valuation                                */}
        {/* ========================================================= */}
        {activeReport === "stock" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              {products.filter((p) => !p.isService).length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <Boxes className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No physical goods in inventory</p>
                  <p className="text-[11px] text-slate-400">Add stock products to calculate inventory asset valuation.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">Item & SKU</th>
                        <th className="py-3.5 px-4">HSN</th>
                        <th className="py-3.5 px-4">Stock on Hand</th>
                        <th className="py-3.5 px-4">Purchase Rate</th>
                        <th className="py-3.5 px-4">Selling Rate</th>
                        <th className="py-3.5 px-4">Total Inventory Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                      {products
                        .filter((p) => !p.isService)
                        .map((p) => {
                          const valuation = (p.stock || 0) * (p.purchasePrice || p.sellingPrice || 0);
                          return (
                            <tr
                              key={p.id}
                              className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                            >
                              <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                                {p.name}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 tabular-nums">{p.hsn || "—"}</td>
                              <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                {p.stock} {p.unit}
                              </td>
                              <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                                {formatINR(p.purchasePrice)}
                              </td>
                              <td className="py-3.5 px-4 tabular-nums text-slate-600 dark:text-slate-300">
                                {formatINR(p.sellingPrice)}
                              </td>
                              <td className="py-3.5 px-4 font-black tabular-nums text-slate-900 dark:text-white">
                                {formatINR(valuation)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
