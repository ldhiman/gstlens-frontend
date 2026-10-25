export interface StoredInvoiceRef {
  id: string;
  status: string;
  fp: string;
  data: any;
  created_at: number;
  updated_at: number;
  synced_to_cloud: number;
  deleted: number;
  cloud_id?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  severity: "high" | "medium" | "none";
  duplicateType: "exact_fy_match" | "same_seller_and_number" | "identical_amounts" | "in_batch_duplicate" | "none";
  existingInvoice?: StoredInvoiceRef;
  existingLocalId?: string;
  financialYear: string;
  warningMessage: string;
  matchedFields: {
    sellerGstin: boolean;
    invoiceNumber: boolean;
    financialYear: boolean;
    totalAmount: boolean;
  };
}

/**
 * Extracts Indian Financial Year (FY: 1st April to 31st March) from invoice date string.
 * Format returned: "2026-27" (or "UNKNOWN_FY")
 */
export function getFinancialYear(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== "string") {
    return "UNKNOWN_FY";
  }

  const cleaned = dateStr.replace(/[./]/g, "-").trim();
  const parts = cleaned.split("-");

  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;

  // YYYY-MM-DD
  if (parts[0]?.length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  }
  // DD-MM-YYYY
  else if (parts.length >= 3) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  if (!month || !year || isNaN(month) || isNaN(year)) {
    return "UNKNOWN_FY";
  }

  // Handle 2-digit short year (e.g. 26 -> 2026)
  if (year < 100) {
    year = 2000 + year;
  }

  // Indian FY: April (Month 4) to March (Month 3)
  let startYear = year;
  let endYear = year + 1;

  if (month < 4) {
    // Jan, Feb, Mar belong to previous calendar year's FY
    startYear = year - 1;
    endYear = year;
  }

  const endShort = String(endYear).slice(-2);
  return `${startYear}-${endShort}`;
}

/**
 * Normalizes invoice number by trimming, uppercase, and removing consecutive internal whitespace.
 */
