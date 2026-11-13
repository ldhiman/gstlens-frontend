"use client";

import React, { useEffect, useState, useMemo } from "react";
import QRCode from "qrcode";
import {
  Printer,
  Share2,
  X,
  CreditCard,
  Sparkles,
  Scissors,
} from "lucide-react";
import {
  DOCUMENT_TYPES,
  DocumentType,
  LineItem,
  InvoiceTotals,
  formatINR,
  numberToWords,
  generateUpiQrString,
  getStateNameFromCode,
  computeInvoiceTotals,
} from "@/lib/gstBillingEngine";
import { BusinessProfile, Client, PrintSettings } from "@/lib/storage";
import {
  Rule48CopyType,
  getRule48CopyBadge,
  checkPrintEligibility,
} from "@/lib/printRule48";
import WhatsAppShareModal from "./WhatsAppShareModal";
import {
  generateCompactBillImage,
  generateFullBillUrl,
  CompactInvoiceData,
} from "@/lib/invoiceImage";
import { buildWhatsAppInvoiceMessage } from "@/lib/whatsapp";

export interface InvoicePreviewProps {
  profile: BusinessProfile;
  client: Partial<Client>;
  details: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    placeOfSupply?: string;
    docType: DocumentType;
    reverseCharge?: boolean;
    eWayBillNo?: string;
    vehicleNo?: string;
    poNumber?: string;
  };
  items: LineItem[];
  totals: InvoiceTotals;
  terms?: string;
  notes?: string;
  printSettings?: Partial<PrintSettings>;
  onClose?: () => void;
}

