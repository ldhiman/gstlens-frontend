import { formatINR } from "./currency.ts";

export interface WhatsAppInvoiceData {
  invoice_number?: string;
  invoice_date?: string;
  seller_gstin?: string;
  seller_gstin_info?: { trade_name?: string; legal_name?: string };
  buyer_gstin?: string;
  buyer_gstin_info?: { trade_name?: string; legal_name?: string };
  invoice_total: number;
  items?: Array<{
    description?: string;
    quantity?: number;
    taxable_amount?: number;
    gst_rate?: number;
  }>;
}

export interface WhatsAppShareOptions {
  buyerPhone?: string;
  sellerName?: string;
  sellerUpiId?: string;
  fullBillUrl?: string;
  invoice: WhatsAppInvoiceData;
}

/**
 * Generates an official, beautifully formatted WhatsApp invoice notification with
 * itemized breakdown, UPI payment intent, and viral acquisition link.
 */
export function buildWhatsAppInvoiceMessage(options: WhatsAppShareOptions): string {
  const { invoice, sellerName, sellerUpiId } = options;

  const invNum = invoice.invoice_number || "Draft";
  const invDate = invoice.invoice_date || new Date().toLocaleDateString("en-IN");
  const business = sellerName || invoice.seller_gstin_info?.trade_name || invoice.seller_gstin || "Our Store";
  const buyer = invoice.buyer_gstin_info?.trade_name || "Valued Customer";
  const total = formatINR(invoice.invoice_total);

  // Build items summary (up to 3 items + overflow count)
  let itemsSummary = "";
  if (invoice.items && invoice.items.length > 0) {
    const lines = invoice.items.slice(0, 3).map((item, idx) => {
      const desc = item.description || `Item ${idx + 1}`;
      const qty = item.quantity || 1;
      const amt = item.taxable_amount ? formatINR(item.taxable_amount) : "";
      return `  • ${desc} (${qty}x) ${amt ? `— ${amt}` : ""}`;
    });
    if (invoice.items.length > 3) {
      lines.push(`  • ... and ${invoice.items.length - 3} more items`);
    }
    itemsSummary = `\n📦 *Items:*\n${lines.join("\n")}\n`;
  }

  // Build UPI Payment deep link if UPI ID is present
  let paymentText = "";
  if (sellerUpiId && sellerUpiId.includes("@")) {
    const rawAmt = invoice.invoice_total.toFixed(2);
    const payeeName = encodeURIComponent(business.replace(/[^a-zA-Z0-9 ]/g, ""));
    const upiLink = `upi://pay?pa=${encodeURIComponent(sellerUpiId)}&pn=${payeeName}&am=${rawAmt}&cu=INR&tn=Invoice%20${encodeURIComponent(invNum)}`;
    paymentText = `\n💳 *Instant 1-Click UPI Payment:*\n${upiLink}\n`;
  }

  let billLinkText = "";
  if (options.fullBillUrl) {
    billLinkText = `\n📄 *View Full Official Bill & Download PDF:*\n${options.fullBillUrl}\n`;
  }

  const message = `🧾 *TAX INVOICE — ${business.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
📄 *Invoice No:* ${invNum}
📅 *Date:* ${invDate}
👤 *Billed To:* ${buyer}
${itemsSummary}
💰 *Total Payable:* ${total}
━━━━━━━━━━━━━━━━━━━━${paymentText}${billLinkText}
🙏 _Thank you for your business!_

⚡ _Billing & GST Compliance powered by https://gstlens.in — Digitize bills & file GST in seconds_`;

  return message;
}

/**
 * Opens WhatsApp Web or native mobile app with pre-filled invoice message
 */
