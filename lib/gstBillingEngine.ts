/**
 * GST Billing & Indian Taxation Engine for GSTLens
 * Derived from statutory GST rules, Section 170 round-off, Rule 46 invoice particulars,
 * and Free-GST-Billing-Software comprehensive tax calculation logic.
 */

/* ---------------- Types ---------------- */

export type DocumentType =
  | 'tax-invoice'
  | 'proforma'
  | 'credit-note'
  | 'debit-note'
  | 'bill-of-supply'
  | 'delivery-challan'
  | 'quotation'
  | 'purchase-order';

export interface DocumentTypeConfig {
  id: DocumentType;
  label: string;
  prefix: string;
  title: string;
  hasTax: boolean;
  isCreditDebit: boolean;
  stockEffect: 1 | -1 | 0; // 1 = reduces stock (sales), -1 = increases stock (credit note), 0 = no stock change
  countsAsSales: boolean;
}

export const DOCUMENT_TYPES: Record<DocumentType, DocumentTypeConfig> = {
  'tax-invoice': {
    id: 'tax-invoice',
    label: 'Tax Invoice',
    prefix: 'INV',
    title: 'TAX INVOICE',
    hasTax: true,
    isCreditDebit: false,
    stockEffect: 1,
    countsAsSales: true,
  },
  'proforma': {
    id: 'proforma',
    label: 'Proforma Invoice',
    prefix: 'PI',
    title: 'PROFORMA INVOICE',
    hasTax: true,
    isCreditDebit: false,
    stockEffect: 0,
    countsAsSales: false,
  },
  'credit-note': {
    id: 'credit-note',
    label: 'Credit Note',
    prefix: 'CN',
    title: 'CREDIT NOTE',
    hasTax: true,
    isCreditDebit: true,
    stockEffect: -1,
    countsAsSales: true, // salesSign = -1
  },
  'debit-note': {
    id: 'debit-note',
    label: 'Debit Note',
    prefix: 'DN',
    title: 'DEBIT NOTE',
    hasTax: true,
    isCreditDebit: true,
    stockEffect: 1,
    countsAsSales: true,
  },
  'bill-of-supply': {
    id: 'bill-of-supply',
    label: 'Bill of Supply',
    prefix: 'BOS',
    title: 'BILL OF SUPPLY',
    hasTax: false,
    isCreditDebit: false,
    stockEffect: 1,
    countsAsSales: true,
  },
  'delivery-challan': {
    id: 'delivery-challan',
    label: 'Delivery Challan',
    prefix: 'DC',
    title: 'DELIVERY CHALLAN',
    hasTax: false,
    isCreditDebit: false,
    stockEffect: 1,
    countsAsSales: false,
  },
  'quotation': {
    id: 'quotation',
    label: 'Quotation / Estimate',
    prefix: 'EST',
    title: 'ESTIMATE / QUOTATION',
    hasTax: true,
    isCreditDebit: false,
    stockEffect: 0,
    countsAsSales: false,
  },
  'purchase-order': {
    id: 'purchase-order',
    label: 'Purchase Order',
    prefix: 'PO',
    title: 'PURCHASE ORDER',
    hasTax: true,
    isCreditDebit: false,
    stockEffect: 0,
    countsAsSales: false,
  },
};

export function normalizeDocType(type?: string): DocumentType {
  if (!type || typeof type !== "string") return "tax-invoice";
  const clean = type.toLowerCase().trim().replace(/_/g, "-");
  if (clean in DOCUMENT_TYPES) return clean as DocumentType;
  if (clean.includes("proforma")) return "proforma";
  if (clean.includes("credit")) return "credit-note";
  if (clean.includes("debit")) return "debit-note";
  if (clean.includes("supply")) return "bill-of-supply";
  if (clean.includes("challan")) return "delivery-challan";
  if (clean.includes("quote") || clean.includes("estimate")) return "quotation";
  if (clean.includes("purchase") || clean.includes("order")) return "purchase-order";
  return "tax-invoice";
}

