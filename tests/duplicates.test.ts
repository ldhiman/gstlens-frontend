import test from "node:test";
import assert from "node:assert/strict";
import {
  getFinancialYear,
  normalizeInvoiceNumber,
  normalizeGSTIN,
  checkDuplicateInvoice,
  checkBatchDuplicates,
  type StoredInvoiceRef,
} from "../lib/duplicates.ts";

test("Financial Year calculation accurately handles Indian FY boundary (April to March)", () => {
  // April onwards belongs to same calendar year start (e.g. 15-04-2026 -> 2026-27)
  assert.equal(getFinancialYear("15-04-2026"), "2026-27");
  assert.equal(getFinancialYear("24.10.2026"), "2026-27");
  assert.equal(getFinancialYear("31/12/2026"), "2026-27");

  // Jan, Feb, Mar belong to previous calendar year's FY (e.g. 15-02-2026 -> 2025-26)
  assert.equal(getFinancialYear("15-01-2026"), "2025-26");
  assert.equal(getFinancialYear("28-02-2026"), "2025-26");
  assert.equal(getFinancialYear("31-03-2026"), "2025-26");

  // ISO format YYYY-MM-DD
  assert.equal(getFinancialYear("2026-05-10"), "2026-27");
  assert.equal(getFinancialYear("2026-03-20"), "2025-26");

  // Invalid or missing date
  assert.equal(getFinancialYear(""), "UNKNOWN_FY");
  assert.equal(getFinancialYear(undefined), "UNKNOWN_FY");
});

test("Normalizes invoice numbers and GSTINs cleanly", () => {
  assert.equal(normalizeInvoiceNumber(" INV-2026-001 "), "INV-2026-001");
  assert.equal(normalizeInvoiceNumber("inv / 2026 / 88 "), "INV/2026/88");
  assert.equal(normalizeGSTIN(" 07aaaaa0000a1z5 "), "07AAAAA0000A1Z5");
});

test("Detects exact statutory duplicate invoice (Same Seller + Invoice No + FY)", () => {
  const existingInvoices: StoredInvoiceRef[] = [
    {
      id: "inv_1",
      status: "confirmed",
      fp: "102026",
      data: {
        invoice_number: "INV-2026-001",
        seller_gstin: "07AAAAA0000A1Z5",
        invoice_date: "24-10-2026",
        taxable_value: 10000,
        cgst: 900,
        sgst: 900,
        invoice_total: 11800,
      },
      created_at: Date.now() - 100000,
      updated_at: Date.now() - 100000,
      synced_to_cloud: 1,
      deleted: 0,
      cloud_id: "c_1",
    },
  ];

  // Identical invoice scanned again
  const duplicateCandidate = {
    invoice_number: "inv-2026-001",
    seller_gstin: "07AAAAA0000A1Z5",
    invoice_date: "28-10-2026", // Same FY (2026-27)
    invoice_total: 11800,
  };

  const check = checkDuplicateInvoice(duplicateCandidate, existingInvoices);

  assert.equal(check.isDuplicate, true);
  assert.equal(check.severity, "high");
  assert.equal(check.duplicateType, "exact_fy_match");
  assert.equal(check.matchedFields.sellerGstin, true);
  assert.equal(check.matchedFields.invoiceNumber, true);
  assert.equal(check.matchedFields.financialYear, true);
  assert.match(check.warningMessage, /Section 16\(2\)/);
});

test("Allows same invoice number across different financial years (Rule 46(b) compliant)", () => {
  const existingInvoices: StoredInvoiceRef[] = [
    {
      id: "inv_old",
      status: "confirmed",
      fp: "022025",
      data: {
        invoice_number: "001",
        seller_gstin: "07AAAAA0000A1Z5",
        invoice_date: "15-02-2025", // FY 2024-25
        invoice_total: 5000,
      },
      created_at: Date.now() - 500000,
      updated_at: Date.now() - 500000,
      synced_to_cloud: 1,
      deleted: 0,
      cloud_id: "c_old",
    },
  ];

  // Same invoice number "001" issued in a new financial year (FY 2026-27)
  const newCandidate = {
    invoice_number: "001",
    seller_gstin: "07AAAAA0000A1Z5",
    invoice_date: "15-05-2026", // FY 2026-27
    invoice_total: 7500,
  };

  const check = checkDuplicateInvoice(newCandidate, existingInvoices);

  // It flags a warning for awareness, but does not match exact FY
  assert.equal(check.matchedFields.financialYear, false);
});

test("Ignores deleted invoices during duplicate check", () => {
  const existingInvoices: StoredInvoiceRef[] = [
    {
      id: "inv_deleted",
      status: "confirmed",
      fp: "102026",
      data: {
        invoice_number: "INV-DEL-999",
        seller_gstin: "07AAAAA0000A1Z5",
        invoice_date: "24-10-2026",
        invoice_total: 1000,
      },
      created_at: Date.now() - 10000,
      updated_at: Date.now() - 10000,
      synced_to_cloud: 0,
      deleted: 1, // Deleted tombstone
      cloud_id: "",
    },
  ];

  const candidate = {
    invoice_number: "INV-DEL-999",
    seller_gstin: "07AAAAA0000A1Z5",
    invoice_date: "24-10-2026",
    invoice_total: 1000,
  };

  const check = checkDuplicateInvoice(candidate, existingInvoices);
  assert.equal(check.isDuplicate, false);
});

test("Detects in-batch duplicates when user uploads identical invoices simultaneously", () => {
  const existingInvoices: StoredInvoiceRef[] = [];

  const batchFiles = [
    {
      file: new File([""], "invoice1.pdf"),
      data: {
        invoice_number: "INV-BATCH-101",
        seller_gstin: "07AAAAA0000A1Z5",
        invoice_date: "24-10-2026",
        invoice_total: 2500,
      },
    },
    {
      file: new File([""], "invoice2.pdf"),
      data: {
        invoice_number: "INV-BATCH-102",
        seller_gstin: "07AAAAA0000A1Z5",
        invoice_date: "25-10-2026",
        invoice_total: 4200,
      },
    },
    {
      file: new File([""], "invoice1_copy.pdf"),
      data: {
        invoice_number: "INV-BATCH-101", // Duplicate of first item in same batch!
        seller_gstin: "07AAAAA0000A1Z5",
        invoice_date: "24-10-2026",
        invoice_total: 2500,
      },
    },
  ];

  const results = checkBatchDuplicates(batchFiles, existingInvoices);

  // File 0 is fresh
  assert.equal(results.get(0)?.isDuplicate, false);
  // File 1 is fresh
  assert.equal(results.get(1)?.isDuplicate, false);
  // File 2 is duplicate of File 0 within the same batch!
  assert.equal(results.get(2)?.isDuplicate, true);
  assert.equal(results.get(2)?.duplicateType, "in_batch_duplicate");
  assert.match(results.get(2)?.warningMessage || "", /Batch Conflict/);
});