export function openWhatsAppInvoice(options: WhatsAppShareOptions): void {
  const cleanPhone = (options.buyerPhone || "").replace(/[^0-9]/g, "");
  // If Indian 10-digit number without country code, prepend 91
  const formattedPhone =
    cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const text = buildWhatsAppInvoiceMessage(options);
  const encodedText = encodeURIComponent(text);

  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export interface Gstr2bReminderOptions {
  supplierName: string;
  supplierGstin?: string;
  supplierPhone?: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  taxAmount: number;
  taxDiff?: number;
  twoBValue?: number;
  buyerBusinessName?: string;
  buyerGstin?: string;
  tone?: "statutory_standard" | "urgent_drc01b" | "tax_mismatch";
}

/**
 * Builds a statutory compliance WhatsApp reminder for suppliers whose bills
 * are missing or mismatched in GSTR-2B, blocking ITC under Section 16(2)(aa).
 */
export function buildGstr2bVendorReminder(options: Gstr2bReminderOptions): string {
  const {
    supplierName,
    supplierGstin,
    invoiceNumber,
    invoiceDate,
    invoiceValue,
    taxAmount,
    taxDiff,
    twoBValue,
    buyerBusinessName,
    buyerGstin,
    tone = "statutory_standard",
  } = options;

  const buyer = buyerBusinessName || "Accounts Team";
  const buyerId = buyerGstin ? ` (GSTIN: ${buyerGstin})` : "";
  const supGstinText = supplierGstin ? `\n🏷️ *Supplier GSTIN:* ${supplierGstin}` : "";

  if (tone === "tax_mismatch") {
    return `⚠️ *GST TAX VARIANCE NOTICE — SECTION 16(2)(aa)*
━━━━━━━━━━━━━━━━━━━━
Dear *${supplierName}*,

During our monthly GSTR-2B automated reconciliation, we identified a value/tax discrepancy on invoice *#${invoiceNumber}*:

📄 *Invoice No:* ${invoiceNumber}
📅 *Invoice Date:* ${invoiceDate}${supGstinText}
📚 *Our Purchase Register:* ${formatINR(invoiceValue)}
🏛️ *Portal GSTR-2B Value:* ${formatINR(twoBValue || 0)}
🔍 *Discrepancy / Variance:* ${formatINR(taxDiff || Math.abs(invoiceValue - (twoBValue || 0)))}

Under Rule 88C, discrepancies between books and GSTR-2B trigger automated system DRC-01B demand notices and interest under Section 50.

⏰ *Action Required:*
Kindly review this bill and issue an appropriate Credit/Debit Note or amend your GSTR-1 in Table 9 to align with the original tax invoice.

━━━━━━━━━━━━━━━━━━━━
🏢 *Issued by:* ${buyer}${buyerId}
⚡ _Automated GSTR-2B ITC Assurance via GSTLens_`;
  }

  if (tone === "urgent_drc01b") {
    return `🚨 *URGENT: RISK OF RULE 88C / DRC-01B DEMAND NOTICE*
━━━━━━━━━━━━━━━━━━━━
Dear *${supplierName}*,

Invoice *#${invoiceNumber}* dated *${invoiceDate}* (Amount: ${formatINR(invoiceValue)}, Tax: ${formatINR(taxAmount)}) is *still missing from our GSTR-2B portal return*.${supGstinText}

Filing GSTR-3B without this invoice appearing in GSTR-2B exposes us to an automated *DRC-01B notice* and 18% p.a. interest liability under Section 50.

⏰ *Immediate Action Needed:*
Please upload and file this invoice in your *GSTR-1 / IFF immediately* or share the filing ARN at your earliest convenience so our ITC claim is protected.

━━━━━━━━━━━━━━━━━━━━
🏢 *Issued by:* ${buyer}${buyerId}
⚡ _Automated GSTR-2B ITC Assurance via GSTLens_`;
  }

  // Default: statutory_standard
  return `📢 *GST COMPLIANCE REMINDER — SECTION 16(2)(aa) CGST ACT*
━━━━━━━━━━━━━━━━━━━━
Dear *${supplierName}*,

While reconciling our purchase register with the GST Portal, we noticed the following invoice is *currently missing from our GSTR-2B* return:

📄 *Invoice No:* ${invoiceNumber}
📅 *Invoice Date:* ${invoiceDate}${supGstinText}
💰 *Invoice Total:* ${formatINR(invoiceValue)}
🏛️ *ITC Tax Credit at Stake:* ${formatINR(taxAmount)}

Under GST Section 16(2)(aa) and Rule 36(4), buyers are legally barred from claiming Input Tax Credit (ITC) unless the invoice is uploaded in your GSTR-1.

⏰ *Action Required:*
Kindly ensure this invoice is uploaded and filed in your *GSTR-1* before the 11th of this month so we can claim our eligible ITC without statutory delays.

━━━━━━━━━━━━━━━━━━━━
🏢 *Issued by:* ${buyer}${buyerId}
⚡ _Automated GSTR-2B ITC Assurance via GSTLens_`;
}

/**
 * Triggers WhatsApp Web or app with pre-filled GSTR-2B vendor compliance reminder.
 */
export function openGstr2bWhatsAppReminder(options: Gstr2bReminderOptions): void {
  const cleanPhone = (options.supplierPhone || "").replace(/[^0-9]/g, "");
  const formattedPhone =
    cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const text = buildGstr2bVendorReminder(options);
  const encoded = encodeURIComponent(text);

  const url = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

