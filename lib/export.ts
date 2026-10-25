/**
 * CA-Ready Multi-Schedule CSV/Excel Exporter for GSTR-3B and GSTR-1
 * Emits UTF-8 BOM (\uFEFF) for native, flawless display in Microsoft Excel on Windows.
 */

import type { GSTR3BComputation } from "./gstr3b.ts";
import { computeGSTR3B } from "./gstr3b.ts";

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function line(cells: any[]): string {
  return cells.map(escapeCSV).join(",") + "\r\n";
}

/**
 * Exports complete GSTR-3B schedules into an Excel-compatible CSV workpaper
 */
export function generateGSTR3BCSV(computation: GSTR3BComputation): string {
  let out = "\uFEFF"; // UTF-8 BOM for Microsoft Excel

  // Header Banner
  out += line(["GSTLens — GSTR-3B CA STATUTORY WORKPAPER & RECONCILIATION"]);
  out += line(["GSTIN", computation.gstin]);
  out += line(["Return Period", computation.ret_period]);
  out += line(["Filing Type", computation.filing_typ]);
  out += line(["Generated At", new Date().toLocaleString("en-IN")]);
  out += line([]);

  // TABLE 3.1
  out += line(["TABLE 3.1: DETAILS OF OUTWARD SUPPLIES AND INWARD SUPPLIES LIABLE TO REVERSE CHARGE"]);
  out += line([
    "Nature of Supplies",
    "Total Taxable Value (₹)",
    "Integrated Tax (IGST ₹)",
    "Central Tax (CGST ₹)",
    "State/UT Tax (SGST ₹)",
    "Cess (₹)",
    "Total Tax (₹)",
  ]);

  const os = computation.sup_details.osup_det;
  const osTot = os.iamt + os.camt + os.samt + os.csamt;
  out += line([
    "(a) Outward taxable supplies (other than zero/nil/exempt)",
    os.txval,
    os.iamt,
    os.camt,
    os.samt,
    os.csamt,
    osTot,
  ]);

  const oz = computation.sup_details.osup_zero;
  out += line([
    "(b) Outward taxable supplies (zero rated)",
    oz.txval,
    oz.iamt,
    "-",
    "-",
    oz.csamt,
    oz.iamt + oz.csamt,
  ]);

  const on = computation.sup_details.osup_nil_exmp;
  out += line([
    "(c) Other outward supplies (nil rated, exempted)",
    on.txval,
    "-",
    "-",
    "-",
    "-",
    0,
  ]);

  const is = computation.sup_details.isup_rev;
  const isTot = is.iamt + is.camt + is.samt + is.csamt;
  out += line([
    "(d) Inward supplies (liable to reverse charge)",
    is.txval,
    is.iamt,
    is.camt,
    is.samt,
    is.csamt,
    isTot,
  ]);

  const ong = computation.sup_details.osup_nongst;
  out += line([
    "(e) Non-GST outward supplies",
    ong.txval,
    "-",
    "-",
    "-",
    "-",
    0,
  ]);
  out += line([]);

  // TABLE 3.2
  out += line(["TABLE 3.2: INTER-STATE SUPPLIES TO UNREGISTERED PERSONS (BY PLACE OF SUPPLY)"]);
  out += line(["Place of Supply (POS)", "Total Taxable Value (₹)", "Integrated Tax (IGST ₹)"]);
  if (computation.inter_sup.unreg_details.length === 0) {
    out += line(["No inter-state unregistered supplies recorded", 0, 0]);
  } else {
    for (const item of computation.inter_sup.unreg_details) {
      out += line([`State Code: ${item.pos}`, item.txval, item.iamt]);
    }
  }
  out += line([]);

  // TABLE 4
  out += line(["TABLE 4: ELIGIBLE INPUT TAX CREDIT (ITC)"]);
  out += line([
    "Details",
    "Integrated Tax (IGST ₹)",
    "Central Tax (CGST ₹)",
    "State/UT Tax (SGST ₹)",
    "Cess (₹)",
    "Total Net ITC (₹)",
  ]);

  const a5 = computation.itc_elg.itc_avl.OTH;
  out += line([
    "(A)(5) All other ITC (Purchases / Expenses)",
    a5.iamt,
    a5.camt,
    a5.samt,
    a5.csamt,
    a5.iamt + a5.camt + a5.samt + a5.csamt,
  ]);

  const a3 = computation.itc_elg.itc_avl.ISRC;
  out += line([
    "(A)(3) Inward supplies liable to reverse charge",
    a3.iamt,
    a3.camt,
    a3.samt,
    a3.csamt,
    a3.iamt + a3.camt + a3.samt + a3.csamt,
  ]);

  const b1 = computation.itc_elg.itc_rev.RUL;
  out += line([
    "(B)(1) ITC Reversed under Rule 42/43 & Section 17(5) Blocked Credit",
    b1.iamt,
    b1.camt,
    b1.samt,
    b1.csamt,
    b1.iamt + b1.camt + b1.samt + b1.csamt,
  ]);

  const net = computation.itc_elg.itc_net;
  out += line([
    "(C) Net ITC Available (A - B)",
    net.iamt,
    net.camt,
    net.samt,
    net.csamt,
    net.iamt + net.camt + net.samt + net.csamt,
  ]);
  out += line([]);

  // TAX PAYABLE IN CASH SUMMARY
  out += line(["TAX PAYABLE IN CASH SUMMARY"]);
  out += line([
    "Component",
    "Integrated Tax (IGST ₹)",
    "Central Tax (CGST ₹)",
    "State/UT Tax (SGST ₹)",
    "Cess (₹)",
    "Total (₹)",
  ]);

  const outLiab = computation.tax_summary.outward_liability;
  out += line([
    "Total Output Liability",
    outLiab.iamt,
    outLiab.camt,
    outLiab.samt,
    outLiab.csamt,
    outLiab.iamt + outLiab.camt + outLiab.samt + outLiab.csamt,
  ]);

  out += line([
    "Less: Net ITC Set-Off",
    net.iamt,
    net.camt,
    net.samt,
    net.csamt,
    net.iamt + net.camt + net.samt + net.csamt,
  ]);

  const rcmLiab = computation.tax_summary.rcm_liability;
  out += line([
    "Add: Reverse Charge Liability (Cash Only)",
    rcmLiab.iamt,
    rcmLiab.camt,
    rcmLiab.samt,
    rcmLiab.csamt,
    rcmLiab.iamt + rcmLiab.camt + rcmLiab.samt + rcmLiab.csamt,
  ]);

  const cashPay = computation.tax_summary.net_cash_payable;
  out += line([
    "NET CASH TAX PAYABLE",
    cashPay.iamt,
    cashPay.camt,
    cashPay.samt,
    cashPay.csamt,
    cashPay.iamt + cashPay.camt + cashPay.samt + cashPay.csamt,
  ]);

  return out;
}