export function extractInvoiceTotal(data: any): number {
  if (!data) return 0;
  const val =
    data.totals?.grandTotal ??
    data.grand_total ??
    data.invoice_total ??
    data.total_amount ??
    data.total ??
    0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

export function extractInvoiceTaxable(data: any): number {
  if (!data) return 0;
  const val =
    data.totals?.taxableAmount ??
    data.taxable_amount ??
    data.taxable_value ??
    data.taxableVal ??
    data.subTotal ??
    data.taxable ??
    0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

export function extractInvoiceTax(data: any): number {
  if (!data) return 0;
  const t = data.totals;
  if (t && (t.cgst !== undefined || t.igst !== undefined)) {
    return Number((Number(t.cgst) || 0) + (Number(t.sgst) || 0) + (Number(t.igst) || 0) + (Number(t.cess) || 0));
  }
  return Number((Number(data.cgst) || 0) + (Number(data.sgst) || 0) + (Number(data.igst) || 0) + (Number(data.cess) || 0));
}

export function extractCustomerName(data: any): string {
  if (!data) return "Cash Customer";
  return (
    data.buyer?.name ||
    data.buyer?.trade_name ||
    data.buyer_gstin_info?.trade_name ||
    data.buyer_gstin_info?.legal_name ||
    data.buyer_name ||
    data.customer_name ||
    (data.buyer?.gstin ? `Party (${data.buyer.gstin})` : null) ||
    (data.buyer_gstin ? `Party (${data.buyer_gstin})` : null) ||
    "Cash Customer"
  );
}

export function extractBuyerGstin(data: any): string {
  if (!data) return "";
  return String(data.buyer?.gstin || data.buyer_gstin || "").trim().toUpperCase();
}

export const GST_RATES = [0, 0.1, 0.25, 1.5, 3, 5, 6, 7.5, 12, 18, 28];

export interface UqcUnit {
  label: string;
  uqc: string;
  kind: 'goods' | 'services' | 'both';
}

export const BUILTIN_UNITS: UqcUnit[] = [
  { label: 'Pcs', uqc: 'PCS', kind: 'goods' },
  { label: 'Nos', uqc: 'NOS', kind: 'both' },
  { label: 'Kg', uqc: 'KGS', kind: 'goods' },
  { label: 'g', uqc: 'GMS', kind: 'goods' },
  { label: 'Tonne', uqc: 'TON', kind: 'goods' },
  { label: 'Ltr', uqc: 'LTR', kind: 'goods' },
  { label: 'ml', uqc: 'MLT', kind: 'goods' },
  { label: 'Mtr', uqc: 'MTR', kind: 'goods' },
  { label: 'cm', uqc: 'CMS', kind: 'goods' },
  { label: 'Ft', uqc: 'FTS', kind: 'goods' },
  { label: 'In', uqc: 'INS', kind: 'goods' },
  { label: 'Sq.ft', uqc: 'SQF', kind: 'both' },
  { label: 'Sq.m', uqc: 'SQM', kind: 'both' },
  { label: 'Hrs', uqc: 'HRS', kind: 'services' },
  { label: 'Day', uqc: 'DAY', kind: 'services' },
  { label: 'Week', uqc: 'OTH', kind: 'services' },
  { label: 'Month', uqc: 'OTH', kind: 'services' },
  { label: 'Year', uqc: 'OTH', kind: 'services' },
  { label: 'Visit', uqc: 'OTH', kind: 'services' },
  { label: 'Session', uqc: 'OTH', kind: 'services' },
  { label: 'Project', uqc: 'OTH', kind: 'services' },
  { label: 'Box', uqc: 'BOX', kind: 'goods' },
  { label: 'Dozen', uqc: 'DOZ', kind: 'goods' },
  { label: 'Pair', uqc: 'PRS', kind: 'goods' },
  { label: 'Set', uqc: 'SET', kind: 'goods' },
  { label: 'Bag', uqc: 'BAG', kind: 'goods' },
  { label: 'Roll', uqc: 'ROL', kind: 'goods' },
  { label: 'Bottle', uqc: 'BTL', kind: 'goods' },
];

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
  { code: '99', name: 'Centre Jurisdiction' },
];

export const TERMS_PRESETS = [
  {
    id: 'generic-sme',
    label: 'Generic Trader / SME',
    body: `<p><strong>Payment Terms:</strong></p>
<ul>
  <li>Payment is due within <strong>15 days</strong> from the date of invoice.</li>
  <li>Goods once sold will not be taken back or exchanged.</li>
  <li>Interest @ <strong>18% p.a.</strong> will be charged on overdue payments.</li>
</ul>
<p><strong>Disputes:</strong> Subject to local jurisdiction only.</p>`,
  },
  {
    id: 'freelancer',
    label: 'IT & Freelance Services',
    body: `<p><strong>Scope & Payment:</strong></p>
<ul>
  <li>This invoice covers professional services as per the agreed proposal.</li>
  <li>Payment due within <strong>7 days</strong> of invoice receipt.</li>
  <li>TDS under Section 194J is deductible. Please provide Form 16A quarterly.</li>
  <li>IP rights transfer solely upon receipt of 100% payment.</li>
</ul>`,
  },
  {
    id: 'manufacturing',
    label: 'Manufacturer & Wholesale',
    body: `<p><strong>Terms:</strong></p>
<ul>
  <li>Goods dispatched at buyer's risk. Transit insurance should be arranged by buyer.</li>
  <li>Claims for shortage or transit damage must be notified within 48 hours of delivery.</li>
  <li>Payment terms strictly <strong>30 days net</strong>.</li>
</ul>`,
  },
  {
    id: 'retail',
    label: 'Retail & POS Store',
    body: `<p><strong>Store Policy:</strong></p>
<ul>
  <li>Original invoice mandatory for any warranty or exchange within 7 days.</li>
  <li>Items must be in original condition with tags intact.</li>
  <li>Thank you for shopping with us!</li>
</ul>`,
  },
];

/* ---------------- Helper Functions ---------------- */

export function getStateCodeFromGSTIN(gstin?: string): string {
  if (!gstin || gstin.trim().length < 2) return '';
  const prefix = gstin.trim().slice(0, 2);
  return /^\d{2}$/.test(prefix) ? prefix : '';
}

export function getStateNameFromCode(code?: string): string {
  if (!code) return '';
  const match = INDIAN_STATES.find((s) => s.code === code);
  return match ? match.name : '';
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertToWords = (n: number): string => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
  };

  const getIndianFormatString = (n: number): string => {
    let res = '';
    const crore = Math.floor(n / 10000000);
    n -= crore * 10000000;
    const lakh = Math.floor(n / 100000);
    n -= lakh * 100000;
    const thousand = Math.floor(n / 1000);
    n -= thousand * 1000;
    const hundred = Math.floor(n / 100);
    n -= hundred * 100;

    if (crore > 99) res += getIndianFormatString(crore) + ' Crore ';
    else if (crore > 0) res += convertToWords(crore) + ' Crore ';
    if (lakh > 0) res += convertToWords(lakh) + ' Lakh ';
    if (thousand > 0) res += convertToWords(thousand) + ' Thousand ';
    if (hundred > 0) res += convertToWords(hundred) + ' Hundred ';
    if (n > 0) res += (res !== '' ? 'and ' : '') + convertToWords(n);
    return res.trim();
  };

  const roundedNum = Math.round(num * 100) / 100;
  const rupees = Math.floor(roundedNum);
  const paise = Math.round((roundedNum - rupees) * 100);

  let result = getIndianFormatString(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + getIndianFormatString(paise) + ' Paise';
  }
  return (result + ' Only').replace(/\s+/g, ' ');
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function getFinancialYear(date: Date = new Date()): string {
  const m = date.getMonth(); // 0 = Jan, 3 = Apr
  const y = date.getFullYear();
  const startYear = m >= 3 ? y : y - 1;
  const endYearShort = String(startYear + 1).slice(-2);
  return `${startYear}-${endYearShort}`;
}

export function getLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatLastModified(isoOrMs?: string | number): string {
  if (!isoOrMs) return "—";
  try {
    const d = new Date(isoOrMs);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

/* ---------------- Line Item Tax Computation ---------------- */

export interface LineItem {
  id: string;
  name: string;
  description?: string;
  hsn?: string;
  quantity: number;
  unit?: string;
  rate: number;
  discount?: number; // percent or flat
  discountType?: 'percent' | 'fixed';
  taxPercent: number;
  cessPercent?: number;
  cessPerUnit?: number;
  taxInclusive?: boolean;
}

export interface ComputedLineTax {
  netAmount: number;
  discountAmount: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessAmount: number;
  totalAmount: number;
}

export function calculateLineTax(
  item: LineItem,
  isInterstate: boolean,
  hasTax: boolean = true
): ComputedLineTax {
  const qty = Math.max(0, Number(item.quantity) || 0);
  const rate = Math.max(0, Number(item.rate) || 0);
  const taxRate = hasTax ? Math.max(0, Number(item.taxPercent) || 0) : 0;
  const cessRate = hasTax ? Math.max(0, Number(item.cessPercent) || 0) : 0;
  const cessPerUnit = hasTax ? Math.max(0, Number(item.cessPerUnit) || 0) : 0;

  let gross = qty * rate;
  let discountAmount = 0;

  if (item.discountType === 'percent') {
    const discPct = Math.min(100, Math.max(0, Number(item.discount) || 0));
    discountAmount = (gross * discPct) / 100;
  } else {
    discountAmount = Math.min(gross, Math.max(0, Number(item.discount) || 0));
  }

  let taxableValue = 0;
  if (item.taxInclusive && taxRate > 0) {
    const totalGrossAfterDisc = gross - discountAmount;
    taxableValue = totalGrossAfterDisc / (1 + (taxRate + cessRate) / 100);
  } else {
    taxableValue = gross - discountAmount;
  }

  taxableValue = Math.round(taxableValue * 100) / 100;

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (hasTax && taxRate > 0) {
    if (isInterstate) {
      igstRate = taxRate;
      igstAmount = Math.round(((taxableValue * igstRate) / 100) * 100) / 100;
    } else {
      cgstRate = taxRate / 2;
      sgstRate = taxRate / 2;
      cgstAmount = Math.round(((taxableValue * cgstRate) / 100) * 100) / 100;
      sgstAmount = Math.round(((taxableValue * sgstRate) / 100) * 100) / 100;
    }
  }

  const cessAmount =
    Math.round(
      (((taxableValue * cessRate) / 100) + (qty * cessPerUnit)) * 100
    ) / 100;

  const totalAmount =
    Math.round(
      (taxableValue + cgstAmount + sgstAmount + igstAmount + cessAmount) * 100
    ) / 100;

  return {
    netAmount: gross,
    discountAmount,
    taxableValue,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    cessAmount,
    totalAmount,
  };
}

/* ---------------- Overall Invoice Totals ---------------- */

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  shippingCharge: number;
  postTaxDiscount?: number;
  roundOff: number;
  tdsAmount: number;
  tcsAmount: number;
  grandTotal: number;
  isInterstate: boolean;
  isReverseCharge?: boolean;
  taxPayableByRecipient?: number;
  netPayableToSupplier?: number;
}

export function computeInvoiceTotals(
  items: LineItem[],
  isInterstate: boolean,
  options?: {
    hasTax?: boolean;
    shippingCharge?: number;
    shippingTaxRate?: number;
    postTaxDiscount?: number; // Post-tax commercial / cash discount (applied after GST calculation)
    tdsRate?: number; // e.g. 0.1 for Section 194Q
    tcsRate?: number; // e.g. 0.075 / 0.1 for Section 206C
    applyRoundOff?: boolean;
    isReverseCharge?: boolean; // Section 9(3)/9(4) reverse charge indicator
  }
): InvoiceTotals {
  const hasTax = options?.hasTax ?? true;
  let subtotal = 0;
  let totalDiscount = 0;
  let taxableAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let cess = 0;

  for (const it of items) {
    const calc = calculateLineTax(it, isInterstate, hasTax);
    subtotal += calc.netAmount;
    totalDiscount += calc.discountAmount;
    taxableAmount += calc.taxableValue;
    cgst += calc.cgstAmount;
    sgst += calc.sgstAmount;
    igst += calc.igstAmount;
    cess += calc.cessAmount;
  }

  // Shipping / Freight
  const shippingCharge = Math.max(0, Number(options?.shippingCharge) || 0);
  if (shippingCharge > 0) {
    taxableAmount += shippingCharge;
    const shipTaxRate = options?.shippingTaxRate ?? 18;
    if (hasTax && shipTaxRate > 0) {
      if (isInterstate) {
        igst += Math.round(((shippingCharge * shipTaxRate) / 100) * 100) / 100;
      } else {
        cgst += Math.round(((shippingCharge * (shipTaxRate / 2)) / 100) * 100) / 100;
        sgst += Math.round(((shippingCharge * (shipTaxRate / 2)) / 100) * 100) / 100;
      }
    }
  }

  // Post-tax commercial discount (not reducing GST liability under Section 15(3)(b))
  const postTaxDiscount = Math.max(0, Number(options?.postTaxDiscount) || 0);

  // TDS (Income Tax Section 194Q / GST Section 51) - calculated on taxable amount excluding GST
  let tdsAmount = 0;
  if (options?.tdsRate && options.tdsRate > 0) {
    tdsAmount = Math.round(((taxableAmount * options.tdsRate) / 100) * 100) / 100;
  }

  // TCS (Income Tax Section 206C(1H)) - calculated on taxable amount (or total consideration)
  let tcsAmount = 0;
  if (options?.tcsRate && options.tcsRate > 0) {
    tcsAmount = Math.round(((taxableAmount * options.tcsRate) / 100) * 100) / 100;
  }

  const totalTax = cgst + sgst + igst + cess;
  const isReverseCharge = Boolean(options?.isReverseCharge);
  const taxPayableByRecipient = isReverseCharge ? totalTax : 0;

  // Invoice total calculation
  const rawTotal = taxableAmount + totalTax - postTaxDiscount + tcsAmount - tdsAmount;
  let roundOff = 0;
  let grandTotal = rawTotal;

  // Section 170 nearest rupee round-off
  if (options?.applyRoundOff !== false) {
    grandTotal = Math.round(rawTotal);
    roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;
  }

  // Under RCM, recipient pays tax directly to Government; net payable to supplier excludes RCM tax
  const netPayableToSupplier = isReverseCharge
    ? Math.round((grandTotal - taxPayableByRecipient) * 100) / 100
    : grandTotal;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    cess: Math.round(cess * 100) / 100,
    shippingCharge,
    postTaxDiscount,
    roundOff,
    tdsAmount,
    tcsAmount,
    grandTotal,
    isInterstate,
    isReverseCharge,
    taxPayableByRecipient: Math.round(taxPayableByRecipient * 100) / 100,
    netPayableToSupplier,
  };
}

/* ---------------- Table 12 / Rule 46 HSN Summary ---------------- */

export interface HsnSummaryRow {
  hsn: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  rate: number;
  taxableValue: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  cessAmount: number;
  totalValue: number;
}

/**
 * Computes statutory HSN/SAC summary table compliant with Rule 46(g) and GSTR-1 Table 12
 */
export function computeHsnSummary(
  items: LineItem[],
  isInterstate: boolean,
  hasTax: boolean = true
): HsnSummaryRow[] {
  const map = new Map<string, HsnSummaryRow>();

  for (const it of items) {
    const calc = calculateLineTax(it, isInterstate, hasTax);
    const hsn = (it.hsn || "9999").trim();
    const rate = hasTax ? Math.max(0, Number(it.taxPercent) || 0) : 0;
    const uqc = (it.unit || "NOS").trim().toUpperCase();
    const key = `${hsn}_${rate}_${uqc}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        hsn,
        description: it.description || it.name || "Goods/Services",
        uqc,
        totalQuantity: Number(it.quantity) || 0,
        rate,
        taxableValue: calc.taxableValue,
        igstAmount: calc.igstAmount,
        cgstAmount: calc.cgstAmount,
        sgstAmount: calc.sgstAmount,
        cessAmount: calc.cessAmount,
        totalValue: calc.totalAmount,
      });
    } else {
      existing.totalQuantity = Math.round((existing.totalQuantity + (Number(it.quantity) || 0)) * 1000) / 1000;
      existing.taxableValue = Math.round((existing.taxableValue + calc.taxableValue) * 100) / 100;
      existing.igstAmount = Math.round((existing.igstAmount + calc.igstAmount) * 100) / 100;
      existing.cgstAmount = Math.round((existing.cgstAmount + calc.cgstAmount) * 100) / 100;
      existing.sgstAmount = Math.round((existing.sgstAmount + calc.sgstAmount) * 100) / 100;
      existing.cessAmount = Math.round((existing.cessAmount + calc.cessAmount) * 100) / 100;
      existing.totalValue = Math.round((existing.totalValue + calc.totalAmount) * 100) / 100;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.hsn.localeCompare(b.hsn));
}

/* ---------------- Rule 46 Invoice Particulars Validator ---------------- */

export interface Rule46InvoiceCheckParams {
  invoiceNumber: string;
  invoiceDate: string;
  docType?: DocumentType;
  supplier: {
    name: string;
    gstin?: string;
    address?: string;
    state?: string;
    stateCode?: string;
  };
  buyer: {
    name: string;
    gstin?: string;
    address?: string;
    state?: string;
    stateCode?: string;
  };
  placeOfSupply: string;
  items: LineItem[];
  reverseCharge?: boolean;
  totalAmount?: number;
}

export interface Rule46ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const INVOICE_NUM_REGEX = /^[a-zA-Z0-9\-\/]{1,16}$/;

/**
 * Validates invoice against mandatory particulars required by Rule 46 of CGST Rules, 2017
 */
export function validateRule46Invoice(params: Rule46InvoiceCheckParams): Rule46ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 46(a): Supplier Name, Address & GSTIN
  if (!params.supplier?.name?.trim()) {
    errors.push("Rule 46(a): Supplier Name is mandatory.");
  }
  if (!params.supplier?.gstin?.trim()) {
    errors.push("Rule 46(a): Supplier GSTIN is mandatory.");
  } else if (!GSTIN_REGEX.test(params.supplier.gstin.trim().toUpperCase())) {
    errors.push("Rule 46(a): Supplier GSTIN format is invalid.");
  }

  // Rule 46(b): Serial number not exceeding 16 characters containing alphabets, numerals, and - or /
  const invNum = (params.invoiceNumber || "").trim();
  if (!invNum) {
    errors.push("Rule 46(b): Invoice serial number is mandatory.");
  } else if (invNum.length > 16) {
    errors.push("Rule 46(b): Invoice number exceeds statutory maximum length of 16 characters.");
  } else if (!INVOICE_NUM_REGEX.test(invNum)) {
    errors.push("Rule 46(b): Invoice number can only contain alphanumeric characters, hyphens (-), and slashes (/).");
  }

  // Rule 46(c): Invoice Date
  if (!params.invoiceDate?.trim()) {
    errors.push("Rule 46(c): Invoice date is mandatory.");
  }

  // Rule 46(d) & (e): Recipient particulars
  const buyerGSTIN = (params.buyer?.gstin || "").trim().toUpperCase();
  const isB2B = Boolean(buyerGSTIN);

  if (isB2B) {
    if (!GSTIN_REGEX.test(buyerGSTIN)) {
      errors.push("Rule 46(d): Recipient GSTIN format is invalid for B2B supply.");
    }
  } else {
    // Rule 46(e): For unregistered recipients where value >= 50,000, recipient name, address and state are mandatory
    const total = Number(params.totalAmount) || 0;
    if (total >= 50000) {
      if (!params.buyer?.address?.trim()) {
        errors.push("Rule 46(e): Recipient address is mandatory for unregistered B2C supplies of ₹50,000 or more.");
      }
      if (!params.buyer?.stateCode && !params.placeOfSupply) {
        errors.push("Rule 46(e): Destination State code is mandatory for unregistered B2C supplies of ₹50,000 or more.");
      }
    }
  }

  // Rule 46(n): Place of supply
  const pos = (params.placeOfSupply || "").trim();
  if (!pos || !/^\d{2}$/.test(pos)) {
    errors.push("Rule 46(n): Valid 2-digit Place of Supply (State Code) is mandatory.");
  }

  // Items validation
  if (!params.items || params.items.length === 0) {
    errors.push("Rule 46: Invoice must contain at least one line item.");
  } else {
    params.items.forEach((it, idx) => {
      // Rule 46(h): Description of goods or services
      if (!it.name?.trim()) {
        errors.push(`Rule 46(h): Description/name missing for item line ${idx + 1}.`);
      }
      // Rule 46(g): HSN/SAC code
      const hsn = (it.hsn || "").trim();
      if (!hsn) {
        warnings.push(`Rule 46(g): HSN/SAC code is missing for item line ${idx + 1} (${it.name || "unnamed"}).`);
      } else if (hsn.length < 4) {
        warnings.push(`Rule 46(g): HSN/SAC code for item line ${idx + 1} should be at least 4 digits.`);
      }
      // Rule 46(i): Quantity and UQC
      if (Number(it.quantity) <= 0) {
        errors.push(`Rule 46(i): Quantity must be greater than zero for item line ${idx + 1}.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/* ---------------- Dynamic UPI QR Code String ---------------- */

export function generateUpiQrString(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  invoiceNo?: string;
}): string {
  if (!params.upiId) return '';
  const cleanUpi = encodeURIComponent(params.upiId.trim());
  const cleanName = encodeURIComponent(params.payeeName.trim() || 'Merchant');
  const amountStr = params.amount > 0 ? `&am=${params.amount.toFixed(2)}` : '';
  const noteStr = params.invoiceNo ? `&tn=${encodeURIComponent(`Invoice ${params.invoiceNo}`)}` : '';
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}${amountStr}${noteStr}&cu=INR`;
}

export { STATE_CODE_MAP, getTallyStateName } from "./tally.ts";
