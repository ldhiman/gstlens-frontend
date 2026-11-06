import test from "node:test";
import assert from "node:assert/strict";
import { getFinancialYear, normalizeInvoiceNumber, normalizeGSTIN } from "../lib/duplicates.ts";

function normalizeToHtmlDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== "string") return "2026-10-31";
  const cleaned = dateStr.replace(/[./\s]+/g, "-").trim();
  const parts = cleaned.split("-").filter(Boolean);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return "2026-10-31";
}

function checkPurchaseDuplicate(
  candidate: {
    invoiceNumber: string;
    supplierGstin?: string;
    supplierName: string;
    date: string;
    id?: string;
  },
  existingBills: any[]
): { isDuplicate: boolean; warning?: string } {
  const cNum = normalizeInvoiceNumber(candidate.invoiceNumber);
  const cGstin = normalizeGSTIN(candidate.supplierGstin);
  const cName = (candidate.supplierName || "").trim().toLowerCase();
  const cFy = getFinancialYear(candidate.date);

  if (!cNum) return { isDuplicate: false };

  for (const bill of existingBills) {
    if (candidate.id && bill.id === candidate.id) continue;
    const bNum = normalizeInvoiceNumber(bill.invoiceNumber);
    const bGstin = normalizeGSTIN(bill.supplierGstin);
    const bName = (bill.supplierName || "").trim().toLowerCase();
    const bFy = getFinancialYear(bill.date);

    const sameNumber = cNum === bNum;
    const sameSupplier =
      (cGstin && bGstin && cGstin === bGstin) ||
      (cName && bName && cName === bName);
    const sameFy =
      cFy !== "UNKNOWN_FY" && bFy !== "UNKNOWN_FY" ? cFy === bFy : true;

    if (sameNumber && sameSupplier && sameFy) {
      return {
        isDuplicate: true,
        warning: `Statutory Warning (Section 16(2) CGST Act): Purchase bill #${candidate.invoiceNumber} from ${bill.supplierName} already exists for FY ${cFy} (Recorded on ${bill.date}). Input Tax Credit (ITC) cannot be claimed twice on identical invoices.`,
      };
    }
  }

  return { isDuplicate: false };
}

test("Purchase Bill Date Normalizer strictly converts DD-MM-YYYY to YYYY-MM-DD for HTML5 date inputs", () => {
  assert.equal(normalizeToHtmlDate("25-10-2026"), "2026-10-25");
  assert.equal(normalizeToHtmlDate("05/04/2026"), "2026-04-05");
  assert.equal(normalizeToHtmlDate("2026-12-31"), "2026-12-31");
  assert.equal(normalizeToHtmlDate("1.1.2026"), "2026-01-01");
});

test("Section 16(2) Duplicate Detection identifies duplicate vendor bill within the same Financial Year", () => {
  const existingBills = [
    {
      id: "pur_101",
      invoiceNumber: "INV-2026-9042",
      supplierGstin: "27AAPFU0939F1ZV",
      supplierName: "Apex Precision Industrial Spares Ltd",
      date: "2026-10-25",
      total: 11800,
    },
  ];

  // Exact duplicate in same FY
  const dupCheck1 = checkPurchaseDuplicate(
    {
      invoiceNumber: "inv-2026-9042 ",
      supplierGstin: "27AAPFU0939F1ZV",
      supplierName: "Apex Precision Industrial Spares Ltd",
      date: "2026-11-15",
    },
    existingBills
  );
  assert.equal(dupCheck1.isDuplicate, true);
  assert.match(dupCheck1.warning || "", /Section 16\(2\)/);

  // Different invoice number -> Valid
  const validCheck1 = checkPurchaseDuplicate(
    {
      invoiceNumber: "INV-2026-9043",
      supplierGstin: "27AAPFU0939F1ZV",
      supplierName: "Apex Precision Industrial Spares Ltd",
      date: "2026-10-25",
    },
    existingBills
  );
  assert.equal(validCheck1.isDuplicate, false);

  // Same invoice number but different vendor -> Valid
  const validCheck2 = checkPurchaseDuplicate(
    {
      invoiceNumber: "INV-2026-9042",
      supplierGstin: "29BBBBB1111B2Z6",
      supplierName: "Karnataka Steel Traders",
      date: "2026-10-25",
    },
    existingBills
  );
  assert.equal(validCheck2.isDuplicate, false);

  // Same invoice number and vendor but different FY (April boundary) -> Valid per Rule 46(b)
  const validCheck3 = checkPurchaseDuplicate(
    {
      invoiceNumber: "INV-2026-9042",
      supplierGstin: "27AAPFU0939F1ZV",
      supplierName: "Apex Precision Industrial Spares Ltd",
      date: "2025-05-10", // FY 2025-26 vs FY 2026-27
    },
    existingBills
  );
  assert.equal(validCheck3.isDuplicate, false);
});
