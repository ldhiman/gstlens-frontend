import type { PurchaseBill } from "./storage.ts";
import { getFinancialYear } from "./duplicates.ts";

export type ReconMatchStatus =
  | "EXACT_MATCH"
  | "FUZZY_MATCH"
  | "AMOUNT_MISMATCH"
  | "TWOB_ONLY"
  | "BOOK_ONLY";

export interface Gstr2bInvoiceItem {
  num?: number;
  txval?: number;
  irt?: number;
  iamt?: number;
  crt?: number;
  camt?: number;
  srt?: number;
  samt?: number;
  csrt?: number;
  csamt?: number;
}

export interface Gstr2bInvoice {
  inum: string;
  idt: string;
  val: number;
  pos?: string;
  itcavl?: "Y" | "N";
  rsn?: string;
  inv_typ?: string;
  items?: Gstr2bInvoiceItem[];
}

export interface Gstr2bSupplier {
  ctin: string;
  trdnm?: string;
  cfs?: string;
  inv?: Gstr2bInvoice[];
}

export interface ReconRecord {
  id: string;
  supplierGstin: string;
  supplierName: string;
  supplierPhone?: string;
  invoiceNumber: string;
  invoiceDate: string;
  twoBValue: number;
  twoBTax: { igst: number; cgst: number; sgst: number; cess: number };
  bookValue: number;
  bookTax?: { igst: number; cgst: number; sgst: number; cess: number };
  diff: number;
  taxDiff?: number;
  status: ReconMatchStatus;
  matchType?: "exact" | "fuzzy_inum" | "mismatch_amount";
  itcAvailable: boolean;
  isTimeBarredSection16: boolean;
  statutoryNote?: string;
  purchaseBillId?: string;
}

export interface ReconSummary {
  totalCount: number;
  exactMatchCount: number;
  fuzzyMatchCount: number;
  mismatchCount: number;
  twoBOnlyCount: number;
  bookOnlyCount: number;
  safeClaimableITC: number;
  unclaimedITC: number;
  atRiskBookITC: number;
  timeBarredCount: number;
  drc01bVariance: number;
  drc01bVariancePercent: number;
  isDrc01bHighRisk: boolean;
}

/**
 * Normalizes an invoice number for fuzzy comparison:
 * Splits by non-alphanumeric separators, strips leading zeros from numeric chunks, and rejoins.
 * E.g. "INV/2026/0045" -> "INV202645", "PB-0012" -> "PB12"
 */
export function normalizeInvoiceKey(val: string): string {
  if (!val) return "";
  const parts = val.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return parts.map((p) => p.replace(/^0+([1-9])/, "$1")).join("").toUpperCase();
}

/**
 * Checks Section 16(4) time-barring statutory deadline:
 * ITC for any invoice pertaining to FY must be claimed on or before 30th November
 * of the subsequent financial year.
 */
export function isSection16TimeBarred(invoiceDateStr: string, referenceDate: Date = new Date()): boolean {
  if (!invoiceDateStr) return false;
  const fy = getFinancialYear(invoiceDateStr);
  if (fy === "UNKNOWN_FY") return false;

  // Extract end year of FY (e.g. "2024-25" -> 2025)
  const parts = fy.split("-");
  if (parts.length !== 2) return false;

  const startYear = parseInt(parts[0], 10);
  const endYear = startYear + 1; // FY 2024-25 ends in 2025

  // Cut-off date is 30th November of endYear
  const cutoffDate = new Date(endYear, 10, 30, 23, 59, 59); // Month 10 is November (0-indexed)

  return referenceDate.getTime() > cutoffDate.getTime();
}

/**
 * Multi-Tier Waterfall Reconciliation Engine:
 * Compares GSTR-2B portal suppliers with books purchase register.
 */