export default function InvoicePreview({
  profile,
  client,
  details,
  items,
  totals,
  terms,
  notes,
  printSettings,
  onClose,
}: InvoicePreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    printSettings?.template || "modern"
  );
  const [selectedCopy, setSelectedCopy] = useState<Rule48CopyType>("original");

  const docConfig = DOCUMENT_TYPES[details.docType] || DOCUMENT_TYPES["tax-invoice"];
  const accentColor = printSettings?.colorTheme || "#2563eb";

  const printEligibility = useMemo(() => {
    return checkPrintEligibility(items.length, Boolean(terms && terms.trim().length > 0));
  }, [items.length, terms]);

  // Compute effectiveTotals with reliable fallback if totals not pre-populated
  const effectiveTotals = useMemo<InvoiceTotals>(() => {
    if (totals && totals.grandTotal > 0) return totals;
    return computeInvoiceTotals(items || [], Boolean(totals?.isInterstate), {
      hasTax: docConfig.hasTax,
    });
  }, [totals, items, docConfig.hasTax]);

  // Generate UPI QR Code
  useEffect(() => {
    if (profile?.upiId && effectiveTotals.grandTotal > 0) {
      const upiUrl = generateUpiQrString({
        upiId: profile.upiId,
        payeeName: profile.tradeName || profile.businessName,
        amount: effectiveTotals.grandTotal,
        invoiceNo: details.invoiceNumber,
      });
      QRCode.toDataURL(upiUrl, { width: 140, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(""));
    } else {
      setQrDataUrl("");
    }
  }, [profile?.upiId, profile?.tradeName, profile?.businessName, effectiveTotals.grandTotal, details.invoiceNumber]);

  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [compactImageBlob, setCompactImageBlob] = useState<Blob | null>(null);
  const [compactImageDataUrl, setCompactImageDataUrl] = useState<string | null>(null);
  const [compactImageFile, setCompactImageFile] = useState<File | null>(null);
  const [billUrl, setBillUrl] = useState<string>("");
  const [shareMessageText, setShareMessageText] = useState<string>("");

  const handleWhatsAppShare = async () => {
    const compactData: CompactInvoiceData = {
      invoiceNumber: details.invoiceNumber || "Invoice",
      invoiceDate: details.invoiceDate || "",
      dueDate: details.dueDate,
      placeOfSupply: details.placeOfSupply,
      reverseCharge: details.reverseCharge,
      seller: {
        tradeName: profile?.tradeName,
        businessName: profile?.businessName,
        gstin: profile?.gstin,
        phone: profile?.phone,
        email: profile?.email,
        address: profile?.address,
        city: profile?.city,
        state: profile?.state,
        pincode: profile?.pincode,
        bankName: profile?.bankName,
        accountNumber: profile?.accountNumber,
        ifsc: profile?.ifsc,
        upiId: profile?.upiId,
      },
      client: {
        name: client.name,
        tradeName: client.tradeName,
        gstin: client.gstin,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
      },
      items: (items || []).map((it) => ({
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
        taxableAmount: effectiveTotals.taxableAmount,
        cgst: effectiveTotals.cgst,
        sgst: effectiveTotals.sgst,
        igst: effectiveTotals.igst,
        cess: effectiveTotals.cess,
        roundOff: effectiveTotals.roundOff,
        grandTotal: effectiveTotals.grandTotal,
        isInterstate: effectiveTotals.isInterstate,
      },
      qrDataUrl: qrDataUrl || undefined,
    };

    const fullUrl = generateFullBillUrl(compactData);
    setBillUrl(fullUrl);

    // Build the formatted text message with items breakdown, UPI, and full bill URL
    const msg = buildWhatsAppInvoiceMessage({
      invoice: {
        invoice_number: details.invoiceNumber,
        invoice_date: details.invoiceDate,
        seller_gstin: profile?.gstin,
        seller_gstin_info: {
          trade_name: profile?.tradeName || profile?.businessName,
        },
        buyer_gstin: client.gstin,
        buyer_gstin_info: {
          trade_name: client.name,
        },
        invoice_total: effectiveTotals.grandTotal,
        items: (items || []).map((it) => ({
          description: it.name,
          quantity: Number(it.quantity) || 1,
          taxable_amount: (Number(it.quantity) || 1) * (Number(it.rate) || 0),
          gst_rate: Number(it.taxPercent) || 0,
        })),
      },
      sellerName: profile?.tradeName || profile?.businessName,
      sellerUpiId: profile?.upiId,
      buyerPhone: client.phone,
      fullBillUrl: fullUrl,
    });
    setShareMessageText(msg);

    // Open share modal
    setShowWhatsAppModal(true);

    // Asynchronously generate compact image
    try {
      const imgResult = await generateCompactBillImage(compactData);
      setCompactImageBlob(imgResult.blob);
      setCompactImageDataUrl(imgResult.dataUrl);
      setCompactImageFile(imgResult.file);
    } catch (err) {
      console.warn("Could not generate compact bill image:", err);
    }
  };

  /**
   * Dedicated print function with iframe isolation.
   * Isolates #print-area from any background page content, guaranteeing:
   * 1. 100% visible invoice output without clipping.
   * 2. Zero phantom overflow pages from background tables/forms.
   * 3. Perfect 1-page fit for single copy, exact 1-page fit for 2-in-1 Eco-Saver,
   *    and exact 3-page pagination for Triplicate.
   */
  const handlePrint = () => {
    const printArea = document.getElementById("print-area");
    if (!printArea) {
      window.print();
      return;
    }

    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "794px";
      iframe.style.height = "1123px";
      iframe.style.border = "none";
      iframe.style.opacity = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      // Collect all active styles
      let styles = "";
      document.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
        styles += node.outerHTML;
      });

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${details.invoiceNumber || "Invoice"}</title>
            ${styles}
            <style>
              @page {
                size: A4 portrait;
                margin: 4mm 6mm;
              }
              *, *:before, *:after {
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
              }
              #print-area {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
              }
              #print-area, #print-area * {
                visibility: visible !important;
              }
              .print-invoice-sheet {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-sizing: border-box !important;
                width: 100% !important;
                max-width: 100% !important;
              }
              .print-page-break:not(:last-child) {
                page-break-after: always !important;
                break-after: page !important;
                margin-bottom: 0 !important;
              }
              .print-page-break:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
                margin-bottom: 0 !important;
              }
              table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
              tr, .print-avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-footer-group;
              }
              [class*="min-h-"] {
                min-height: 0 !important;
              }
              [class*="shadow-"] {
                box-shadow: none !important;
              }
              .thermal-slip {
                width: 76mm !important;
                max-width: 76mm !important;
                padding: 3mm !important;
                margin: 0 auto !important;
              }
            </style>
          </head>
          <body>
            <div id="print-area">
              ${printArea.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 2000);
      }, 350);
    } catch {
      window.print();
    }
  };

  // Group items by HSN for Rule 46 statutory compliance
  const hsnSummary = useMemo(() => {
    const map: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; cess: number }> = {};
    for (const it of items) {
      const hsn = it.hsn?.trim() || "N/A";
      if (!map[hsn]) {
        map[hsn] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 };
      }
      const qty = Math.max(0, Number(it.quantity) || 0);
      const rate = Math.max(0, Number(it.rate) || 0);
      const disc = Math.max(0, Number(it.discount) || 0);
      const taxable = Math.max(0, qty * rate - (it.discountType === "percent" ? (qty * rate * disc) / 100 : disc));
      const taxRate = docConfig.hasTax ? Number(it.taxPercent) || 0 : 0;
      map[hsn].taxable += taxable;
      if (effectiveTotals.isInterstate) {
        map[hsn].igst += (taxable * taxRate) / 100;
      } else {
        map[hsn].cgst += (taxable * (taxRate / 2)) / 100;
        map[hsn].sgst += (taxable * (taxRate / 2)) / 100;
      }
      map[hsn].cess += (taxable * (Number(it.cessPercent) || 0)) / 100;
    }
    return Object.entries(map).map(([hsn, val]) => ({
      hsn,
      taxable: Math.round(val.taxable * 100) / 100,
      cgst: Math.round(val.cgst * 100) / 100,
      sgst: Math.round(val.sgst * 100) / 100,
      igst: Math.round(val.igst * 100) / 100,
      cess: Math.round(val.cess * 100) / 100,
      totalTax: Math.round((val.cgst + val.sgst + val.igst + val.cess) * 100) / 100,
    }));
  }, [items, effectiveTotals.isInterstate, docConfig.hasTax]);

  const templateOptions = [
    { id: "modern", name: "Modern", desc: "Fintech brand look" },
    { id: "classic", name: "Classic", desc: "Rule 46 boxed layout" },
    { id: "minimalist", name: "Minimalist", desc: "Clean typography" },
    { id: "compact", name: "Compact", desc: "Dense 1-Page fit" },
    { id: "thermal", name: "80mm POS", desc: "Receipt roll slip" },
  ];

  /* ------------------------------------------------------------------ */
  /* TEMPLATE 1: THERMAL 80mm RECEIPT                                   */
  /* ------------------------------------------------------------------ */
  const renderThermal = (copy: Rule48CopyType) => {
    const effectiveCopy =
      copy === "all" || copy === "eco-dual" || copy === "eco-triple" || copy === "eco-3in2"
        ? "original"
        : copy;
    const copyBadge = getRule48CopyBadge(effectiveCopy);

    return (
      <div className="thermal-slip w-[300px] bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-xl rounded-sm print:shadow-none print:w-[76mm] print:m-0">
        <div className="text-center pb-2 border-b border-dashed border-black">
          <h2 className="text-sm font-bold uppercase tracking-tight">
            {profile?.tradeName || profile?.businessName}
          </h2>
          <p className="text-[10px] mt-0.5">{profile?.address}</p>
          <p className="text-[10px]">
            {profile?.city ? `${profile.city}, ` : ""}
            {profile?.state} {profile?.pincode}
          </p>
          {profile?.phone && <p className="text-[10px]">Tel: {profile.phone}</p>}
          {profile?.gstin && <p className="font-bold text-[10px] mt-0.5">GSTIN: {profile.gstin}</p>}
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-0.5">
          <div className="flex justify-between font-bold">
            <span>{docConfig.title.toUpperCase()}</span>
            <span>{details.invoiceNumber}</span>
          </div>
          <div className="text-[9px] font-bold tracking-wider text-center py-0.5 border-y border-dashed border-black uppercase">
            {copyBadge.badge}
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Date: {details.invoiceDate}</span>
            <span>POS: {details.placeOfSupply || profile?.stateCode || "Local"}</span>
          </div>
          {client.name && (
            <div className="pt-1 text-[10px]">
              <p className="font-bold truncate">Customer: {client.name}</p>
              {client.phone && <p>Ph: {client.phone}</p>}
              {client.gstin && <p className="font-bold">GSTIN: {client.gstin}</p>}
            </div>
          )}
        </div>

        <table className="w-full text-left my-2 border-b border-dashed border-black text-[10px]">
          <thead>
            <tr className="border-b border-black font-bold">
              <th className="py-1">Item</th>
              <th className="text-right py-1">Qty</th>
              <th className="text-right py-1">Rate</th>
              <th className="text-right py-1">Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-gray-300">
            {items.map((it, idx) => {
              const qty = Number(it.quantity) || 0;
              const rate = Number(it.rate) || 0;
              const disc = Number(it.discount) || 0;
              const taxable = qty * rate - (it.discountType === "percent" ? (qty * rate * disc) / 100 : disc);
              return (
                <tr key={idx} className="align-top">
                  <td className="py-1 pr-1">
                    <div className="font-bold truncate max-w-[120px]">{it.name}</div>
                    {it.hsn && <span className="text-[9px] text-gray-600">HSN: {it.hsn}</span>}
                  </td>
                  <td className="text-right py-1 whitespace-nowrap">{qty}</td>
                  <td className="text-right py-1 tabular-nums">{rate.toFixed(1)}</td>
                  <td className="text-right py-1 font-bold tabular-nums">{taxable.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="space-y-0.5 py-1 text-[10px] border-b border-dashed border-black">
          <div className="flex justify-between">
            <span>Taxable Amount:</span>
            <span className="tabular-nums">{formatINR(effectiveTotals.taxableAmount)}</span>
          </div>
          {docConfig.hasTax && (
            <>
              {!effectiveTotals.isInterstate ? (
                <>
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span className="tabular-nums">{formatINR(effectiveTotals.cgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span className="tabular-nums">{formatINR(effectiveTotals.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>IGST:</span>
                  <span className="tabular-nums">{formatINR(effectiveTotals.igst)}</span>
                </div>
              )}
            </>
          )}
          {effectiveTotals.cess > 0 && (
            <div className="flex justify-between">
              <span>Cess:</span>
              <span className="tabular-nums">{formatINR(effectiveTotals.cess)}</span>
            </div>
          )}
          {effectiveTotals.roundOff !== 0 && (
            <div className="flex justify-between">
              <span>Round Off:</span>
              <span className="tabular-nums">{effectiveTotals.roundOff > 0 ? `+${effectiveTotals.roundOff}` : effectiveTotals.roundOff}</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
            <span>GRAND TOTAL:</span>
            <span className="tabular-nums">{formatINR(effectiveTotals.grandTotal)}</span>
          </div>
        </div>

        {qrDataUrl && (
          <div className="py-2.5 flex flex-col items-center border-b border-dashed border-black">
            <img src={qrDataUrl} alt="UPI QR" className="w-24 h-24" />
            <p className="text-[9px] mt-1 font-semibold">Scan with any UPI App</p>
            <p className="text-[9px] font-bold">{profile.upiId}</p>
          </div>
        )}

        <div className="text-center pt-2 text-[9px] space-y-0.5">
          <p className="font-bold">Thank You For Your Business!</p>
          <p className="text-[8px] text-gray-600">Goods once sold will not be returned</p>
          <p className="text-[8px] text-gray-500 pt-0.5 border-t border-dashed border-gray-400">Section 31 CGST Act Invoice</p>
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /* TEMPLATE 2: CLASSIC (Statutory Indian Rule 46 Boxed Layout)       */
  /* ------------------------------------------------------------------ */
  const renderClassic = (
    copy: Rule48CopyType,
    densityOrDual: "standard" | "dual" | "triple" | boolean = "standard"
  ) => {
    const density: "standard" | "dual" | "triple" =
      typeof densityOrDual === "boolean"
        ? densityOrDual
          ? "dual"
          : "standard"
        : densityOrDual;
    const isDual = density === "dual";
    const isTriple = density === "triple";
    const effectiveCopy =
      copy === "all" || copy === "eco-dual" || copy === "eco-triple" || copy === "eco-3in2"
        ? "original"
        : copy;
    const copyBadge = getRule48CopyBadge(effectiveCopy);

    return (
      <div
        className={`print-invoice-sheet w-full max-w-[794px] bg-white text-stone-900 border-2 border-stone-900 flex flex-col justify-between ${
          isTriple
            ? "p-2.5 space-y-1 shadow-xs text-[9px] print:p-1.5 print:space-y-0.5 print:shadow-none print:m-0 print:w-full"
            : isDual
            ? "p-4 space-y-1.5 shadow-xs text-[10px] print:p-2 print:space-y-1 print:shadow-none print:m-0 print:w-full"
            : "p-6 md:p-8 shadow-sm text-xs space-y-2.5 print:shadow-none print:p-2.5 print:space-y-1 print:m-0 print:w-full"
        }`}
      >
        <div>
          {/* Header Badge */}
          <div className="border-b-2 border-slate-900 pb-1.5 text-center print:pb-0.5">
            <h2 className={`${isTriple ? "text-xs print:text-[10px]" : isDual ? "text-sm" : "text-base md:text-lg"} font-black uppercase tracking-wider text-slate-900 print:text-xs`}>
              {docConfig.title}
            </h2>
            {!isTriple && (
              <p className="text-[9px] font-bold uppercase text-slate-600 print:text-[8px]">
                (Under Rule 46 of the Central Goods and Services Tax Rules, 2017)
              </p>
            )}
            <div className={`inline-block mt-0.5 px-2.5 py-0.5 border border-slate-900 font-black tracking-wider uppercase bg-slate-100 print:px-1.5 print:py-0 ${isTriple ? "text-[8px]" : "text-[9px]"}`}>
              {copyBadge.badge} — {copyBadge.sub}
            </div>
          </div>

          {/* Two Column Grid for Seller & Invoice Particulars */}
          <div className="grid grid-cols-2 border-b-2 border-slate-900">
            <div className="p-2 border-r-2 border-slate-900 space-y-0.5 print:p-1.5 print:space-y-0">
              <h1 className="text-sm font-black text-slate-900 uppercase print:text-xs">
                {profile?.tradeName || profile?.businessName}
              </h1>
              {profile?.tradeName && profile.tradeName !== profile.businessName && (
                <p className="text-[10px] font-semibold text-slate-600 print:text-[9px]">Legal: {profile.businessName}</p>
              )}
              <p className="text-[10px] text-slate-700 leading-snug print:text-[9px] print:leading-tight">{profile?.address}</p>
              <p className="text-[10px] text-slate-700 print:text-[9px]">
                {profile?.city ? `${profile.city}, ` : ""}
                {profile?.state} {profile?.pincode ? `- ${profile.pincode}` : ""}
              </p>
              <p className="font-bold text-[10px] print:text-[9px]">
                GSTIN: <span className="font-mono">{profile?.gstin || "URP"}</span> | State Code:{" "}
                <span className="font-mono">{profile?.stateCode || "—"}</span>
              </p>
              {profile?.phone && <p className="text-[10px] print:text-[9px]">Phone: {profile.phone}</p>}
            </div>

            <div className="p-2 space-y-0.5 bg-slate-50/50 print:p-1.5 print:space-y-0 print:text-[9.5px]">
              <div className="flex justify-between">
                <span className="font-bold">Invoice Number:</span>
                <span className="font-mono font-bold text-slate-900">{details.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Invoice Date:</span>
                <span className="font-mono">{details.invoiceDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Place of Supply:</span>
                <span>{details.placeOfSupply ? `${details.placeOfSupply} - ${getStateNameFromCode(details.placeOfSupply)}` : "Intra-State"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Reverse Charge (RCM):</span>
                <span>{details.reverseCharge ? "Yes" : "No"}</span>
              </div>
              {details.eWayBillNo && (
                <div className="flex justify-between">
                  <span className="font-bold">e-Way Bill No:</span>
                  <span className="font-mono">{details.eWayBillNo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Billed To (Buyer) & Shipped To Grid */}
          <div className="grid grid-cols-2 border-b-2 border-slate-900">
            <div className="p-2 border-r-2 border-slate-900 space-y-0.5 print:p-1.5 print:space-y-0">
              <h3 className="font-bold uppercase text-[9px] text-slate-500 tracking-wider">
                Billed To (Buyer):
              </h3>
              <p className="font-bold text-slate-900 text-xs print:text-[11px]">{client.name || "Cash Customer"}</p>
              <p className="text-[10px] text-slate-700 print:text-[9px] print:leading-tight">{client.address || "Address not provided"}</p>
              <p className="font-bold text-[10px] print:text-[9px]">
                GSTIN: <span className="font-mono">{client.gstin || "Unregistered (B2C)"}</span>
              </p>
            </div>

            <div className="p-2 space-y-0.5 bg-slate-50/50 print:p-1.5 print:space-y-0 print:text-[9.5px]">
              <h3 className="font-bold uppercase text-[9px] text-slate-500 tracking-wider">
                Shipped To (Consignee):
              </h3>
              <p className="font-bold text-slate-900 print:text-[11px]">{client.name || "Same as Billed To"}</p>
              <p className="text-[10px] text-slate-700 print:text-[9px] print:leading-tight">{client.address || "Same as Billing Address"}</p>
              {details.poNumber && (
                <p className="text-[10px] print:text-[9px]">
                  <span className="font-semibold">Buyer PO No:</span> {details.poNumber}
                </p>
              )}
            </div>
          </div>

          {/* Classic Itemized Table */}
          <table className={`w-full text-left border-collapse border-b-2 border-slate-900 ${isTriple ? "text-[8.5px] print:text-[7.5px]" : "text-[10px] print:text-[9.5px]"}`}>
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-900 font-bold text-slate-900">
                <th className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 w-6 text-center`}>#</th>
                <th className={`${isTriple ? "py-0.5 px-1.5 print:py-0 print:px-1" : "py-1 px-2 print:py-0.5 print:px-1.5"} border-r border-slate-900`}>Item Description</th>
                <th className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-center`}>HSN</th>
                <th className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-right`}>Qty</th>
                <th className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-right`}>Rate</th>
                <th className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-right`}>Disc</th>
                {docConfig.hasTax && (
                  <th className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-right`}>GST %</th>
                )}
                <th className={`${isTriple ? "py-0.5 px-1.5 print:py-0 print:px-1" : "py-1 px-2 print:py-0.5 print:px-1.5"} text-right`}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b-2 border-slate-900">
              {items.map((it, idx) => {
                const qty = Number(it.quantity) || 0;
                const rate = Number(it.rate) || 0;
                const disc = Number(it.discount) || 0;
                const lineTaxable = qty * rate - (it.discountType === "percent" ? (qty * rate * disc) / 100 : disc);
                return (
                  <tr key={idx} className="print-avoid-break">
                    <td className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-center font-mono`}>{idx + 1}</td>
                    <td className={`${isTriple ? "py-0.5 px-1.5 print:py-0 print:px-1" : "py-1 px-2 print:py-0.5 print:px-1.5"} border-r border-slate-900 font-medium`}>
                      <div className="font-bold text-slate-900">{it.name}</div>
                    </td>
                    <td className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-center font-mono`}>{it.hsn || "—"}</td>
                    <td className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-right font-mono tabular-nums`}>
                      {qty} {it.unit || ""}
                    </td>
                    <td className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-right font-mono tabular-nums`}>
                      {formatINR(rate)}
                    </td>
                    <td className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-right font-mono tabular-nums`}>
                      {disc > 0 ? (it.discountType === "percent" ? `${disc}%` : formatINR(disc)) : "—"}
                    </td>
                    {docConfig.hasTax && (
                      <td className={`${isTriple ? "py-0.5 px-1 print:py-0 print:px-0.5" : "py-1 px-1.5 print:py-0.5 print:px-1"} border-r border-slate-900 text-right font-mono tabular-nums`}>
                        {it.taxPercent}%
                      </td>
                    )}
                    <td className={`${isTriple ? "py-0.5 px-1.5 print:py-0 print:px-1" : "py-1 px-2 print:py-0.5 print:px-1.5"} text-right font-bold font-mono tabular-nums`}>
                      {formatINR(lineTaxable)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Classic Bottom Split */}
          <div className="grid grid-cols-2 border-b-2 border-slate-900">
            <div className="p-2 border-r-2 border-slate-900 space-y-1 print:p-1.5 print:space-y-0.5">
              <div>
                <span className="font-bold text-[9px] uppercase text-slate-500 block">
                  Amount In Words:
                </span>
                <p className="font-bold text-[10px] capitalize text-slate-900 print:text-[9.5px]">
                  {numberToWords(effectiveTotals.grandTotal)}
                </p>
              </div>

              <div className="border border-slate-900 p-1.5 rounded space-y-0.5 text-[9px] print:p-1 print:space-y-0">
                <p className="font-bold uppercase text-slate-900 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Bank: {profile?.bankName || "HDFC Bank"}
                </p>
                <p>A/C: <span className="font-mono font-bold">{profile?.accountNumber || "—"}</span> | IFSC: <span className="font-mono font-bold">{profile?.ifsc || "—"}</span></p>
                {profile?.upiId && (
                  <p>UPI ID: <span className="font-mono font-bold text-blue-700">{profile.upiId}</span></p>
                )}
              </div>
            </div>

            <div className="p-2 space-y-0.5 text-[10px] print:p-1.5 print:space-y-0 print:text-[9.5px]">
              <div className="flex justify-between">
                <span>Taxable Amount:</span>
                <span className="font-mono font-bold tabular-nums">{formatINR(effectiveTotals.taxableAmount)}</span>
              </div>
              {docConfig.hasTax && (
                <>
                  {!effectiveTotals.isInterstate ? (
                    <>
                      <div className="flex justify-between">
                        <span>CGST:</span>
                        <span className="font-mono font-semibold tabular-nums">{formatINR(effectiveTotals.cgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST:</span>
                        <span className="font-mono font-semibold tabular-nums">{formatINR(effectiveTotals.sgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>IGST:</span>
                      <span className="font-mono font-semibold tabular-nums">{formatINR(effectiveTotals.igst)}</span>
                    </div>
                  )}
                </>
              )}
              {effectiveTotals.roundOff !== 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Round Off:</span>
                  <span className="font-mono tabular-nums">{effectiveTotals.roundOff > 0 ? `+${effectiveTotals.roundOff}` : effectiveTotals.roundOff}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black pt-1 border-t-2 border-slate-900 print:text-[11px] print:pt-0.5">
                <span>TOTAL VALUE:</span>
                <span className="font-mono text-sm tabular-nums print:text-xs">{formatINR(effectiveTotals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Classic Footer Signatory */}
        <div className="grid grid-cols-2 pt-1.5 text-[9px] print:pt-1 print:text-[8.5px]">
          <div className="space-y-0.5 pr-2">
            <p className="text-slate-600 leading-tight">
              Declaration: Actual price of goods described; particulars true and correct.
            </p>
          </div>

          <div className="flex flex-col items-end text-center space-y-0.5">
            <p className="font-bold text-slate-900">
              For {profile?.tradeName || profile?.businessName}
            </p>
            <div className="h-8 w-28 border-b border-dashed border-slate-400 flex items-center justify-center print:h-6 print:w-24">
              {profile?.signatureUrl ? (
                <img src={profile.signatureUrl} alt="Signature" className="max-h-7 max-w-full" />
              ) : null}
            </div>
            <p className="text-[8px] text-slate-600 font-semibold">Authorised Signatory</p>
          </div>
        </div>

        {/* Statutory Footnote */}
        <div className="text-[8px] text-slate-400 text-center pt-1 border-t border-slate-200 select-none print:pt-0.5">
          This is a computer-generated tax invoice issued in accordance with Section 31 of the CGST Act, 2017.
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /* TEMPLATE 3: MINIMALIST (Clean Swiss Typography with Rich Space Fit)*/
  /* ------------------------------------------------------------------ */
  const renderMinimalist = (
    copy: Rule48CopyType,
    densityOrDual: "standard" | "dual" | "triple" | boolean = "standard"
  ) => {
    const density: "standard" | "dual" | "triple" =
      typeof densityOrDual === "boolean"
        ? (densityOrDual ? "dual" : "standard")
        : densityOrDual;
    const isDual = density === "dual";
    const isTriple = density === "triple";
    const effectiveCopy =
      copy === "all" || copy === "eco-dual" || copy === "eco-triple" || copy === "eco-3in2"
        ? "original"
        : copy;
    const copyBadge = getRule48CopyBadge(effectiveCopy);

    return (
      <div
        className={`print-invoice-sheet w-full max-w-[794px] bg-white text-slate-900 rounded-none border-t-8 border-slate-950 flex flex-col justify-between ${
          isTriple
            ? "p-2.5 space-y-1 shadow-xs text-[9px] print:p-1.5 print:space-y-0.5 print:shadow-none print:m-0 print:w-full"
            : isDual
            ? "p-4 space-y-2 shadow-xs text-[10px] print:p-2 print:space-y-1 print:shadow-none print:m-0 print:w-full"
            : "p-6 md:p-8 shadow-sm text-xs space-y-3.5 print:shadow-none print:p-3 print:space-y-1.5 print:m-0 print:w-full"
        }`}
      >
        <div>
          {/* Minimalist Header */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-200 print:pb-2">
            <div>
              <h1 className={`${isTriple ? "text-sm md:text-base print:text-xs" : isDual ? "text-lg md:text-xl print:text-sm" : "text-xl md:text-2xl print:text-lg"} font-black tracking-tight text-slate-950`}>
                {profile?.tradeName || profile?.businessName}
              </h1>
              <p className={`text-slate-500 mt-0.5 leading-relaxed max-w-xs ${isTriple ? "text-[8.5px] print:text-[8px] print:leading-tight" : "text-xs print:text-[9.5px] print:leading-tight"}`}>{profile?.address}</p>
              <p className={`text-slate-500 ${isTriple ? "text-[8.5px] print:text-[8px]" : "text-xs print:text-[9.5px]"}`}>
                {profile?.city ? `${profile.city}, ` : ""}{profile?.state} {profile?.pincode}
              </p>
              <p className={`text-slate-900 font-mono font-bold mt-1 print:mt-0.5 ${isTriple ? "text-[8.5px] print:text-[8px]" : "text-xs print:text-[9.5px]"}`}>
                GSTIN: {profile?.gstin || "URP"}
              </p>
            </div>

            <div className="text-right space-y-0.5 print:space-y-0">
              <div className="inline-block px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border border-slate-300 text-slate-700 bg-slate-50 print:px-2 print:py-0">
                {copyBadge.badge}
              </div>
              <span className="text-xs font-extrabold tracking-widest uppercase text-slate-400 block print:text-[10px]">
                {docConfig.title}
              </span>
              <p className="text-xl md:text-2xl font-black font-mono tracking-tight text-slate-950 print:text-base">
                {details.invoiceNumber}
              </p>
              <p className="text-slate-500 text-xs print:text-[9.5px]">Date: <span className="font-semibold text-slate-900">{details.invoiceDate}</span></p>
              <p className="text-slate-500 text-xs print:text-[9.5px]">Place of Supply: <span className="font-semibold text-slate-900">{details.placeOfSupply || "Local"}</span></p>
            </div>
          </div>

          {/* Minimalist Recipient & Remittance */}
          <div className="py-3 border-b border-slate-200 grid grid-cols-2 gap-4 print:py-1.5 print:gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                Billed To
              </p>
              <p className="font-black text-slate-950 text-sm print:text-xs">{client.name || "Cash Customer"}</p>
              <p className="text-slate-600 text-xs mt-0.5 print:text-[9.5px] print:leading-tight">{client.address || "Address not provided"}</p>
              <p className="text-slate-900 font-mono font-bold text-xs mt-0.5 print:text-[9.5px]">
                GSTIN: {client.gstin || "Unregistered"}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 print:gap-2">
              {qrDataUrl && (
                <img src={qrDataUrl} alt="UPI QR" className="w-12 h-12 border border-slate-200 p-0.5 print:w-9 print:h-9" />
              )}
              <div className="text-right text-xs print:text-[9.5px]">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                  Payment Remittance
                </p>
                <p className="font-bold text-slate-900">{profile?.bankName || "Bank Transfer"}</p>
                <p className="font-mono text-slate-600">A/C: {profile?.accountNumber || "—"}</p>
                <p className="font-mono text-slate-600">IFSC: {profile?.ifsc || "—"}</p>
                {profile?.upiId && <p className="font-mono text-[10px] text-blue-700 print:text-[9px]">UPI: {profile.upiId}</p>}
              </div>
            </div>
          </div>

          {/* Minimalist Items Table */}
          <table className={`w-full text-left border-collapse ${isTriple ? "my-1 text-[8.5px] print:my-0.5 print:text-[7.5px]" : "my-3 text-xs print:my-1.5 print:text-[10px]"}`}>
            <thead>
              <tr className="border-b-2 border-slate-950 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                <th className={`${isTriple ? "py-0.5 px-1 w-5 print:py-0" : "py-1.5 px-1 w-6 print:py-1"}`}>#</th>
                <th className={`${isTriple ? "py-0.5 px-1.5 print:py-0 print:px-1" : "py-1.5 px-2 print:py-1 print:px-1.5"}`}>Item Description</th>
                <th className={`${isTriple ? "py-0.5 px-1 text-center print:py-0" : "py-1.5 px-2 text-center print:py-1 print:px-1"}`}>HSN</th>
                <th className={`${isTriple ? "py-0.5 px-1 text-right print:py-0" : "py-1.5 px-2 text-right print:py-1 print:px-1"}`}>Qty</th>
                <th className={`${isTriple ? "py-0.5 px-1 text-right print:py-0" : "py-1.5 px-2 text-right print:py-1 print:px-1"}`}>Rate</th>
                <th className={`${isTriple ? "py-0.5 px-1 text-right print:py-0" : "py-1.5 px-2 text-right print:py-1 print:px-1"}`}>Tax</th>
                <th className={`${isTriple ? "py-0.5 px-1.5 text-right print:py-0 print:px-1" : "py-1.5 px-2 text-right print:py-1 print:px-1.5"}`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => {
                const qty = Number(it.quantity) || 0;
                const rate = Number(it.rate) || 0;
                const disc = Number(it.discount) || 0;
                const lineTaxable = qty * rate - (it.discountType === "percent" ? (qty * rate * disc) / 100 : disc);
                return (
                  <tr key={idx} className="print-avoid-break">
                    <td className={`${isTriple ? "py-0.5 px-1 print:py-0" : "py-1.5 px-1 print:py-1"} text-slate-400 font-mono`}>{idx + 1}</td>
                    <td className={`${isTriple ? "py-0.5 px-1.5 print:py-0 print:px-1" : "py-1.5 px-2 print:py-1 print:px-1.5"} font-bold text-slate-900`}>{it.name}</td>
                    <td className={`${isTriple ? "py-0.5 px-1 text-center print:py-0" : "py-1.5 px-2 text-center print:py-1 print:px-1"} font-mono text-slate-500`}>{it.hsn || "—"}</td>
                    <td className={`${isTriple ? "py-0.5 px-1 text-right print:py-0" : "py-1.5 px-2 text-right print:py-1 print:px-1"} font-mono tabular-nums`}>{qty} {it.unit}</td>
                    <td className={`${isTriple ? "py-0.5 px-1 text-right print:py-0" : "py-1.5 px-2 text-right print:py-1 print:px-1"} font-mono tabular-nums`}>{formatINR(rate)}</td>
                    <td className={`${isTriple ? "py-0.5 px-1 text-right print:py-0" : "py-1.5 px-2 text-right print:py-1 print:px-1"} font-mono tabular-nums`}>{it.taxPercent || 0}%</td>
                    <td className={`${isTriple ? "py-0.5 px-1.5 text-right print:py-0 print:px-1" : "py-1.5 px-2 text-right print:py-1 print:px-1.5"} font-mono font-bold tabular-nums`}>{formatINR(lineTaxable)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Minimalist HSN Tax Breakdown (Uses empty space productively) */}
          {docConfig.hasTax && hsnSummary.length > 0 && !isTriple && (
            <div className="pt-2 border-t border-slate-100 print:pt-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                HSN / SAC Tax Breakdown:
              </span>
              <table className="w-full text-left text-[10px] border border-slate-100 print:text-[9px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-1 px-1.5 print:py-0.5 print:px-1">HSN</th>
                    <th className="py-1 px-1.5 text-right print:py-0.5 print:px-1">Taxable</th>
                    {!effectiveTotals.isInterstate ? (
                      <>
                        <th className="py-1 px-1.5 text-right print:py-0.5 print:px-1">CGST</th>
                        <th className="py-1 px-1.5 text-right print:py-0.5 print:px-1">SGST</th>
                      </>
                    ) : (
                      <th className="py-1 px-1.5 text-right print:py-0.5 print:px-1">IGST</th>
                    )}
                    <th className="py-1 px-1.5 text-right print:py-0.5 print:px-1">Tax Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {hsnSummary.map((h, i) => (
                    <tr key={i} className="print-avoid-break">
                      <td className="py-0.5 px-1.5 font-bold print:px-1">{h.hsn}</td>
                      <td className="py-0.5 px-1.5 text-right print:px-1">{formatINR(h.taxable)}</td>
                      {!effectiveTotals.isInterstate ? (
                        <>
                          <td className="py-0.5 px-1.5 text-right print:px-1">{formatINR(h.cgst)}</td>
                          <td className="py-0.5 px-1.5 text-right print:px-1">{formatINR(h.sgst)}</td>
                        </>
                      ) : (
                        <td className="py-0.5 px-1.5 text-right print:px-1">{formatINR(h.igst)}</td>
                      )}
                      <td className="py-0.5 px-1.5 text-right font-bold print:px-1">{formatINR(h.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Minimalist Totals */}
          <div className="py-2.5 border-t-2 border-slate-950 flex justify-end print:py-1.5">
            <div className="w-64 space-y-1 text-xs print:space-y-0.5 print:text-[10px]">
              <div className="flex justify-between text-slate-500">
                <span>Taxable Total:</span>
                <span className="font-mono tabular-nums">{formatINR(effectiveTotals.taxableAmount)}</span>
              </div>
              {docConfig.hasTax && (
                <>
                  {!effectiveTotals.isInterstate ? (
                    <>
                      <div className="flex justify-between text-slate-500">
                        <span>CGST:</span>
                        <span className="font-mono tabular-nums">{formatINR(effectiveTotals.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>SGST:</span>
                        <span className="font-mono tabular-nums">{formatINR(effectiveTotals.sgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-500">
                      <span>IGST:</span>
                      <span className="font-mono tabular-nums">{formatINR(effectiveTotals.igst)}</span>
                    </div>
                  )}
                </>
              )}
              {effectiveTotals.cess > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Cess:</span>
                  <span className="font-mono tabular-nums">{formatINR(effectiveTotals.cess)}</span>
                </div>
              )}
              {effectiveTotals.roundOff !== 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Round Off:</span>
                  <span className="font-mono tabular-nums">{effectiveTotals.roundOff}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-900 print:text-xs print:pt-0.5">
                <span>AMOUNT DUE:</span>
                <span className="font-mono tabular-nums">{formatINR(effectiveTotals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Footer */}
        <div className="pt-2 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500 print:pt-1 print:text-[9px]">
          <div>
            <p className="font-bold text-slate-900">Thank you for your business.</p>
            <p className="text-[9px] print:text-[8px]">Payment is due within {details.dueDate || "the agreed period"}. Subject to local jurisdiction.</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-900">{profile?.tradeName || profile?.businessName}</p>
            <p className="text-[9px] print:text-[8px]">Authorized Signatory</p>
          </div>
        </div>

        {/* Statutory Footnote */}
        <div className="text-[8px] text-slate-400 text-center pt-1 border-t border-slate-100 select-none print:pt-0.5">
          This is a computer-generated tax invoice issued in accordance with Section 31 of the CGST Act, 2017.
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /* TEMPLATE 4: COMPACT (Dense Fit with Ruled Rows & HSN Breakdown)    */
  /* ------------------------------------------------------------------ */
  const renderCompact = (
    copy: Rule48CopyType,
    densityOrDual: "standard" | "dual" | "triple" | boolean = "standard"
  ) => {
    const density: "standard" | "dual" | "triple" =
      typeof densityOrDual === "boolean"
        ? (densityOrDual ? "dual" : "standard")
        : densityOrDual;
    const isDual = density === "dual";
    const isTriple = density === "triple";
    const effectiveCopy =
      copy === "all" || copy === "eco-dual" || copy === "eco-triple" || copy === "eco-3in2"
        ? "original"
        : copy;
    const copyBadge = getRule48CopyBadge(effectiveCopy);

    return (
      <div
        className={`print-invoice-sheet w-full max-w-[794px] bg-white text-stone-900 rounded-none md:rounded-xs border border-stone-300 flex flex-col justify-between ${
          isTriple
            ? "p-2 space-y-0.5 shadow-xs text-[8.5px] print:p-1 print:shadow-none print:m-0 print:w-full"
            : isDual
            ? "p-3 space-y-1 shadow-xs text-[10px] print:p-2 print:shadow-none print:m-0 print:w-full"
            : "p-5 md:p-6 shadow-sm text-[11px] space-y-2.5 print:shadow-none print:p-2.5 print:space-y-1 print:m-0 print:w-full"
        }`}
      >
        <div>
          {/* Compact Header Bar */}
          <div className="flex justify-between items-center pb-2 border-b-2 border-slate-900 gap-4 print:pb-1 print:gap-2">
            <div className="flex items-center gap-2.5">
              {profile?.logoUrl && (
                <img src={profile.logoUrl} alt="Logo" className="h-7 w-auto object-contain print:h-6" />
              )}
              <div>
                <h1 className="text-sm font-black uppercase text-slate-900 print:text-xs">
                  {profile?.tradeName || profile?.businessName}
                </h1>
                <p className="text-[9px] text-slate-600 print:text-[8.5px]">
                  {profile?.address} | GSTIN: <span className="font-mono font-bold">{profile?.gstin || "URP"}</span> | Ph: {profile?.phone}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5 mb-0.5">
                <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-bold rounded uppercase">
                  {docConfig.title}
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-[8px] font-black rounded uppercase">
                  {copyBadge.badge}
                </span>
              </div>
              <p className="font-mono font-bold text-xs text-slate-900 print:text-[11px]">{details.invoiceNumber}</p>
              <p className="text-[9px] text-slate-500 print:text-[8.5px]">{details.invoiceDate}</p>
            </div>
          </div>

          {/* Compact Bill To Strip */}
          <div className="grid grid-cols-3 bg-slate-50 p-1.5 my-1.5 border border-slate-200 rounded-lg text-[9px] print:my-1 print:p-1 print:text-[8.5px]">
            <div>
              <span className="text-slate-400 font-bold uppercase block">Billed To:</span>
              <p className="font-bold text-slate-900 text-xs print:text-[10px]">{client.name || "Cash Customer"}</p>
              <p className="text-slate-600 truncate">{client.address}</p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase block">GSTIN / State:</span>
              <p className="font-mono font-bold text-slate-900">{client.gstin || "B2C Consumer"}</p>
              <p className="text-slate-600">{client.state || "India"} ({client.stateCode || "—"})</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase block">Place of Supply:</span>
              <p className="font-bold text-slate-900">{details.placeOfSupply || "Local"}</p>
              <p className="text-slate-600">{effectiveTotals.isInterstate ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}</p>
            </div>
          </div>

          {/* Compact Dense Items Table */}
          <table className="w-full text-left border-collapse border border-slate-300 text-[10px] print:text-[9.5px]">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-300">
                <th className="py-1 px-1.5 w-6 text-center print:py-0.5 print:px-1">#</th>
                <th className="py-1 px-2 print:py-0.5 print:px-1.5">Item Description</th>
                <th className="py-1 px-1 text-center print:py-0.5 print:px-1">HSN</th>
                <th className="py-1 px-1 text-right print:py-0.5 print:px-1">Qty</th>
                <th className="py-1 px-1 text-right print:py-0.5 print:px-1">Rate</th>
                <th className="py-1 px-1 text-right print:py-0.5 print:px-1">Disc</th>
                {docConfig.hasTax && <th className="py-1 px-1 text-right print:py-0.5 print:px-1">Tax%</th>}
                <th className="py-1 px-2 text-right print:py-0.5 print:px-1.5">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it, idx) => {
                const qty = Number(it.quantity) || 0;
                const rate = Number(it.rate) || 0;
                const disc = Number(it.discount) || 0;
                const lineTaxable = qty * rate - (it.discountType === "percent" ? (qty * rate * disc) / 100 : disc);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 print-avoid-break">
                    <td className="py-1 px-1.5 text-center font-mono text-slate-400 print:py-0.5 print:px-1">{idx + 1}</td>
                    <td className="py-1 px-2 font-bold text-slate-900 print:py-0.5 print:px-1.5">{it.name}</td>
                    <td className="py-1 px-1 text-center font-mono text-slate-600 print:py-0.5 print:px-1">{it.hsn || "—"}</td>
                    <td className="py-1 px-1 text-right font-mono tabular-nums print:py-0.5 print:px-1">{qty} {it.unit}</td>
                    <td className="py-1 px-1 text-right font-mono tabular-nums print:py-0.5 print:px-1">{formatINR(rate)}</td>
                    <td className="py-1 px-1 text-right font-mono tabular-nums print:py-0.5 print:px-1">{disc > 0 ? formatINR(disc) : "—"}</td>
                    {docConfig.hasTax && (
                      <td className="py-1 px-1 text-right font-mono tabular-nums print:py-0.5 print:px-1">{it.taxPercent}%</td>
                    )}
                    <td className="py-1 px-2 text-right font-bold font-mono tabular-nums print:py-0.5 print:px-1.5">{formatINR(lineTaxable)}</td>
                  </tr>
                );
              })}

              {/* Ruled Balance Rows when item count is small in screen mode */}
              {items.length < 3 && !isDual && !isTriple && Array.from({ length: 3 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="text-slate-300 print:hidden">
                  <td className="py-1 px-1.5 text-center font-mono">{items.length + i + 1}</td>
                  <td className="py-1 px-2 italic text-[9px] text-slate-300">—</td>
                  <td className="py-1 px-1 text-center font-mono">—</td>
                  <td className="py-1 px-1 text-right font-mono">—</td>
                  <td className="py-1 px-1 text-right font-mono">—</td>
                  <td className="py-1 px-1 text-right font-mono">—</td>
                  {docConfig.hasTax && <td className="py-1 px-1 text-right font-mono">—</td>}
                  <td className="py-1 px-2 text-right font-mono">—</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Compact HSN Summary Breakdown */}
          {docConfig.hasTax && hsnSummary.length > 0 && !isTriple && (
            <div className="pt-1.5 border-t border-slate-200 print:pt-1">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Rule 46 HSN/SAC Tax Summary:
              </span>
              <table className="w-full text-left text-[9px] border border-slate-200 print:text-[8.5px]">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                  <tr>
                    <th className="py-0.5 px-1.5 print:py-0.2 print:px-1">HSN</th>
                    <th className="py-0.5 px-1.5 text-right print:py-0.2 print:px-1">Taxable</th>
                    {!effectiveTotals.isInterstate ? (
                      <>
                        <th className="py-0.5 px-1.5 text-right print:py-0.2 print:px-1">CGST</th>
                        <th className="py-0.5 px-1.5 text-right print:py-0.2 print:px-1">SGST</th>
                      </>
                    ) : (
                      <th className="py-0.5 px-1.5 text-right print:py-0.2 print:px-1">IGST</th>
                    )}
                    <th className="py-0.5 px-1.5 text-right print:py-0.2 print:px-1">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {hsnSummary.map((h, i) => (
                    <tr key={i} className="print-avoid-break">
                      <td className="py-0.5 px-1.5 font-bold print:px-1">{h.hsn}</td>
                      <td className="py-0.5 px-1.5 text-right print:px-1">{formatINR(h.taxable)}</td>
                      {!effectiveTotals.isInterstate ? (
                        <>
                          <td className="py-0.5 px-1.5 text-right print:px-1">{formatINR(h.cgst)}</td>
                          <td className="py-0.5 px-1.5 text-right print:px-1">{formatINR(h.sgst)}</td>
                        </>
                      ) : (
                        <td className="py-0.5 px-1.5 text-right print:px-1">{formatINR(h.igst)}</td>
                      )}
                      <td className="py-0.5 px-1.5 text-right font-bold print:px-1">{formatINR(h.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Compact Summary Strip */}
          <div className="grid grid-cols-2 gap-3 mt-1.5 pt-1.5 border-t border-slate-200 print:mt-1 print:pt-1 print:gap-2">
            <div className="space-y-1 text-[9px] print:space-y-0.5 print:text-[8.5px]">
              <p className="font-bold text-slate-800">
                In Words: <span className="font-semibold text-slate-600">{numberToWords(effectiveTotals.grandTotal)}</span>
              </p>
              <div className="p-1.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between print:p-1">
                <div>
                  <p className="font-bold">Bank: {profile?.bankName || "HDFC Bank"}</p>
                  <p className="font-mono">A/C: {profile?.accountNumber} | IFSC: {profile?.ifsc}</p>
                  {profile?.upiId && <p className="font-mono font-bold text-blue-700">UPI: {profile.upiId}</p>}
                </div>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="UPI QR" className="w-10 h-10 border border-slate-300 p-0.5 print:w-8 print:h-8" />
                )}
              </div>
            </div>

            <div className="space-y-0.5 text-[10px] print:space-y-0 print:text-[9px]">
              <div className="flex justify-between">
                <span>Taxable Value:</span>
                <span className="font-mono tabular-nums">{formatINR(effectiveTotals.taxableAmount)}</span>
              </div>
              {!effectiveTotals.isInterstate ? (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST:</span>
                    <span className="font-mono tabular-nums">{formatINR(effectiveTotals.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST:</span>
                    <span className="font-mono tabular-nums">{formatINR(effectiveTotals.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-600">
                  <span>IGST:</span>
                  <span className="font-mono tabular-nums">{formatINR(effectiveTotals.igst)}</span>
                </div>
              )}
              {effectiveTotals.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono tabular-nums">{effectiveTotals.roundOff}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-900">
                <span>NET PAYABLE:</span>
                <span className="font-mono text-sm tabular-nums">{formatINR(effectiveTotals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Bottom Signatory */}
        <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center text-[9px]">
          <span className="text-slate-500">E. & O.E. | Goods once sold will not be returned.</span>
          <div className="text-right font-bold text-slate-800">
            For {profile?.tradeName || profile?.businessName} (Authorized Signatory)
          </div>
        </div>

        {/* Statutory Footnote */}
        <div className="text-[8px] text-slate-400 text-center pt-0.5 border-t border-slate-100 select-none">
          This is a computer-generated tax invoice issued in accordance with Section 31 of the CGST Act, 2017.
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /* TEMPLATE 5: MODERN (Fintech SaaS Template with Brand Accents)     */
  /* ------------------------------------------------------------------ */
  const renderModern = (
    copy: Rule48CopyType,
    densityOrDual: "standard" | "dual" | "triple" | boolean = "standard"
  ) => {
    const density: "standard" | "dual" | "triple" =
      typeof densityOrDual === "boolean"
        ? (densityOrDual ? "dual" : "standard")
        : densityOrDual;
    const isDual = density === "dual";
    const isTriple = density === "triple";
    const effectiveCopy =
      copy === "all" || copy === "eco-dual" || copy === "eco-triple" || copy === "eco-3in2"
        ? "original"
        : copy;
    const copyBadge = getRule48CopyBadge(effectiveCopy);

    return (
      <div
        className={`print-invoice-sheet w-full max-w-[794px] bg-white text-stone-900 rounded-none md:rounded-xs border border-stone-200/90 flex flex-col justify-between ${
          isTriple
            ? "p-2.5 space-y-1 shadow-xs text-[9px] print:p-1.5 print:space-y-0.5 print:shadow-none print:rounded-none print:m-0 print:w-full"
            : isDual
            ? "p-4 space-y-2 shadow-xs text-[10px] print:p-2 print:space-y-1 print:shadow-none print:rounded-none print:m-0 print:w-full"
            : "p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] space-y-3 print:shadow-none print:rounded-none print:p-3 print:space-y-1.5 print:m-0 print:w-full"
        }`}
      >
        <div>
          {/* Modern Header Block */}
          <div className="flex flex-wrap md:flex-nowrap justify-between items-start pb-3 border-b border-stone-200 gap-6 print:flex-nowrap print:pb-2 print:gap-3">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-3 mb-1.5 print:mb-1 print:gap-2">
                {profile?.logoUrl && (
                  <img
                    src={profile.logoUrl}
                    alt="Logo"
                    className="h-9 w-auto object-contain rounded-xs print:h-7"
                  />
                )}
                <div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-stone-900 print:text-base">
                    {profile?.tradeName || profile?.businessName}
                  </h1>
                  {profile?.tradeName && profile.tradeName !== profile.businessName && (
                    <p className="text-xs text-stone-500 font-medium print:text-[9px]">{profile.businessName}</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-stone-600 max-w-sm leading-relaxed print:text-[9.5px] print:leading-tight">{profile?.address}</p>
              <p className="text-xs text-stone-600 print:text-[9.5px]">
                {profile?.city ? `${profile.city}, ` : ""}
                {profile?.state} {profile?.pincode ? `- ${profile.pincode}` : ""}
              </p>

              <div className="mt-1 space-y-0.5 text-xs text-stone-700 print:mt-0.5 print:space-y-0 print:text-[9px]">
                {profile?.gstin && (
                  <p>
                    <span className="font-semibold text-stone-900">GSTIN:</span>{" "}
                    <span className="font-mono uppercase font-bold text-stone-900">{profile.gstin}</span>
                    {profile?.stateCode && (
                      <span className="text-stone-500"> (State Code: {profile.stateCode})</span>
                    )}
                  </p>
                )}
                {profile?.pan && (
                  <p>
                    <span className="font-semibold text-stone-900">PAN:</span>{" "}
                    <span className="font-mono uppercase">{profile.pan}</span>
                  </p>
                )}
                {profile?.phone && <p><span className="font-semibold">Phone:</span> {profile.phone}</p>}
                {profile?.email && <p><span className="font-semibold">Email:</span> {profile.email}</p>}
              </div>
            </div>

            <div className="text-right">
              <div className="flex flex-col items-end gap-1 mb-2 print:mb-1">
                <div className="inline-block px-2.5 py-1 rounded-xs text-xs font-bold tracking-wider uppercase border border-stone-300 bg-stone-50 text-stone-800 print:px-2 print:py-0.5 print:text-[10px]">
                  {docConfig.title}
                </div>
                <div className="inline-block px-2 py-0.5 rounded-xs text-[9px] font-semibold uppercase tracking-wider border border-stone-200 text-stone-600 bg-white print:px-1.5 print:py-0">
                  <span className="font-bold text-stone-900">{copyBadge.badge}</span>
                  <span className="text-stone-400 ml-1 text-[8px] font-medium">{copyBadge.sub}</span>
                </div>
              </div>

              <div className="space-y-0.5 text-xs text-stone-700 print:space-y-0 print:text-[9px]">
                <p>
                  <span className="text-stone-500 font-medium">Invoice No:</span>{" "}
                  <span className="font-mono font-bold text-stone-900 text-sm print:text-xs">
                    {details.invoiceNumber}
                  </span>
                </p>
                <p>
                  <span className="text-stone-500 font-medium">Invoice Date:</span>{" "}
                  <span className="font-semibold">{details.invoiceDate}</span>
                </p>
                {details.dueDate && (
                  <p>
                    <span className="text-stone-500 font-medium">Due Date:</span>{" "}
                    <span className="font-semibold text-stone-800">{details.dueDate}</span>
                  </p>
                )}
                <p>
                  <span className="text-stone-500 font-medium">Place of Supply:</span>{" "}
                  <span className="font-semibold">
                    {details.placeOfSupply ? `${details.placeOfSupply} - ${getStateNameFromCode(details.placeOfSupply)}` : "Intra-State"}
                  </span>
                </p>
                {details.reverseCharge && (
                  <p className="text-amber-800 font-semibold">Reverse Charge (RCM): Applicable</p>
                )}
              </div>
            </div>
          </div>

          {/* Billed To / Shipped To Modern Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 py-2 border-b border-stone-200 print:gap-2 print:py-1.5">
            <div className="bg-stone-50/60 p-3 rounded-xs border border-stone-200 print:p-2">
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                Billed To (Customer)
              </h3>
              <p className="font-bold text-stone-900 text-sm print:text-xs">{client.name || "Walk-in Customer"}</p>
              {client.tradeName && <p className="text-xs text-stone-600 font-medium print:text-[9px]">{client.tradeName}</p>}
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed print:text-[9px] print:leading-tight">{client.address || "Address not provided"}</p>
              <p className="text-xs text-stone-600 print:text-[9px]">
                {client.city ? `${client.city}, ` : ""}
                {client.state} {client.pincode ? `- ${client.pincode}` : ""}
              </p>
              <div className="mt-1 space-y-0.5 text-xs text-stone-700 print:mt-0.5 print:space-y-0 print:text-[9px]">
                {client.gstin ? (
                  <p>
                    <span className="font-semibold text-stone-900">GSTIN:</span>{" "}
                    <span className="font-mono uppercase font-bold text-stone-900">{client.gstin}</span>
                  </p>
                ) : (
                  <p className="text-stone-500 italic">Unregistered Consumer (B2C)</p>
                )}
              </div>
            </div>

            <div className="bg-stone-50/60 p-3 rounded-xs border border-stone-200 flex flex-col justify-between print:p-2">
              <div>
                <h3 className="text-[9px] font-bold uppercase tracking-wider text-stone-500 mb-0.5">
                  Bank & Payment Particulars
                </h3>
                <p className="text-xs font-semibold text-stone-900 print:text-[9.5px]">
                  Bank: <span className="font-bold">{profile?.bankName || "HDFC Bank"}</span>
                </p>
                <p className="text-xs font-mono text-stone-700 print:text-[9px]">
                  Account: <span className="font-bold">{profile?.accountNumber || "—"}</span>
                </p>
                <p className="text-xs font-mono text-stone-700 print:text-[9px]">
                  IFSC: <span className="font-bold">{profile?.ifsc || "—"}</span>
                </p>
                {profile?.upiId && (
                  <p className="text-xs font-mono font-semibold text-stone-800 mt-0.5 print:text-[9px]">
                    UPI ID: {profile.upiId}
                  </p>
                )}
              </div>

              {qrDataUrl && (
                <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-stone-200 print:mt-1 print:pt-1">
                  <img
                    src={qrDataUrl}
                    alt="UPI QR"
                    className="w-10 h-10 rounded-xs border border-stone-200 bg-white p-0.5 print:w-8 print:h-8"
                  />
                  <div className="text-[9px] text-stone-500">
                    <p className="font-semibold text-stone-800">Scan & Pay via UPI</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modern Items Table */}
          <table className={`w-full text-left border-collapse ${isTriple ? "my-1 text-[8.5px] print:my-0.5 print:text-[7.5px]" : "my-2 text-xs print:my-1.5 print:text-[10px]"}`}>
            <thead>
              <tr className="border-b border-stone-300 text-stone-500 font-bold uppercase text-[9px] tracking-wider">
                <th className={`${isTriple ? "py-1 px-1 w-6" : "py-1.5 px-2 w-8"} text-center print:py-0.5 print:px-1`}>#</th>
                <th className={`${isTriple ? "py-1 px-1.5" : "py-1.5 px-3"} print:py-0.5 print:px-1`}>Item Description</th>
                <th className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-center print:py-0.5 print:px-1`}>HSN/SAC</th>
                <th className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-right print:py-0.5 print:px-1`}>Qty</th>
                <th className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-right print:py-0.5 print:px-1`}>Rate</th>
                <th className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-right print:py-0.5 print:px-1`}>Disc</th>
                {docConfig.hasTax && (
                  <th className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-right print:py-0.5 print:px-1`}>GST %</th>
                )}
                <th className={`${isTriple ? "py-1 px-1.5" : "py-1.5 px-3"} text-right print:py-0.5 print:px-1`}>Taxable Val</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {items.map((it, idx) => {
                const qty = Number(it.quantity) || 0;
                const rate = Number(it.rate) || 0;
                const disc = Number(it.discount) || 0;
                const lineTaxable = qty * rate - (it.discountType === "percent" ? (qty * rate * disc) / 100 : disc);
                return (
                  <tr key={idx} className="hover:bg-stone-50/50 transition print-avoid-break">
                    <td className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-center font-mono text-stone-400 print:py-0.5 print:px-1`}>{idx + 1}</td>
                    <td className={`${isTriple ? "py-1 px-1.5" : "py-1.5 px-3"} print:py-0.5 print:px-1`}>
                      <div className="font-semibold text-stone-900">{it.name}</div>
                    </td>
                    <td className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-center font-mono text-stone-600 print:py-0.5 print:px-1`}>{it.hsn || "—"}</td>
                    <td className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-right font-mono tabular-nums print:py-0.5 print:px-1`}>
                      {qty} <span className="text-[9px] text-stone-500">{it.unit}</span>
                    </td>
                    <td className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-right font-mono tabular-nums print:py-0.5 print:px-1`}>{formatINR(rate)}</td>
                    <td className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-right font-mono tabular-nums print:py-0.5 print:px-1`}>
                      {disc > 0 ? (it.discountType === "percent" ? `${disc}%` : formatINR(disc)) : "—"}
                    </td>
                    {docConfig.hasTax && (
                      <td className={`${isTriple ? "py-1 px-1" : "py-1.5 px-2"} text-right font-mono tabular-nums print:py-0.5 print:px-1`}>{it.taxPercent || 0}%</td>
                    )}
                    <td className={`${isTriple ? "py-1 px-1.5" : "py-1.5 px-3"} text-right font-bold font-mono tabular-nums print:py-0.5 print:px-1`}>
                      {formatINR(lineTaxable)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Modern Totals & In-Words */}
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 py-2 border-t border-stone-200 print:gap-2 print:py-1">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400 block">
                Total Amount In Words:
              </span>
              <p className="font-semibold text-xs capitalize text-stone-900 leading-snug bg-stone-50/70 p-2 rounded-xs border border-stone-200 print:p-1.5 print:text-[9.5px]">
                {numberToWords(effectiveTotals.grandTotal)}
              </p>
            </div>

            <div className="space-y-0.5 text-xs print:space-y-0 print:text-[9.5px]">
              <div className="flex justify-between py-0.5 text-stone-600">
                <span>Taxable Amount:</span>
                <span className="font-mono font-bold tabular-nums text-stone-900">{formatINR(effectiveTotals.taxableAmount)}</span>
              </div>
              {docConfig.hasTax && (
                <>
                  {!effectiveTotals.isInterstate ? (
                    <>
                      <div className="flex justify-between py-0.5 text-stone-600">
                        <span>Central GST (CGST):</span>
                        <span className="font-mono font-medium tabular-nums">{formatINR(effectiveTotals.cgst)}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-stone-600">
                        <span>State GST (SGST):</span>
                        <span className="font-mono font-medium tabular-nums">{formatINR(effectiveTotals.sgst)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between py-0.5 text-stone-600">
                      <span>Integrated GST (IGST):</span>
                      <span className="font-mono font-medium tabular-nums">{formatINR(effectiveTotals.igst)}</span>
                    </div>
                  )}
                </>
              )}

              {effectiveTotals.cess > 0 && (
                <div className="flex justify-between py-0.5 text-stone-600">
                  <span>GST Cess:</span>
                  <span className="font-mono font-medium tabular-nums">{formatINR(effectiveTotals.cess)}</span>
                </div>
              )}

              {effectiveTotals.roundOff !== 0 && (
                <div className="flex justify-between py-0.5 text-stone-500">
                  <span>Round Off:</span>
                  <span className="font-mono font-medium tabular-nums">
                    {effectiveTotals.roundOff > 0 ? `+${effectiveTotals.roundOff}` : effectiveTotals.roundOff}
                  </span>
                </div>
              )}

              {/* Archival Ledger Double-Ruled Grand Total Underline */}
              <div className="flex justify-between items-baseline py-1.5 border-t border-b-2 border-b-stone-900 border-t-stone-300 text-stone-900 mt-1 print:mt-0.5">
                <span className="font-bold text-xs uppercase tracking-wide">Grand Total:</span>
                <span className="text-base font-bold font-mono tabular-nums text-stone-950 print:text-sm">
                  {formatINR(effectiveTotals.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* HSN Tax Summary */}
          {docConfig.hasTax && hsnSummary.length > 0 && !isTriple && (
            <div className="mt-2 pt-2 border-t border-stone-200 print:mt-1 print:pt-1">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                GST Rule 46 — HSN / SAC Tax Summary
              </h4>
              <table className="w-full text-left text-[9px] border border-stone-200 rounded-xs overflow-hidden print:text-[8.5px]">
                <thead className="bg-stone-50 font-semibold text-stone-700">
                  <tr className="border-b border-stone-200">
                    <th className="py-1 px-2 print:py-0.5 print:px-1.5">HSN/SAC</th>
                    <th className="py-1 px-2 text-right print:py-0.5 print:px-1.5">Taxable Val</th>
                    {!effectiveTotals.isInterstate ? (
                      <>
                        <th className="py-1 px-2 text-right print:py-0.5 print:px-1.5">CGST</th>
                        <th className="py-1 px-2 text-right print:py-0.5 print:px-1.5">SGST</th>
                      </>
                    ) : (
                      <th className="py-1 px-2 text-right print:py-0.5 print:px-1.5">IGST</th>
                    )}
                    {effectiveTotals.cess > 0 && <th className="py-1 px-2 text-right print:py-0.5 print:px-1.5">Cess</th>}
                    <th className="py-1 px-2 text-right print:py-0.5 print:px-1.5">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {hsnSummary.map((h, i) => (
                    <tr key={i} className="print-avoid-break">
                      <td className="py-1 px-2 font-bold text-stone-800 print:py-0.5 print:px-1.5">{h.hsn}</td>
                      <td className="py-1 px-2 text-right tabular-nums print:py-0.5 print:px-1.5">{formatINR(h.taxable)}</td>
                      {!effectiveTotals.isInterstate ? (
                        <>
                          <td className="py-1 px-2 text-right tabular-nums print:py-0.5 print:px-1.5">{formatINR(h.cgst)}</td>
                          <td className="py-1 px-2 text-right tabular-nums print:py-0.5 print:px-1.5">{formatINR(h.sgst)}</td>
                        </>
                      ) : (
                        <td className="py-1 px-2 text-right tabular-nums print:py-0.5 print:px-1.5">{formatINR(h.igst)}</td>
                      )}
                      {effectiveTotals.cess > 0 && <td className="py-1 px-2 text-right tabular-nums print:py-0.5 print:px-1.5">{formatINR(h.cess)}</td>}
                      <td className="py-1 px-2 text-right font-bold text-stone-900 tabular-nums print:py-0.5 print:px-1.5">{formatINR(h.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Terms & Signatures Footer */}
        <div className="mt-2.5 pt-2 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-3 items-end print:mt-1.5 print:pt-1 print:gap-2">
          <div className="text-xs text-stone-600 space-y-0.5 print:text-[9px] print:space-y-0">
            <p className="font-bold text-stone-900">Terms & Conditions:</p>
            <p className="text-[9px] leading-tight print:text-[8px]">
              1. Goods once sold will not be taken back.<br />
              2. Subject to local jurisdiction only.
            </p>
          </div>

          <div className="flex flex-col items-end text-center space-y-0.5 print:space-y-0">
            <p className="text-xs font-semibold text-stone-800 print:text-[9.5px]">
              For {profile?.tradeName || profile?.businessName}
            </p>
            <div className={`h-10 w-32 border-b border-stone-300 flex items-center justify-center ${isTriple ? "print:h-5 print:w-20" : "print:h-7 print:w-28"}`}>
              {profile?.signatureUrl ? (
                <img src={profile.signatureUrl} alt="Signature" className="max-h-8 max-w-full print:max-h-6" />
              ) : null}
            </div>
            <p className="text-[9px] text-stone-500 font-medium print:text-[8px]">Authorized Signatory</p>
          </div>
        </div>

        {/* Statutory Footnote */}
        <div className="text-[8px] text-stone-400 text-center pt-1 border-t border-stone-100 select-none print:pt-0.5">
          This is a computer-generated tax invoice issued in accordance with Section 31 of the CGST Act, 2017.
        </div>
      </div>
    );
  };

  /* ------------------------------------------------------------------ */
  /* Main Template Router                                              */
  /* ------------------------------------------------------------------ */
  const renderTemplate = (
    copy: Rule48CopyType,
    densityOrDual: "standard" | "dual" | "triple" | boolean = "standard"
  ) => {
    switch (selectedTemplate) {
      case "thermal":
        return renderThermal(copy);
      case "classic":
        return renderClassic(copy, densityOrDual);
      case "minimalist":
        return renderMinimalist(copy, densityOrDual);
      case "compact":
        return renderCompact(copy, densityOrDual);
      case "modern":
      default:
        return renderModern(copy, densityOrDual);
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-100/80 dark:bg-[#121110] overflow-y-auto">
      {/* Top Toolbar (Hidden on print) */}
      <div className="print:hidden sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Invoice Style Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Style:
            </span>
            <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg text-xs gap-1">
              {templateOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer ${
                    selectedTemplate === t.id
                      ? "bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 shadow-xs font-semibold"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 font-medium"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Rule 48 Copy & Eco-Saver Selector */}
          {selectedTemplate !== "thermal" && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                Print Mode:
              </span>
              <select
                value={selectedCopy}
                onChange={(e) => setSelectedCopy(e.target.value as Rule48CopyType)}
                className="text-xs font-medium bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 outline-none cursor-pointer focus:ring-1 focus:ring-stone-400 shadow-xs"
              >
                <option value="original">Original (Recipient) — 1 Page</option>
                <option value="eco-triple">
                  3-in-1 Eco-Saver (Original, Duplicate, Triplicate on 1 A4){printEligibility.can3in1 ? " — Fits on 1 Sheet" : " — Large Bill"}
                </option>
                <option value="eco-3in2">
                  3-in-2 Eco-Saver (Original on 1 A4, Duplicate & Triplicate on 2nd A4)
                </option>
                <option value="eco-dual">
                  2-in-1 Eco-Saver (Original & Duplicate on 1 A4)
                </option>
                <option value="duplicate">Duplicate (Transporter) — 1 Page</option>
                <option value="triplicate">Triplicate (Supplier) — 1 Page</option>
                <option value="all">All 3 Copies (Rule 48 Triplicate) — 3 Pages</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 text-xs font-medium rounded-lg border border-stone-300 dark:border-stone-700 shadow-xs transition cursor-pointer"
            title="Share invoice on WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-white text-white dark:text-stone-900 text-xs font-medium rounded-lg shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            {selectedCopy === "eco-triple"
              ? "Print 3-in-1 (1 A4 sheet)"
              : selectedCopy === "eco-3in2"
              ? "Print 3-in-2 (2 A4 sheets)"
              : selectedCopy === "eco-dual"
              ? "Print 2-in-1 (1 A4 sheet)"
              : selectedCopy === "all"
              ? "Print 3 copies (Triplicate)"
              : "Print invoice (1 page)"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 flex flex-col items-center p-4 md:p-8">
        {/* Eco-Saver 3-in-1 Banner */}
        {selectedCopy === "eco-triple" && selectedTemplate !== "thermal" && (
          <div className="max-w-[794px] w-full mb-3 px-3.5 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-stone-500 shrink-0" />
              <span>
                <strong>3-in-1 Eco-Saver:</strong> Original, Duplicate, and Triplicate are arranged on a single sheet of A4 paper separated by cutting guides.
              </span>
            </div>
            {printEligibility.can3in1 ? (
              <span className="text-stone-600 dark:text-stone-400 font-medium whitespace-nowrap text-[11px]">
                Fits cleanly on 1 sheet
              </span>
            ) : (
              <span className="text-amber-800 dark:text-amber-400 font-medium whitespace-nowrap text-[11px]">
                {items.length} items (3-in-2 recommended)
              </span>
            )}
          </div>
        )}

        {/* Eco-Saver 3-in-2 Banner */}
        {selectedCopy === "eco-3in2" && selectedTemplate !== "thermal" && (
          <div className="max-w-[794px] w-full mb-3 px-3.5 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-stone-500 shrink-0" />
              <span>
                <strong>3-in-2 Eco-Saver:</strong> Sheet 1 carries the full Original; Sheet 2 carries both Duplicate and Triplicate with a cutting guide.
              </span>
            </div>
            <span className="text-stone-600 dark:text-stone-400 font-medium whitespace-nowrap text-[11px]">
              Fits across 2 sheets
            </span>
          </div>
        )}

        {/* Eco-Saver 2-in-1 Banner */}
        {selectedCopy === "eco-dual" && selectedTemplate !== "thermal" && (
          <div className="max-w-[794px] w-full mb-3 px-3.5 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs flex items-center gap-2">
            <Scissors className="w-4 h-4 text-stone-500 shrink-0" />
            <span>
              <strong>2-in-1 Eco-Saver:</strong> Original and Duplicate are arranged on a single sheet of A4 paper separated by a cutting guide.
            </span>
          </div>
        )}

        {/* Triplicate Info Banner on Screen */}
        {selectedCopy === "all" && selectedTemplate !== "thermal" && (
          <div className="max-w-[794px] w-full mb-3 px-3.5 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs flex items-center gap-2">
            <Printer className="w-4 h-4 text-stone-500 shrink-0" />
            <span>
              <strong>Rule 48 Triplicate:</strong> Original for Recipient, Duplicate for Transporter, and Triplicate for Supplier will print across 3 separate pages.
            </span>
          </div>
        )}

        {/* Visible Print Target Container */}
        <div id="print-area" className="w-full flex flex-col items-center">
          {selectedCopy === "eco-triple" && selectedTemplate !== "thermal" ? (
            <div className="print-invoice-sheet w-full max-w-[794px] flex flex-col items-center justify-between">
              {/* Top: Original for Recipient */}
              <div className="w-full flex justify-center">
                {renderTemplate("original", "triple")}
              </div>

              {/* Dotted Cut Separator 1 */}
              <div className="w-full flex items-center justify-center my-2 print:my-0.5 select-none">
                <div className="border-b border-dashed border-stone-300 w-full" />
                <span className="px-2.5 text-[8px] font-medium text-stone-400 uppercase tracking-widest whitespace-nowrap bg-white dark:bg-stone-900 flex items-center gap-1.5 print:text-[7px]">
                  ✂ Cut guide (Original for Recipient / Duplicate for Transporter)
                </span>
                <div className="border-b border-dashed border-stone-300 w-full" />
              </div>

              {/* Middle: Duplicate for Transporter */}
              <div className="w-full flex justify-center">
                {renderTemplate("duplicate", "triple")}
              </div>

              {/* Dotted Cut Separator 2 */}
              <div className="w-full flex items-center justify-center my-2 print:my-0.5 select-none">
                <div className="border-b border-dashed border-stone-300 w-full" />
                <span className="px-2.5 text-[8px] font-medium text-stone-400 uppercase tracking-widest whitespace-nowrap bg-white dark:bg-stone-900 flex items-center gap-1.5 print:text-[7px]">
                  ✂ Cut guide (Duplicate for Transporter / Triplicate for Supplier)
                </span>
                <div className="border-b border-dashed border-stone-300 w-full" />
              </div>

              {/* Bottom: Triplicate for Supplier */}
              <div className="w-full flex justify-center">
                {renderTemplate("triplicate", "triple")}
              </div>
            </div>
          ) : selectedCopy === "eco-3in2" && selectedTemplate !== "thermal" ? (
            <>
              {/* Sheet 1: Full Original for Recipient */}
              <div className="print-page-break print-invoice-sheet w-full max-w-[794px] mb-8 print:mb-0 flex justify-center">
                {renderTemplate("original", "standard")}
              </div>

              {/* Sheet 2: Duplicate + Triplicate 2-in-1 */}
              <div className="print-invoice-sheet w-full max-w-[794px] flex flex-col items-center justify-between">
                <div className="w-full flex justify-center">
                  {renderTemplate("duplicate", "dual")}
                </div>

                {/* Dotted Cut Separator */}
                <div className="w-full flex items-center justify-center my-3 print:my-1.5 select-none">
                  <div className="border-b border-dashed border-stone-300 w-full" />
                  <span className="px-3 text-[8px] font-medium text-stone-400 uppercase tracking-widest whitespace-nowrap bg-white dark:bg-stone-900 flex items-center gap-1.5">
                    ✂ Cut guide (Duplicate for Transporter / Triplicate for Supplier)
                  </span>
                  <div className="border-b border-dashed border-stone-300 w-full" />
                </div>

                <div className="w-full flex justify-center">
                  {renderTemplate("triplicate", "dual")}
                </div>
              </div>
            </>
          ) : selectedCopy === "eco-dual" && selectedTemplate !== "thermal" ? (
            <div className="print-invoice-sheet w-full max-w-[794px] flex flex-col items-center justify-between">
              {/* Top: Original for Recipient */}
              <div className="w-full flex justify-center">
                {renderTemplate("original", "dual")}
              </div>

              {/* Dotted Cut Separator */}
              <div className="w-full flex items-center justify-center my-3 print:my-1.5 select-none">
                <div className="border-b border-dashed border-stone-300 w-full" />
                <span className="px-3 text-[8px] font-medium text-stone-400 uppercase tracking-widest whitespace-nowrap bg-white dark:bg-stone-900 flex items-center gap-1.5">
                  ✂ Cut guide (Original for Recipient / Duplicate for Transporter)
                </span>
                <div className="border-b border-dashed border-stone-300 w-full" />
              </div>

              {/* Bottom: Duplicate for Supplier */}
              <div className="w-full flex justify-center">
                {renderTemplate("duplicate", "dual")}
              </div>
            </div>
          ) : selectedCopy === "all" && selectedTemplate !== "thermal" ? (
            <>
              <div className="print-page-break print-invoice-sheet w-full max-w-[794px] mb-8 print:mb-0 flex justify-center">
                {renderTemplate("original")}
              </div>
              <div className="print-page-break print-invoice-sheet w-full max-w-[794px] mb-8 print:mb-0 flex justify-center">
                {renderTemplate("duplicate")}
              </div>
              <div className="print-invoice-sheet w-full max-w-[794px] flex justify-center">
                {renderTemplate("triplicate")}
              </div>
            </>
          ) : (
            <div className="print-invoice-sheet w-full max-w-[794px] flex justify-center">
              {renderTemplate(selectedCopy)}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Share Modal with Compact Image & Full Bill Link */}
      {showWhatsAppModal && (
        <WhatsAppShareModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          invoiceNumber={details.invoiceNumber || "Invoice"}
          invoiceDate={details.invoiceDate || ""}
          client={{
            name: client.name,
            phone: client.phone,
            gstin: client.gstin,
          }}
          seller={{
            name: profile?.tradeName || profile?.businessName || "Merchant",
            phone: profile?.phone,
            gstin: profile?.gstin,
            upiId: profile?.upiId,
          }}
          grandTotal={effectiveTotals.grandTotal}
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
