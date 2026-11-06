import test from "node:test";
import assert from "node:assert/strict";
import {
  runGstr2bReconciliation,
  normalizeInvoiceKey,
  isSection16TimeBarred,
} from "../lib/reconciliationEngine.ts";
import type { Gstr2bSupplier } from "../lib/reconciliationEngine.ts";
import type { PurchaseBill } from "../lib/storage.ts";

test("normalizeInvoiceKey strips special characters and redundant leading zeros", () => {
  assert.equal(normalizeInvoiceKey("INV/2026/0045"), "INV202645");
  assert.equal(normalizeInvoiceKey("PB-0012"), "PB12");
  assert.equal(normalizeInvoiceKey("TAX#990"), "TAX990");
});

test("isSection16TimeBarred identifies invoices past November cut-off of following FY", () => {
  // Invoice in FY 2024-25 (e.g. 15-06-2024). Cut-off is 30-Nov-2025.
  const invDate = "15-06-2024";

  // Check on 15-Oct-2025 (Before deadline -> NOT time barred)
  assert.equal(isSection16TimeBarred(invDate, new Date(2025, 9, 15)), false);

  // Check on 05-Dec-2025 (Past deadline -> TIME BARRED)
  assert.equal(isSection16TimeBarred(invDate, new Date(2025, 11, 5)), true);
});

test("runGstr2bReconciliation accurately categorizes Exact Match and Fuzzy Match", () => {
  const portalSuppliers: Gstr2bSupplier[] = [
    {
      ctin: "27AABCU9603R1ZN",
      trdnm: "Apex Corp",
      inv: [
        {
          inum: "INV-2026-001",
          idt: "10-10-2026",
          val: 11800,
          items: [{ txval: 10000, camt: 900, samt: 900 }],
        },
        {
          inum: "FL-0089",
          idt: "12-10-2026",
          val: 5900,
          items: [{ txval: 5000, camt: 450, samt: 450 }],
        },
      ],
    },
  ];

  const bookPurchases: PurchaseBill[] = [
    {
      id: "p-1",
      invoiceNumber: "INV-2026-001", // Exact match
      date: "2026-10-10",
      supplierName: "Apex Corp",
      supplierGstin: "27AABCU9603R1ZN",
      items: [],
      interstate: false,
      itcEligibility: "eligible",
      paymentStatus: "Paid",
      taxableAmount: 10000,
      cgst: 900,
      sgst: 900,
      igst: 0,
      cess: 0,
      total: 11800,
      created_at: 1000,
    },
    {
      id: "p-2",
      invoiceNumber: "FL-89", // Fuzzy match (FL-0089 vs FL-89)
      date: "2026-10-12",
      supplierName: "Apex Corp",
      supplierGstin: "27AABCU9603R1ZN",
      items: [],
      interstate: false,
      itcEligibility: "eligible",
      paymentStatus: "Paid",
      taxableAmount: 5000,
      cgst: 450,
      sgst: 450,
      igst: 0,
      cess: 0,
      total: 5900,
      created_at: 1000,
    },
  ];

  const { records, summary } = runGstr2bReconciliation(portalSuppliers, bookPurchases);

  assert.equal(summary.exactMatchCount, 1);
  assert.equal(summary.fuzzyMatchCount, 1);
  assert.equal(summary.mismatchCount, 0);
  assert.equal(summary.safeClaimableITC, 1800 + 900); // 2700
  assert.equal(summary.isDrc01bHighRisk, false);
});

test("runGstr2bReconciliation detects Rule 88C DRC-01B High Risk when Book ITC vastly exceeds 2B", () => {
  const portalSuppliers: Gstr2bSupplier[] = []; // Zero in portal

  const bookPurchases: PurchaseBill[] = [
    {
      id: "p-big",
      invoiceNumber: "BIG-INV-101",
      date: "2026-10-15",
      supplierName: "Big Supplier",
      supplierGstin: "27AABCU9603R1ZN",
      items: [],
      interstate: false,
      itcEligibility: "eligible",
      paymentStatus: "Paid",
      taxableAmount: 200000,
      cgst: 18000,
      sgst: 18000,
      igst: 0,
      cess: 0,
      total: 236000,
      created_at: 1000,
    },
  ];

  const { summary } = runGstr2bReconciliation(portalSuppliers, bookPurchases);

  assert.equal(summary.bookOnlyCount, 1);
  assert.equal(summary.atRiskBookITC, 36000);
  // Variance is ₹36,000 (> ₹25,000 limit) -> Triggers High Risk
  assert.equal(summary.isDrc01bHighRisk, true);
});