/**
 * Exports complete GSTR-1 Invoices & Summary into an Excel-compatible CSV workpaper
 */
export function generateGSTR1CSV(userGSTIN: string, fp: string, invoices: any[]): string {
  let out = "\uFEFF"; // UTF-8 BOM

  out += line(["GSTLens — GSTR-1 CA STATUTORY WORKPAPER & SALES REGISTER"]);
  out += line(["GSTIN", userGSTIN]);
  out += line(["Return Period", fp]);
  out += line(["Generated At", new Date().toLocaleString("en-IN")]);
  out += line([]);

  // B2B REGISTER
  out += line(["SECTION 1: B2B INVOICES (TABLE 4)"]);
  out += line([
    "Invoice No",
    "Invoice Date",
    "Buyer GSTIN",
    "Trade / Legal Name",
    "Place of Supply",
    "Supply Type",
    "Taxable Value (₹)",
    "IGST (₹)",
    "CGST (₹)",
    "SGST (₹)",
    "Cess (₹)",
    "Invoice Total (₹)",
  ]);

  const normUserGSTIN = (userGSTIN || "").trim().toUpperCase();
  const userState = normUserGSTIN.slice(0, 2);

  for (const item of invoices) {
    const inv = item.data || item;
    const buyerGST = (inv.buyer_gstin || "").trim();
    if (!buyerGST) continue; // Skip B2C in Section 1

    const txval = Number(inv.taxable_value) || 0;
    const cgst = Number(inv.cgst) || 0;
    const sgst = Number(inv.sgst) || 0;
    const igst = Number(inv.igst) || 0;
    const cess = Number(inv.cess) || 0;
    const tot = Number(inv.invoice_total) || txval + cgst + sgst + igst + cess;

    const pos = (inv.pos || buyerGST.slice(0, 2) || userState || "99").toString();
    const isInter = igst > 0 || pos !== userState;

    out += line([
      inv.invoice_number || "N/A",
      inv.invoice_date || "N/A",
      buyerGST,
      inv.buyer_gstin_info?.trade_name || inv.buyer_gstin_info?.legal_name || "N/A",
      pos,
      isInter ? "Inter-State" : "Intra-State",
      txval.toFixed(2),
      igst.toFixed(2),
      cgst.toFixed(2),
      sgst.toFixed(2),
      cess.toFixed(2),
      tot.toFixed(2),
    ]);
  }
  out += line([]);

  // B2C REGISTER
  out += line(["SECTION 2: B2C INVOICES SUMMARY (TABLE 7)"]);
  out += line([
    "Invoice No",
    "Invoice Date",
    "Place of Supply",
    "Taxable Value (₹)",
    "IGST (₹)",
    "CGST (₹)",
    "SGST (₹)",
    "Invoice Total (₹)",
  ]);

  for (const item of invoices) {
    const inv = item.data || item;
    if (inv.buyer_gstin) continue; // Only B2C

    const txval = Number(inv.taxable_value) || 0;
    const cgst = Number(inv.cgst) || 0;
    const sgst = Number(inv.sgst) || 0;
    const igst = Number(inv.igst) || 0;
    const cess = Number(inv.cess) || 0;
    const tot = Number(inv.invoice_total) || txval + cgst + sgst + igst + cess;

    out += line([
      inv.invoice_number || "N/A",
      inv.invoice_date || "N/A",
      inv.pos || userState || "99",
      txval.toFixed(2),
      igst.toFixed(2),
      cgst.toFixed(2),
      sgst.toFixed(2),
      tot.toFixed(2),
    ]);
  }

  return out;
}

/**
 * Triggers a browser download of a CSV file with correct MIME type and encoding
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
