"use client";

import React, { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Receipt,
  Printer,
  Share2,
  CreditCard,
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ArrowDownToLine,
} from "lucide-react";
import { decodeInvoiceFromUrl, CompactInvoiceData } from "@/lib/invoiceImage";
import { formatINR, numberToWords } from "@/lib/gstBillingEngine";
import { ThemeToggle } from "@/components/ThemeToggle";

function InvoiceViewerContent() {
  const searchParams = useSearchParams();
  const rawData = searchParams.get("d") || "";
  const rawId = searchParams.get("id") || "";

  const [invoiceData, setInvoiceData] = useState<CompactInvoiceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (rawData) {
      const decoded = decodeInvoiceFromUrl(rawData);
      if (decoded) {
        setInvoiceData(decoded);
        setLoading(false);
        return;
      }
    }

    // Fallback: check localStorage for invoice if matching ID
    if (typeof window !== "undefined" && rawId) {
      try {
        const stored = localStorage.getItem("gstlens_invoices");
        if (stored) {
          const parsed = JSON.parse(stored);
          const found = parsed.find(
            (inv: any) =>
              inv.id === rawId ||
              inv.invoice_number === rawId ||
              inv.data?.details?.invoiceNumber === rawId
          );
          if (found && found.data) {
            const d = found.data;
            setInvoiceData({
              invoiceNumber: d.details?.invoiceNumber || found.invoice_number || "Invoice",
              invoiceDate: d.details?.invoiceDate || found.invoice_date || "",
              dueDate: d.details?.dueDate,
              placeOfSupply: d.details?.placeOfSupply,
              reverseCharge: d.details?.reverseCharge,
              seller: {
                tradeName: d.profile?.tradeName,
                businessName: d.profile?.businessName,
                gstin: d.profile?.gstin,
                phone: d.profile?.phone,
                email: d.profile?.email,
                address: d.profile?.address,
                city: d.profile?.city,
                state: d.profile?.state,
                pincode: d.profile?.pincode,
                bankName: d.profile?.bankName,
                accountNumber: d.profile?.accountNumber,
                ifsc: d.profile?.ifsc,
                upiId: d.profile?.upiId,
              },
              client: {
                name: d.client?.name,
                tradeName: d.client?.tradeName,
                gstin: d.client?.gstin,
                phone: d.client?.phone,
                address: d.client?.address,
                city: d.client?.city,
                state: d.client?.state,
              },
              items: (d.items || []).map((it: any) => ({
                name: it.name,
                hsn: it.hsn,
                quantity: Number(it.quantity) || 1,
                unit: it.unit,
                rate: Number(it.rate) || 0,
                discount: Number(it.discount) || 0,
                discountType: it.discountType || "percent",
                taxPercent: Number(it.taxPercent) || 0,
              })),
              totals: {
                taxableAmount: d.totals?.taxableAmount || 0,
                cgst: d.totals?.cgst || 0,
                sgst: d.totals?.sgst || 0,
                igst: d.totals?.igst || 0,
                cess: d.totals?.cess || 0,
                roundOff: d.totals?.roundOff || 0,
                grandTotal: d.totals?.grandTotal || found.invoice_total || 0,
                isInterstate: d.totals?.isInterstate || false,
              },
            });
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    setLoading(false);
  }, [rawData, rawId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <Receipt className="w-12 h-12 text-slate-400 mb-3" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Invoice Not Found</h1>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          This invoice link might be incomplete or expired. Please request a fresh bill link from the merchant.
        </p>
      </div>
    );
  }

  const { seller, client, items, totals, invoiceNumber, invoiceDate, dueDate } = invoiceData;
  const sellerTitle = seller.tradeName || seller.businessName || "Merchant";
  const upiPayUrl = seller.upiId
    ? `upi://pay?pa=${encodeURIComponent(seller.upiId)}&pn=${encodeURIComponent(
        sellerTitle
      )}&am=${totals.grandTotal.toFixed(2)}&cu=INR&tn=Invoice%20${encodeURIComponent(invoiceNumber)}`
    : "";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Sticky Top Bar (Hidden on Print) */}
      <header className="print:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                {sellerTitle}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                Tax Invoice
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {invoiceNumber} • {invoiceDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {upiPayUrl && (
            <a
              href={upiPayUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay ₹{totals.grandTotal.toFixed(0)} via UPI</span>
            </a>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center p-4 sm:p-8 print:p-0">
        <div
          id="print-area"
          className="print-invoice-sheet w-full max-w-[800px] bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-4 print:border-none print:shadow-none print:rounded-none print:p-2.5 print:m-0"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-200 gap-4 print:pb-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {sellerTitle}
              </h1>
              {seller.tradeName && seller.tradeName !== seller.businessName && (
                <p className="text-xs font-semibold text-slate-500">Legal: {seller.businessName}</p>
              )}
              {seller.address && (
                <p className="text-xs text-slate-600 mt-1 max-w-sm leading-relaxed">{seller.address}</p>
              )}
              <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                {seller.gstin && (
                  <p>
                    <span className="font-semibold text-slate-900">GSTIN:</span>{" "}
                    <span className="font-mono font-bold text-emerald-700">{seller.gstin}</span>
                  </p>
                )}
                {seller.phone && <p>Ph: {seller.phone}</p>}
                {seller.email && <p>Email: {seller.email}</p>}
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded-xl text-xs font-black tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                TAX INVOICE
              </span>
              <p className="font-mono font-bold text-base text-slate-900">{invoiceNumber}</p>
              <p className="text-xs text-slate-500">Date: <span className="font-semibold text-slate-800">{invoiceDate}</span></p>
              {dueDate && (
                <p className="text-xs text-amber-700 font-semibold">Due: {dueDate}</p>
              )}
              <div className="pt-1 flex items-center justify-end gap-1 text-[11px] text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>GST Rule 46 Compliant</span>
              </div>
            </div>
          </div>

          {/* Billed To / Bank Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 border-b border-slate-100 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Billed To (Customer)
              </span>
              <p className="font-bold text-sm text-slate-900">{client.name || "Cash Customer"}</p>
              {client.address && <p className="text-slate-600">{client.address}</p>}
              <p className="font-semibold text-slate-800">
                GSTIN: <span className="font-mono font-bold">{client.gstin || "Unregistered (B2C)"}</span>
              </p>
              {client.phone && <p className="text-slate-600">Ph: {client.phone}</p>}
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-0.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Payment & Bank Remittance
              </span>
              <p className="font-bold text-slate-900">Bank: {seller.bankName || "Bank Transfer"}</p>
              {seller.accountNumber && (
                <p className="font-mono text-slate-700">A/C: <span className="font-bold">{seller.accountNumber}</span></p>
              )}
              {seller.ifsc && (
                <p className="font-mono text-slate-700">IFSC: <span className="font-bold">{seller.ifsc}</span></p>
              )}
              {seller.upiId && (
                <p className="font-mono font-bold text-blue-700">UPI ID: {seller.upiId}</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse my-2 text-xs">
            <thead>
              <tr className="border-b-2 border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                <th className="py-1.5 px-2 w-8 text-center">#</th>
                <th className="py-1.5 px-3">Item Description</th>
                <th className="py-1.5 px-2 text-center">HSN</th>
                <th className="py-1.5 px-2 text-right">Qty</th>
                <th className="py-1.5 px-2 text-right">Rate</th>
                <th className="py-1.5 px-2 text-right">GST%</th>
                <th className="py-1.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {items.map((it, idx) => {
                const qty = Number(it.quantity) || 1;
                const rate = Number(it.rate) || 0;
                const disc = Number(it.discount) || 0;
                const taxable = qty * rate - (it.discountType === "percent" ? (qty * rate * disc) / 100 : disc);
                return (
                  <tr key={idx} className="print-avoid-break">
                    <td className="py-2 px-2 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{it.name}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-600">{it.hsn || "—"}</td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums">{qty} {it.unit || ""}</td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums">{formatINR(rate)}</td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums">{it.taxPercent || 0}%</td>
                    <td className="py-2 px-3 text-right font-bold font-mono tabular-nums">{formatINR(taxable)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals & Words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 border-t border-slate-100 text-xs">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Total Amount In Words:
              </span>
              <p className="font-bold text-xs capitalize text-slate-900 bg-slate-50 p-2 rounded-xl border border-slate-100 leading-snug">
                {numberToWords(totals.grandTotal)}
              </p>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between py-0.5 text-slate-600">
                <span>Taxable Value:</span>
                <span className="font-mono font-bold tabular-nums">{formatINR(totals.taxableAmount)}</span>
              </div>
              {!totals.isInterstate ? (
                <>
                  <div className="flex justify-between py-0.5 text-slate-600">
                    <span>Central GST (CGST):</span>
                    <span className="font-mono font-semibold tabular-nums">{formatINR(totals.cgst || 0)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-slate-600">
                    <span>State GST (SGST):</span>
                    <span className="font-mono font-semibold tabular-nums">{formatINR(totals.sgst || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-0.5 text-slate-600">
                  <span>Integrated GST (IGST):</span>
                  <span className="font-mono font-semibold tabular-nums">{formatINR(totals.igst || 0)}</span>
                </div>
              )}
              {totals.roundOff !== 0 && (
                <div className="flex justify-between py-0.5 text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono tabular-nums">{totals.roundOff}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 px-3 rounded-xl font-bold text-sm text-white bg-emerald-700 shadow-xs mt-1">
                <span>NET PAYABLE:</span>
                <span className="text-base font-mono tabular-nums">{formatINR(totals.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Statutory Footer */}
          <div className="pt-2 border-t border-slate-100 flex justify-between items-end text-[10px] text-slate-500">
            <div>
              <p className="font-bold text-slate-800">E. & O.E. | Subject to local jurisdiction</p>
              <p className="text-[9px]">Goods once sold will not be returned or exchanged.</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-900">For {sellerTitle}</p>
              <p className="text-[9px]">Authorized Signatory</p>
            </div>
          </div>

          {/* Powered by GSTLens */}
          <div className="text-[8px] text-slate-400 text-center pt-2 border-t border-slate-100 select-none">
            Compliance & Billing powered by <strong className="font-bold text-slate-600">GSTLens.in</strong> • Digitize bills & file GST in seconds
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PublicInvoiceViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InvoiceViewerContent />
    </Suspense>
  );
}