export function runGstr2bReconciliation(
  portalSuppliers: Gstr2bSupplier[],
  bookPurchases: PurchaseBill[],
  options?: { referenceDate?: Date }
): { records: ReconRecord[]; summary: ReconSummary } {
  const records: ReconRecord[] = [];
  const matchedPurchaseIds = new Set<string>();
  const refDate = options?.referenceDate || new Date();

  // Flatten and prepare book purchases with normalized keys
  const indexedPurchases = bookPurchases.map((p) => {
    const cgst = Number(p.cgst) || 0;
    const sgst = Number(p.sgst) || 0;
    const igst = Number(p.igst) || 0;
    const cess = Number(p.cess) || 0;
    return {
      raw: p,
      normGstin: (p.supplierGstin || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
      normInv: normalizeInvoiceKey(p.invoiceNumber),
      normInvPlain: (p.invoiceNumber || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase(),
      total: Number(p.total) || 0,
      tax: { cgst, sgst, igst, cess, totalTax: cgst + sgst + igst + cess },
      date: p.date,
    };
  });

  // Iterate over GSTR-2B suppliers
  for (const sup of portalSuppliers || []) {
    const supGstin = (sup.ctin || "").trim().toUpperCase();
    const supGstinKey = supGstin.replace(/[^a-zA-Z0-9]/g, "");
    const supName = sup.trdnm || sup.cfs || "Registered Supplier";

    for (const inv of sup.inv || []) {
      const invNo = String(inv.inum || "").trim();
      const invDate = inv.idt || "";
      const invVal = Number(inv.val) || 0;
      const itcAvl = inv.itcavl !== "N";
      const norm2bKey = normalizeInvoiceKey(invNo);
      const plain2bKey = invNo.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      let igst2B = 0;
      let cgst2B = 0;
      let sgst2B = 0;
      let cess2B = 0;
      for (const itm of inv.items || []) {
        igst2B += Number(itm.iamt) || 0;
        cgst2B += Number(itm.camt) || 0;
        sgst2B += Number(itm.samt) || 0;
        cess2B += Number(itm.csamt) || 0;
      }
      const twoBTaxTotal = Math.round((igst2B + cgst2B + sgst2B + cess2B) * 100) / 100;
      const timeBarred = isSection16TimeBarred(invDate, refDate);

      // --- Tier 1: Exact Match (Same GSTIN + same Plain Invoice Number) ---
      let matchedIdx = indexedPurchases.findIndex(
        (p) =>
          !matchedPurchaseIds.has(p.raw.id) &&
          p.normGstin === supGstinKey &&
          p.normInvPlain === plain2bKey
      );

      let matchType: "exact" | "fuzzy_inum" | "mismatch_amount" = "exact";

      // --- Tier 2: Normalized Leading-Zero Match (e.g. FL-0089 vs FL-89) ---
      if (matchedIdx === -1) {
        matchedIdx = indexedPurchases.findIndex(
          (p) =>
            !matchedPurchaseIds.has(p.raw.id) &&
            p.normGstin === supGstinKey &&
            p.normInv === norm2bKey
        );
        if (matchedIdx !== -1) {
          matchType = "fuzzy_inum";
        }
      }

      // --- Tier 3: Fuzzy Match (Same GSTIN + fuzzy prefix / suffix with near value) ---
      if (matchedIdx === -1) {
        matchedIdx = indexedPurchases.findIndex((p) => {
          if (matchedPurchaseIds.has(p.raw.id) || p.normGstin !== supGstinKey) {
            return false;
          }
          const diff = Math.abs(p.total - invVal);
          const isFuzzyNum =
            p.normInv.includes(norm2bKey) ||
            norm2bKey.includes(p.normInv) ||
            p.normInvPlain.endsWith(plain2bKey) ||
            plain2bKey.endsWith(p.normInvPlain);
          return isFuzzyNum && diff <= 5.0;
        });
        if (matchedIdx !== -1) {
          matchType = "fuzzy_inum";
        }
      }

      if (matchedIdx !== -1) {
        const found = indexedPurchases[matchedIdx];
        matchedPurchaseIds.add(found.raw.id);
        const valDiff = Math.round(Math.abs(found.total - invVal) * 100) / 100;
        const taxDiff = Math.round(Math.abs(found.tax.totalTax - twoBTaxTotal) * 100) / 100;

        let status: ReconMatchStatus = "EXACT_MATCH";
        // Check amount and tax discrepancies (statutory tolerance: ₹2.00)
        if (valDiff >= 2.0 || taxDiff >= 2.0) {
          status = "AMOUNT_MISMATCH";
          matchType = "mismatch_amount";
        } else if (matchType === "fuzzy_inum") {
          status = "FUZZY_MATCH";
        }

        let note: string | undefined = undefined;
        if (timeBarred) {
          note = "Section 16(4) time-barred: ITC cannot be claimed past 30th November deadline.";
        } else if (status === "AMOUNT_MISMATCH") {
          if (taxDiff >= 2.0 && valDiff < 2.0) {
            note = `Tax mismatch of ₹${taxDiff.toFixed(2)} (Books: ₹${found.tax.totalTax.toFixed(2)} vs 2B: ₹${twoBTaxTotal.toFixed(2)}).`;
          } else {
            note = `Value difference of ₹${valDiff.toFixed(2)} between books and 2B.`;
          }
        }

        records.push({
          id: `2B_${supGstin}_${invNo}`,
          supplierGstin: supGstin,
          supplierName: found.raw.supplierName || supName,
          invoiceNumber: invNo,
          invoiceDate: invDate || found.date,
          twoBValue: invVal,
          twoBTax: { igst: igst2B, cgst: cgst2B, sgst: sgst2B, cess: cess2B },
          bookValue: found.total,
          bookTax: {
            igst: found.tax.igst,
            cgst: found.tax.cgst,
            sgst: found.tax.sgst,
            cess: found.tax.cess,
          },
          diff: valDiff,
          taxDiff,
          status,
          matchType,
          itcAvailable: itcAvl && !timeBarred,
          isTimeBarredSection16: timeBarred,
          statutoryNote: note,
          purchaseBillId: found.raw.id,
        });
      } else {
        // --- Tier 3: In 2B Only (Unclaimed ITC) ---
        records.push({
          id: `2B_${supGstin}_${invNo}`,
          supplierGstin: supGstin,
          supplierName: supName,
          invoiceNumber: invNo,
          invoiceDate: invDate,
          twoBValue: invVal,
          twoBTax: { igst: igst2B, cgst: cgst2B, sgst: sgst2B, cess: cess2B },
          bookValue: 0,
          diff: invVal,
          taxDiff: twoBTaxTotal,
          status: "TWOB_ONLY",
          itcAvailable: itcAvl && !timeBarred,
          isTimeBarredSection16: timeBarred,
          statutoryNote: timeBarred
            ? "Section 16(4) time-barred: Supplier uploaded past statutory cut-off."
            : "Available in GSTR-2B but not recorded in purchase books.",
        });
      }
    }
  }

  // --- Tier 4: In Books Only (Missing in 2B) ---
  for (const p of indexedPurchases) {
    if (!matchedPurchaseIds.has(p.raw.id)) {
      const timeBarred = isSection16TimeBarred(p.date, refDate);
      const estTax =
        p.tax.totalTax > 0
          ? p.tax.totalTax
          : Math.round(((p.total * 0.18) / 1.18) * 100) / 100;

      records.push({
        id: `BOOK_${p.raw.id}`,
        supplierGstin: (p.raw.supplierGstin || "").toUpperCase(),
        supplierName: p.raw.supplierName,
        invoiceNumber: p.raw.invoiceNumber,
        invoiceDate: p.date,
        twoBValue: 0,
        twoBTax: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
        bookValue: p.total,
        bookTax: {
          igst: p.tax.igst,
          cgst: p.tax.cgst,
          sgst: p.tax.sgst,
          cess: p.tax.cess,
        },
        diff: p.total,
        taxDiff: estTax,
        status: "BOOK_ONLY",
        itcAvailable: false,
        isTimeBarredSection16: timeBarred,
        statutoryNote: "Missing in GSTR-2B. Supplier has not filed GSTR-1.",
        purchaseBillId: p.raw.id,
      });
    }
  }

  // Summary Metrics Computation
  const exact = records.filter((r) => r.status === "EXACT_MATCH");
  const fuzzy = records.filter((r) => r.status === "FUZZY_MATCH");
  const mismatch = records.filter((r) => r.status === "AMOUNT_MISMATCH");
  const twoBOnly = records.filter((r) => r.status === "TWOB_ONLY");
  const bookOnly = records.filter((r) => r.status === "BOOK_ONLY");
  const timeBarredRecs = records.filter((r) => r.isTimeBarredSection16);

  const safeClaimableITC = [...exact, ...fuzzy].reduce(
    (acc, r) =>
      acc +
      (r.itcAvailable
        ? r.twoBTax.igst + r.twoBTax.cgst + r.twoBTax.sgst + r.twoBTax.cess
        : 0),
    0
  );

  const unclaimedITC = twoBOnly.reduce(
    (acc, r) =>
      acc +
      (r.itcAvailable
        ? r.twoBTax.igst + r.twoBTax.cgst + r.twoBTax.sgst + r.twoBTax.cess
        : 0),
    0
  );

  const atRiskBookITC = bookOnly.reduce((acc, r) => {
    const raw = bookPurchases.find((b) => b.id === r.purchaseBillId);
    if (raw) {
      const tax =
        (Number(raw.cgst) || 0) +
        (Number(raw.sgst) || 0) +
        (Number(raw.igst) || 0) +
        (Number(raw.cess) || 0);
      return acc + (tax > 0 ? tax : (r.bookValue * 0.18) / 1.18);
    }
    return acc + (r.bookValue * 0.18) / 1.18;
  }, 0);

  // DRC-01B Risk Analysis
  const drc01bVariance = Math.max(0, atRiskBookITC);
  const drc01bVariancePercent =
    safeClaimableITC > 0 ? (drc01bVariance / safeClaimableITC) * 100 : 100;
  // Risk triggers if discrepancy exceeds ₹25,000 OR 10%
  const isDrc01bHighRisk = drc01bVariance > 25000 || (safeClaimableITC > 0 && drc01bVariancePercent > 10.0);

  const summary: ReconSummary = {
    totalCount: records.length,
    exactMatchCount: exact.length,
    fuzzyMatchCount: fuzzy.length,
    mismatchCount: mismatch.length,
    twoBOnlyCount: twoBOnly.length,
    bookOnlyCount: bookOnly.length,
    safeClaimableITC: Math.round(safeClaimableITC * 100) / 100,
    unclaimedITC: Math.round(unclaimedITC * 100) / 100,
    atRiskBookITC: Math.round(atRiskBookITC * 100) / 100,
    timeBarredCount: timeBarredRecs.length,
    drc01bVariance: Math.round(drc01bVariance * 100) / 100,
    drc01bVariancePercent: Math.round(drc01bVariancePercent * 10) / 10,
    isDrc01bHighRisk,
  };

  return { records, summary };
}
