"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  Printer,
  Download,
  Share2,
  Plus,
  Trash2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  ArrowRight,
  FileText,
} from "lucide-react";
import { formatINR, numberToWords, calculateLineTax, INDIAN_STATES } from "@/lib/gstBillingEngine";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ItemRow {
  id: string;
  name: string;
  hsn: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

export default function FreeInvoiceGeneratorPage() {
  // Seller details
  const [sellerName, setSellerName] = useState("My Business");
  const [sellerGstin, setSellerGstin] = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [sellerUpi, setSellerUpi] = useState("");

  // Buyer details
  const [buyerName, setBuyerName] = useState("Cash Customer");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("07"); // Delhi

  // Invoice Meta
  const [invoiceNumber, setInvoiceNumber] = useState("INV-2026-001");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Line items
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: "item-1",
      name: "Consulting & Software Services",
      hsn: "998311",
      quantity: 1,
      rate: 5000,
      gstRate: 18,
    },
  ]);

  const sellerStateCode = (sellerGstin.trim().slice(0, 2) || placeOfSupply);
  const isInterstate = sellerStateCode !== placeOfSupply;

  const calculatedTotals = useMemo(() => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach((item) => {
      const lineTaxable = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      subtotal += lineTaxable;
      const rate = Number(item.gstRate) || 0;
      if (isInterstate) {
        igst += (lineTaxable * rate) / 100;
      } else {
        cgst += (lineTaxable * rate) / 200;
        sgst += (lineTaxable * rate) / 200;
      }
    });

    const totalTax = cgst + sgst + igst;
    const grandTotal = subtotal + totalTax;

    return {
      subtotal,
      cgst,
      sgst,
      igst,
      totalTax,
      grandTotal: Math.round(grandTotal),
    };
  }, [items, isInterstate]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: "",
        hsn: "",
        quantity: 1,
        rate: 0,
        gstRate: 18,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemRow, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `🧾 *TAX INVOICE: ${invoiceNumber}*\n\n` +
      `Dear ${buyerName},\n` +
      `Invoice from *${sellerName}*:\n\n` +
      `• *Invoice No:* ${invoiceNumber}\n` +
      `• *Date:* ${invoiceDate}\n` +
      `• *Total Amount:* ${formatINR(calculatedTotals.grandTotal)}\n` +
      (sellerUpi ? `• *Pay via UPI:* upi://pay?pa=${sellerUpi}&pn=${encodeURIComponent(sellerName)}&am=${calculatedTotals.grandTotal}&cu=INR\n\n` : "\n\n") +
      `Generated free with GSTLens - Effortless GST Invoicing.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 print:bg-white print:text-black">
      {/* Top SEO Header */}
      <header className="print:hidden sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-black text-slate-900 dark:text-white text-base">
            GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
          </span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Free Tool
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleWhatsApp}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
        {/* SEO Title & Banner */}
        <div className="print:hidden text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Free Online GST Invoice Generator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create, calculate, print &amp; WhatsApp professional Indian GST tax invoices in 30 seconds. No signup required.
          </p>
        </div>

        {/* Invoice Paper Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl print:border-none print:shadow-none print:p-0 print:rounded-none">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-2 flex-1">
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Your Business Name"
                className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-600 focus:outline-none w-full"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <input
                  type="text"
                  value={sellerGstin}
                  onChange={(e) => setSellerGstin(e.target.value.toUpperCase())}
                  placeholder="Your GSTIN (15 Digits)"
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <input
                type="text"
                value={sellerAddress}
                onChange={(e) => setSellerAddress(e.target.value)}
                placeholder="Shop / Office Address, City, State"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:text-right space-y-2 shrink-0">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block">
                TAX INVOICE
              </span>
              <div className="text-xs space-y-1">
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="text-slate-400">Invoice No:</span>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="font-mono font-bold bg-transparent border-b border-slate-200 dark:border-slate-700 w-32 text-right focus:outline-none"
                  />
                </div>
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="text-slate-400">Date:</span>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="font-mono bg-transparent border-b border-slate-200 dark:border-slate-700 w-32 text-right focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bill To & POS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-slate-100 dark:border-slate-800 text-xs">
            <div className="space-y-1.5">
              <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Bill To (Customer)</p>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Customer or Company Name"
                className="font-bold text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-700 w-full py-0.5 focus:outline-none"
              />
              <input
                type="text"
                value={buyerGstin}
                onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                placeholder="Customer GSTIN (Leave blank for B2C)"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 font-mono text-[11px] w-full focus:outline-none"
              />
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="Customer Address"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-[11px] w-full focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <p className="font-bold uppercase tracking-wider text-[10px] text-slate-400">Place of Supply (State)</p>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                {isInterstate ? "Inter-State (IGST Applicable)" : "Intra-State (CGST + SGST Applicable)"}
              </p>
            </div>
          </div>

          {/* Line items table */}
          <div className="py-6 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Item Description</th>
                  <th className="pb-2 w-20">HSN</th>
                  <th className="pb-2 w-16 text-right">Qty</th>
                  <th className="pb-2 w-24 text-right">Rate (₹)</th>
                  <th className="pb-2 w-20 text-right">GST %</th>
                  <th className="pb-2 w-24 text-right">Total (₹)</th>
                  <th className="pb-2 w-10 print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it) => {
                  const lineTotal = it.quantity * it.rate;
                  return (
                    <tr key={it.id}>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => updateItem(it.id, "name", e.target.value)}
                          placeholder="Item name / service"
                          className="w-full bg-transparent font-medium text-slate-900 dark:text-white focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="text"
                          value={it.hsn}
                          onChange={(e) => updateItem(it.id, "hsn", e.target.value)}
                          placeholder="HSN"
                          className="w-full bg-transparent font-mono text-[11px] focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => updateItem(it.id, "quantity", Number(e.target.value))}
                          className="w-14 text-right bg-transparent font-mono focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <input
                          type="number"
                          value={it.rate}
                          onChange={(e) => updateItem(it.id, "rate", Number(e.target.value))}
                          className="w-20 text-right bg-transparent font-mono focus:outline-none"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <select
                          value={it.gstRate}
                          onChange={(e) => updateItem(it.id, "gstRate", Number(e.target.value))}
                          className="bg-transparent text-right font-mono focus:outline-none"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td className="py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatINR(lineTotal)}
                      </td>
                      <td className="py-2 text-right print:hidden">
                        <button
                          onClick={() => removeItem(it.id)}
                          className="text-slate-400 hover:text-rose-500 transition p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button
              onClick={addItem}
              type="button"
              className="mt-3 print:hidden inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Line Item</span>
            </button>
          </div>

          {/* Totals Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start gap-4 text-xs">
            <div className="space-y-2 max-w-sm">
              <p className="text-slate-400">
                Amount in words:{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {numberToWords(calculatedTotals.grandTotal)}
                </span>
              </p>
              <div className="pt-2">
                <input
                  type="text"
                  value={sellerUpi}
                  onChange={(e) => setSellerUpi(e.target.value)}
                  placeholder="UPI ID for instant QR code (e.g. name@upi)"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 font-mono text-right">
              <div className="flex justify-between text-slate-500">
                <span>Taxable Value:</span>
                <span>{formatINR(calculatedTotals.subtotal)}</span>
              </div>
              {isInterstate ? (
                <div className="flex justify-between text-slate-500">
                  <span>IGST:</span>
                  <span>{formatINR(calculatedTotals.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>CGST:</span>
                    <span>{formatINR(calculatedTotals.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>SGST:</span>
                    <span>{formatINR(calculatedTotals.sgst)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Grand Total:</span>
                <span>{formatINR(calculatedTotals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Callout */}
        <div className="print:hidden mt-8 p-6 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Want to scan paper bills &amp; auto-save customer ledgers?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Get automated GSTR-1 JSON returns, AI bill scanning, Tally XML exports, and inventory management.
          </p>
          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <span>Get Free GSTLens Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
