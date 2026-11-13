"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  Printer,
  Share2,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { formatINR, numberToWords, INDIAN_STATES } from "@/lib/gstBillingEngine";
import { ThemeToggle } from "@/components/ThemeToggle";
import WhatsAppShareModal from "@/components/WhatsAppShareModal";
import {
  generateCompactBillImage,
  generateFullBillUrl,
  CompactInvoiceData,
} from "@/lib/invoiceImage";
import { buildWhatsAppInvoiceMessage } from "@/lib/whatsapp";

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

  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [compactImageBlob, setCompactImageBlob] = useState<Blob | null>(null);
  const [compactImageDataUrl, setCompactImageDataUrl] = useState<string | null>(null);
  const [compactImageFile, setCompactImageFile] = useState<File | null>(null);
  const [billUrl, setBillUrl] = useState<string>("");
  const [shareMessageText, setShareMessageText] = useState<string>("");

  const handleWhatsApp = async () => {
    const compactData: CompactInvoiceData = {
      invoiceNumber: invoiceNumber || "Invoice",
      invoiceDate: invoiceDate || "",
      placeOfSupply,
      seller: {
        tradeName: sellerName,
        businessName: sellerName,
        gstin: sellerGstin,
        phone: sellerPhone,
        address: sellerAddress,
        upiId: sellerUpi,
      },
      client: {
        name: buyerName,
        gstin: buyerGstin,
        address: buyerAddress,
      },
      items: items.map((it) => ({
        name: it.name,
        hsn: it.hsn,
        quantity: it.quantity,
        rate: it.rate,
        taxPercent: it.gstRate,
      })),
      totals: {
        taxableAmount: calculatedTotals.subtotal,
        cgst: calculatedTotals.cgst,
        sgst: calculatedTotals.sgst,
        igst: calculatedTotals.igst,
        grandTotal: calculatedTotals.grandTotal,
        isInterstate,
      },
    };

    const fullUrl = generateFullBillUrl(compactData);
    setBillUrl(fullUrl);

    const msg = buildWhatsAppInvoiceMessage({
      invoice: {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        seller_gstin: sellerGstin,
        seller_gstin_info: { trade_name: sellerName },
        buyer_gstin: buyerGstin,
        buyer_gstin_info: { trade_name: buyerName },
        invoice_total: calculatedTotals.grandTotal,
        items: items.map((it) => ({
          description: it.name,
          quantity: it.quantity,
          taxable_amount: it.quantity * it.rate,
          gst_rate: it.gstRate,
        })),
      },
      sellerName,
      sellerUpiId: sellerUpi,
      fullBillUrl: fullUrl,
    });
    setShareMessageText(msg);

    setShowWhatsAppModal(true);

    try {
      const imgResult = await generateCompactBillImage(compactData);
      setCompactImageBlob(imgResult.blob);
      setCompactImageDataUrl(imgResult.dataUrl);
      setCompactImageFile(imgResult.file);
    } catch (err) {
      console.warn("Could not generate compact bill image:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 print:bg-white print:text-black">
      {/* Top Header */}
      <header className="print:hidden sticky top-0 z-30 bg-white/90 dark:bg-[#141415]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 px-4 sm:px-8 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#047857] text-white flex items-center justify-center font-semibold shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm sm:text-base">
            GSTLens
          </span>
          <span className="ml-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            Free Tool
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleWhatsApp}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-medium border border-stone-200/80 dark:border-stone-700 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
        {/* SEO Title & Banner */}
        <div className="print:hidden text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Free Online GST Invoice Generator
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Create, calculate, print &amp; WhatsApp Rule 46 compliant tax invoices in seconds. No signup required.
          </p>
        </div>

        {/* Invoice Paper Box */}
        <div id="print-area" className="print-invoice-sheet bg-white dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-6 sm:p-10 shadow-xs print:border-none print:shadow-none print:p-2.5 print:m-0 print:rounded-none">
          {/* Header row */}
          <div className="flex flex-col sm:row justify-between items-start gap-4 pb-6 border-b border-stone-100 dark:border-stone-800 print:pb-2 print:gap-2">
            <div className="space-y-2 flex-1 w-full sm:w-auto print:space-y-1">
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Your Business Name"
                className="text-xl sm:text-2xl font-semibold text-stone-900 dark:text-stone-100 bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-700 focus:border-[#047857] focus:outline-hidden w-full print:text-lg"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs print:gap-1.5 print:text-[10px]">
                <input
                  type="text"
                  value={sellerGstin}
                  onChange={(e) => setSellerGstin(e.target.value.toUpperCase())}
                  placeholder="Your GSTIN (15 Digits)"
                  className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1.5 font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[#047857] print:border-none print:bg-transparent print:p-0 print:text-[10px]"
                />
                <input
                  type="text"
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#047857] print:border-none print:bg-transparent print:p-0 print:text-[10px]"
                />
              </div>
              <input
                type="text"
                value={sellerAddress}
                onChange={(e) => setSellerAddress(e.target.value)}
                placeholder="Shop / Office Address, City, State"
                className="w-full bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#047857] print:border-none print:bg-transparent print:p-0 print:text-[10px]"
              />
            </div>

            <div className="sm:text-right space-y-2 shrink-0 print:space-y-0.5">
              <span className="px-3 py-1 rounded-md text-xs font-mono font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 inline-block print:px-2 print:py-0.5 print:text-[10px]">
                TAX INVOICE
              </span>
              <div className="text-xs space-y-1 print:space-y-0.5 print:text-[10px]">
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="text-stone-400">Invoice No:</span>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="font-mono font-medium bg-transparent border-b border-stone-200 dark:border-stone-700 w-32 text-right focus:outline-hidden print:border-none print:p-0"
                  />
                </div>
                <div className="flex items-center sm:justify-end gap-2">
                  <span className="text-stone-400">Date:</span>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="font-mono bg-transparent border-b border-stone-200 dark:border-stone-700 w-32 text-right focus:outline-hidden text-xs print:border-none print:p-0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bill To & POS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-stone-100 dark:border-stone-800 text-xs print:py-2 print:gap-2 print:text-[10px]">
            <div className="space-y-1.5 print:space-y-0.5">
              <p className="font-medium uppercase tracking-wider text-[10px] text-stone-400">Bill To (Customer)</p>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Customer or Company Name"
                className="font-medium text-stone-900 dark:text-stone-100 bg-transparent border-b border-stone-200 dark:border-stone-700 w-full py-0.5 focus:outline-hidden print:border-none print:p-0"
              />
              <input
                type="text"
                value={buyerGstin}
                onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                placeholder="Customer GSTIN (Leave blank for B2C)"
                className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1 font-mono text-[11px] w-full focus:outline-hidden print:border-none print:bg-transparent print:p-0 print:text-[10px]"
              />
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                placeholder="Customer Address"
                className="bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1 text-[11px] w-full focus:outline-hidden print:border-none print:bg-transparent print:p-0 print:text-[10px]"
              />
            </div>

            <div className="space-y-1.5 print:space-y-0.5">
              <p className="font-medium uppercase tracking-wider text-[10px] text-stone-400">Place of Supply (State)</p>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1.5 text-xs focus:outline-hidden print:border-none print:bg-transparent print:p-0"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-stone-400 print:text-[9px]">
                {isInterstate ? "Inter-state supply (IGST applicable)" : "Intra-state supply (CGST + SGST applicable)"}
              </p>
            </div>
          </div>

          {/* Line items table */}
          <div className="py-6 overflow-x-auto print:py-2">
            <table className="w-full text-left text-xs print:text-[10px]">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 font-medium uppercase text-[10px] tracking-wider">
                  <th className="pb-2 print:pb-1">Item Description</th>
                  <th className="pb-2 w-20 print:pb-1">HSN</th>
                  <th className="pb-2 w-16 text-right print:pb-1">Qty</th>
                  <th className="pb-2 w-24 text-right print:pb-1">Rate (₹)</th>
                  <th className="pb-2 w-20 text-right print:pb-1">GST %</th>
                  <th className="pb-2 w-24 text-right print:pb-1">Total (₹)</th>
                  <th className="pb-2 w-10 print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {items.map((it) => {
                  const lineTotal = it.quantity * it.rate;
                  return (
                    <tr key={it.id} className="print-avoid-break">
                      <td className="py-2 pr-2 print:py-1">
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => updateItem(it.id, "name", e.target.value)}
                          placeholder="Item name / service"
                          className="w-full bg-transparent font-normal text-stone-900 dark:text-stone-100 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 pr-2 print:py-1">
                        <input
                          type="text"
                          value={it.hsn}
                          onChange={(e) => updateItem(it.id, "hsn", e.target.value)}
                          placeholder="HSN"
                          className="w-full bg-transparent font-mono text-[11px] focus:outline-hidden print:text-[10px]"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right print:py-1">
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => updateItem(it.id, "quantity", Number(e.target.value))}
                          className="w-14 text-right bg-transparent font-mono tabular-nums focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right print:py-1">
                        <input
                          type="number"
                          value={it.rate}
                          onChange={(e) => updateItem(it.id, "rate", Number(e.target.value))}
                          className="w-20 text-right bg-transparent font-mono tabular-nums focus:outline-hidden"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right print:py-1">
                        <select
                          value={it.gstRate}
                          onChange={(e) => updateItem(it.id, "gstRate", Number(e.target.value))}
                          className="bg-transparent text-right font-mono focus:outline-hidden"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                      <td className="py-2 text-right font-mono font-medium text-stone-900 dark:text-stone-100 tabular-nums print:py-1">
                        {formatINR(lineTotal)}
                      </td>
                      <td className="py-2 text-right print:hidden">
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition p-1"
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
              className="mt-3 print:hidden inline-flex items-center gap-1.5 text-xs font-medium text-[#047857] dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add line item</span>
            </button>
          </div>

          {/* Totals Section */}
          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row justify-between items-start gap-4 text-xs print:pt-2 print:gap-2 print:text-[10px]">
            <div className="space-y-2 max-w-sm print:space-y-1">
              <p className="text-stone-500">
                Amount in words:{" "}
                <span className="font-medium text-stone-800 dark:text-stone-200">
                  {numberToWords(calculatedTotals.grandTotal)}
                </span>
              </p>
              <div className="pt-1 print:pt-0.5">
                <input
                  type="text"
                  value={sellerUpi}
                  onChange={(e) => setSellerUpi(e.target.value)}
                  placeholder="UPI ID for Bharat UPI QR (e.g. name@okhdfcbank)"
                  className="w-full bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl px-2.5 py-1 text-xs focus:outline-hidden font-mono print:border-none print:bg-transparent print:p-0 print:text-[10px]"
                />
              </div>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 font-mono text-right print:space-y-0.5 print:text-[10px]">
              <div className="flex justify-between text-stone-500">
                <span>Taxable Value:</span>
                <span className="tabular-nums">{formatINR(calculatedTotals.subtotal)}</span>
              </div>
              {isInterstate ? (
                <div className="flex justify-between text-stone-500">
                  <span>IGST:</span>
                  <span className="tabular-nums">{formatINR(calculatedTotals.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-stone-500">
                    <span>CGST:</span>
                    <span className="tabular-nums">{formatINR(calculatedTotals.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-stone-500">
                    <span>SGST:</span>
                    <span className="tabular-nums">{formatINR(calculatedTotals.sgst)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-200 dark:border-stone-800 print:text-xs print:pt-1">
                <span>Grand Total:</span>
                <span className="tabular-nums">{formatINR(calculatedTotals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Callout */}
        <div className="print:hidden mt-8 p-6 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 text-center space-y-2.5 shadow-xs">
          <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">
            Need to scan paper purchase bills and auto-reconcile ITC?
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            Get automated GSTR-1 JSON returns, AI bill OCR scanning, Tally XML exports, and inventory management.
          </p>
          <div className="pt-1">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <span>Get started free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      {/* WhatsApp Share Modal with Compact Image & Full Bill Link */}
      {showWhatsAppModal && (
        <WhatsAppShareModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          invoiceNumber={invoiceNumber || "Invoice"}
          invoiceDate={invoiceDate || ""}
          client={{
            name: buyerName,
            gstin: buyerGstin,
          }}
          seller={{
            name: sellerName || "Merchant",
            phone: sellerPhone,
            gstin: sellerGstin,
            upiId: sellerUpi,
          }}
          grandTotal={calculatedTotals.grandTotal}
          messageText={shareMessageText}
          billUrl={billUrl}
          compactImageBlob={compactImageBlob}
          compactImageDataUrl={compactImageDataUrl}
          compactImageFile={compactImageFile}
        />
      )}
    </div>
  );
}