export function normalizeInvoiceNumber(invNum?: string): string {
  if (!invNum || typeof invNum !== "string") return "";
  return invNum.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Normalizes 15-character GSTIN.
 */
export function normalizeGSTIN(gstin?: string): string {
  if (!gstin || typeof gstin !== "string") return "";
  return gstin.trim().toUpperCase();
}

/**
 * Checks if candidate invoice is a duplicate of any existing invoice in local database.
 * Complies with Section 16(2) of CGST Act (preventing duplicate ITC claims) and
 * Rule 46(b) of CGST Rules (invoice number uniqueness per financial year).
 */
export function checkDuplicateInvoice(
  candidateData: any,
  existingInvoices: StoredInvoiceRef[],
  excludeLocalId?: string
): DuplicateCheckResult {
  const candSeller = normalizeGSTIN(candidateData?.seller_gstin);
  const candInvNum = normalizeInvoiceNumber(candidateData?.invoice_number);
  const candDate = candidateData?.invoice_date;
  const candFY = getFinancialYear(candDate);
  const candTotal = Number(candidateData?.invoice_total || 0);

  // If both seller GSTIN and invoice number are missing, we cannot establish duplication
  if (!candSeller && !candInvNum) {
    return {
      isDuplicate: false,
      severity: "none",
      duplicateType: "none",
      financialYear: candFY,
      warningMessage: "",
      matchedFields: {
        sellerGstin: false,
        invoiceNumber: false,
        financialYear: false,
        totalAmount: false,
      },
    };
  }

  for (const existing of existingInvoices) {
    // Skip deleted or the invoice being updated
    if (existing.deleted === 1) continue;
    if (excludeLocalId && existing.id === excludeLocalId) continue;

    const existData = existing.data || {};
    const existSeller = normalizeGSTIN(existData.seller_gstin);
    const existInvNum = normalizeInvoiceNumber(existData.invoice_number);
    const existDate = existData.invoice_date;
    const existFY = getFinancialYear(existDate);
    const existTotal = Number(existData.invoice_total || 0);

    const isSameSeller = candSeller.length > 0 && candSeller === existSeller;
    const isSameInvNum = candInvNum.length > 0 && candInvNum === existInvNum;
    const isSameFY = candFY !== "UNKNOWN_FY" && candFY === existFY;
    const isSameTotal = candTotal > 0 && Math.abs(candTotal - existTotal) < 0.01;

    // Severity 1: Exact Match on Seller GSTIN + Invoice Number + Financial Year
    // Under Rule 46(b), this is a definitive statutory duplicate!
    if (isSameSeller && isSameInvNum && isSameFY) {
      return {
        isDuplicate: true,
        severity: "high",
        duplicateType: "exact_fy_match",
        existingInvoice: existing,
        existingLocalId: existing.id,
        financialYear: candFY,
        warningMessage: `Statutory Duplicate Alert: Invoice #${candInvNum} from supplier ${candSeller} already exists in FY ${candFY} (Saved: ${existing.data?.invoice_date || "earlier"}). Duplicate booking violates Section 16(2) of the CGST Act.`,
        matchedFields: {
          sellerGstin: true,
          invoiceNumber: true,
          financialYear: true,
          totalAmount: isSameTotal,
        },
      };
    }

    // Severity 2: Same Seller GSTIN + Same Invoice Number (FY missing or across periods)
    if (isSameSeller && isSameInvNum) {
      return {
        isDuplicate: true,
        severity: "high",
        duplicateType: "same_seller_and_number",
        existingInvoice: existing,
        existingLocalId: existing.id,
        financialYear: candFY,
        warningMessage: `Duplicate Warning: Invoice #${candInvNum} from supplier ${candSeller} was already uploaded previously (Invoice date: ${existDate || "-"}). Please check for duplicate filing.`,
        matchedFields: {
          sellerGstin: true,
          invoiceNumber: true,
          financialYear: false,
          totalAmount: isSameTotal,
        },
      };
    }

    // Severity 3: Same Seller + Same Total Amount + Same Date (even if OCR misread invoice number slightly)
    if (isSameSeller && isSameTotal && candDate && candDate === existDate && candTotal > 0) {
      return {
        isDuplicate: true,
        severity: "medium",
        duplicateType: "identical_amounts",
        existingInvoice: existing,
        existingLocalId: existing.id,
        financialYear: candFY,
        warningMessage: `Potential Duplicate: An invoice from ${candSeller} with exact amount ₹${candTotal.toFixed(2)} on date ${candDate} already exists (#${existInvNum || "Unknown"}). Verify if this document has already been processed.`,
        matchedFields: {
          sellerGstin: true,
          invoiceNumber: false,
          financialYear: isSameFY,
          totalAmount: true,
        },
      };
    }
  }

  return {
    isDuplicate: false,
    severity: "none",
    duplicateType: "none",
    financialYear: candFY,
    warningMessage: "",
    matchedFields: {
      sellerGstin: false,
      invoiceNumber: false,
      financialYear: false,
      totalAmount: false,
    },
  };
}

/**
 * Checks for duplicates within a batch of freshly scanned invoices.
 */
export function checkBatchDuplicates(
  batchItems: { file?: any; data?: any; id?: string }[],
  existingInvoices: StoredInvoiceRef[]
): Map<number, DuplicateCheckResult> {
  const results = new Map<number, DuplicateCheckResult>();
  const processedSoFar: StoredInvoiceRef[] = [...existingInvoices];

  for (let i = 0; i < batchItems.length; i++) {
    const item = batchItems[i];
    if (!item.data) {
      results.set(i, {
        isDuplicate: false,
        severity: "none",
        duplicateType: "none",
        financialYear: "UNKNOWN_FY",
        warningMessage: "",
        matchedFields: {
          sellerGstin: false,
          invoiceNumber: false,
          financialYear: false,
          totalAmount: false,
        },
      });
      continue;
    }

    // Check against existing in DB + already processed in this batch
    const check = checkDuplicateInvoice(item.data, processedSoFar);

    if (check.isDuplicate) {
      // Check if duplicate is from earlier item in the SAME batch
      const isFromSameBatch = processedSoFar.length > existingInvoices.length &&
        check.existingInvoice &&
        !existingInvoices.some(dbInv => dbInv.id === check.existingInvoice?.id);

      if (isFromSameBatch) {
        check.duplicateType = "in_batch_duplicate";
        check.warningMessage = `Batch Conflict: Invoice #${item.data.invoice_number || "Unknown"} from ${item.data.seller_gstin || "Supplier"} is repeated multiple times in this batch upload.`;
      }
    }

    results.set(i, check);

    // Add this item as virtual stored invoice for subsequent items in the batch
    processedSoFar.push({
      id: item.id || `batch_item_${i}`,
      status: "draft",
      fp: item.data.invoice_date || "",
      data: item.data,
      created_at: Date.now(),
      updated_at: Date.now(),
      synced_to_cloud: 0,
      deleted: 0,
      cloud_id: "",
    });
  }

  return results;
}
