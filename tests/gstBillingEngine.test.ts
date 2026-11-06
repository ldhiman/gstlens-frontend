import test from "node:test";
import assert from "node:assert/strict";
import {
  numberToWords,
  calculateLineTax,
  computeInvoiceTotals,
  generateUpiQrString,
  getFinancialYear,
  getStateCodeFromGSTIN,
  computeHsnSummary,
  validateRule46Invoice,
} from "../lib/gstBillingEngine.ts";
import type { LineItem } from "../lib/gstBillingEngine.ts";

test("numberToWords converts Indian currency accurately into words", () => {
  assert.equal(numberToWords(0), "Zero Rupees Only");
  assert.equal(numberToWords(500), "Five Hundred Rupees Only");
  assert.equal(numberToWords(1540.5), "One Thousand Five Hundred and Forty Rupees and Fifty Paise Only");
  assert.equal(numberToWords(125000), "One Lakh Twenty Five Thousand Rupees Only");
  assert.equal(numberToWords(15000000), "One Crore Fifty Lakh Rupees Only");
});

test("calculateLineTax computes Intra-state CGST & SGST accurately", () => {
  const item: LineItem = {
    id: "1",
    name: "Item A",
    quantity: 2,
    rate: 1000,
    taxPercent: 18,
    discount: 10,
    discountType: "percent",
  };
  // gross = 2000, discount = 200 (10%), taxable = 1800
  // CGST = 9% of 1800 = 162, SGST = 9% of 1800 = 162
  // Total = 1800 + 162 + 162 = 2124
  const res = calculateLineTax(item, false);
  assert.equal(res.netAmount, 2000);
  assert.equal(res.discountAmount, 200);
  assert.equal(res.taxableValue, 1800);
  assert.equal(res.cgstRate, 9);
  assert.equal(res.cgstAmount, 162);
  assert.equal(res.sgstRate, 9);
  assert.equal(res.sgstAmount, 162);
  assert.equal(res.igstAmount, 0);
  assert.equal(res.totalAmount, 2124);
});

test("calculateLineTax computes Inter-state IGST accurately", () => {
  const item: LineItem = {
    id: "2",
    name: "Item B",
    quantity: 1,
    rate: 5000,
    taxPercent: 12,
    discount: 500,
    discountType: "fixed",
  };
  // gross = 5000, discount = 500, taxable = 4500
  // IGST = 12% of 4500 = 540
  // Total = 4500 + 540 = 5040
  const res = calculateLineTax(item, true);
  assert.equal(res.taxableValue, 4500);
  assert.equal(res.cgstAmount, 0);
  assert.equal(res.sgstAmount, 0);
  assert.equal(res.igstRate, 12);
  assert.equal(res.igstAmount, 540);
  assert.equal(res.totalAmount, 5040);
});

test("calculateLineTax handles MRP tax-inclusive pricing correctly", () => {
  const item: LineItem = {
    id: "3",
    name: "Item C (Inclusive)",
    quantity: 1,
    rate: 1180,
    taxPercent: 18,
    taxInclusive: true,
  };
  // 1180 / 1.18 = 1000 taxable value
  // IGST = 180
  const res = calculateLineTax(item, true);
  assert.equal(res.taxableValue, 1000);
  assert.equal(res.igstAmount, 180);
  assert.equal(res.totalAmount, 1180);
});

test("computeInvoiceTotals aggregates items and applies Section 170 round-off", () => {
  const items: LineItem[] = [
    {
      id: "1",
      name: "Item 1",
      quantity: 1,
      rate: 100.35,
      taxPercent: 18,
    },
  ];
  // taxable = 100.35, igst = 18.06, raw total = 118.41
  // nearest rupee = 118, roundOff = -0.41
  const totals = computeInvoiceTotals(items, true, { applyRoundOff: true });
  assert.equal(totals.grandTotal, 118);
  assert.equal(totals.roundOff, -0.41);
});

test("generateUpiQrString formats standard NPCI UPI payment URL", () => {
  const url = generateUpiQrString({
    upiId: "merchant@okhdfcbank",
    payeeName: "Apex Retail",
    amount: 1499.5,
    invoiceNo: "INV/2026-27/0001",
  });
  assert.ok(url.startsWith("upi://pay?pa=merchant%40okhdfcbank"));
  assert.ok(url.includes("am=1499.50"));
  assert.ok(url.includes("cu=INR"));
});

test("computeInvoiceTotals differentiates Pre-tax Trade Discount (Sec 15(3)(a)) vs Post-tax Discount", () => {
  const items: LineItem[] = [
    {
      id: "1",
      name: "Widget Pro",
      quantity: 10,
      rate: 100,
      discount: 10,
      discountType: "percent", // Pre-tax discount: 10% of 1000 = 100
      taxPercent: 18,
    },
  ];
  // Gross = 1000, Pre-tax discount = 100, Taxable = 900
  // IGST (18%) = 162
  // Subtotal with tax = 1062
  // Post-tax cash discount = 50
  // Total before roundoff = 1062 - 50 = 1012
  const totals = computeInvoiceTotals(items, true, {
    postTaxDiscount: 50,
  });

  assert.equal(totals.subtotal, 1000);
  assert.equal(totals.totalDiscount, 100);
  assert.equal(totals.taxableAmount, 900);
  assert.equal(totals.igst, 162);
  assert.equal(totals.postTaxDiscount, 50);
  assert.equal(totals.grandTotal, 1012);
});

test("computeInvoiceTotals handles Reverse Charge (RCM) where recipient pays tax directly to Govt", () => {
  const items: LineItem[] = [
    {
      id: "rcm-1",
      name: "Legal Consultation Services",
      quantity: 1,
      rate: 50000,
      taxPercent: 18,
    },
  ];
  // Intra-state supply: Taxable = 50000, CGST = 4500, SGST = 4500
  // Total tax = 9000
  // Under Section 9(3), recipient pays 9000 directly to Govt in cash
  // Net payable by client to Advocate/Supplier = 50,000 (taxable amount)
  const totals = computeInvoiceTotals(items, false, {
    isReverseCharge: true,
  });

  assert.equal(totals.taxableAmount, 50000);
  assert.equal(totals.cgst, 4500);
  assert.equal(totals.sgst, 4500);
  assert.equal(totals.isReverseCharge, true);
  assert.equal(totals.taxPayableByRecipient, 9000);
  assert.equal(totals.netPayableToSupplier, 50000);
  assert.equal(totals.grandTotal, 59000);
});

test("Section 170 nearest rupee round-off boundary tests across 50 paise thresholds", () => {
  // Case A: 50 paise or more rounds UP
  const itemsUp: LineItem[] = [
    {
      id: "up",
      name: "Item Up",
      quantity: 1,
      rate: 85.17, // 85.17 * 1.18 = 100.5006 -> raw 100.50
      taxPercent: 18,
    },
  ];
  const totalsUp = computeInvoiceTotals(itemsUp, true);
  assert.equal(totalsUp.taxableAmount, 85.17);
  assert.equal(totalsUp.igst, 15.33); // 85.17 * 0.18 = 15.3306 -> 15.33
  // rawTotal = 85.17 + 15.33 = 100.50 -> rounds to 101
  assert.equal(totalsUp.grandTotal, 101);
  assert.equal(totalsUp.roundOff, 0.50);

  // Case B: Less than 50 paise rounds DOWN (ignored)
  const itemsDown: LineItem[] = [
    {
      id: "down",
      name: "Item Down",
      quantity: 1,
      rate: 85.16, // 85.16 * 0.18 = 15.3288 -> 15.33
      taxPercent: 18,
    },
  ];
  const totalsDown = computeInvoiceTotals(itemsDown, true);
  // rawTotal = 85.16 + 15.33 = 100.49 -> rounds to 100
  assert.equal(totalsDown.grandTotal, 100);
  assert.equal(totalsDown.roundOff, -0.49);
});

test("computeHsnSummary aggregates items by HSN and GST rate for Table 12", () => {
  const items: LineItem[] = [
    {
      id: "1",
      name: "USB Keyboard",
      hsn: "84716060",
      quantity: 5,
      unit: "NOS",
      rate: 400,
      taxPercent: 18,
    },
    {
      id: "2",
      name: "Optical Mouse",
      hsn: "84716060", // Same HSN & rate
      quantity: 10,
      unit: "NOS",
      rate: 200,
      taxPercent: 18,
    },
    {
      id: "3",
      name: "HDMI Cable",
      hsn: "85444299", // Different HSN
      quantity: 2,
      unit: "NOS",
      rate: 300,
      taxPercent: 18,
    },
  ];

  const summary = computeHsnSummary(items, false);
  assert.equal(summary.length, 2);

  // 84716060: Qty 5 + 10 = 15; Taxable: 2000 + 2000 = 4000; CGST 9% = 360, SGST 9% = 360
  const hsn8471 = summary.find((s: any) => s.hsn === "84716060");
  assert.ok(hsn8471);
  assert.equal(hsn8471.totalQuantity, 15);
  assert.equal(hsn8471.taxableValue, 4000);
  assert.equal(hsn8471.cgstAmount, 360);
  assert.equal(hsn8471.sgstAmount, 360);
  assert.equal(hsn8471.igstAmount, 0);

  // 85444299: Qty 2; Taxable: 600; CGST = 54, SGST = 54
  const hsn8544 = summary.find((s: any) => s.hsn === "85444299");
  assert.ok(hsn8544);
  assert.equal(hsn8544.totalQuantity, 2);
  assert.equal(hsn8544.taxableValue, 600);
});

test("validateRule46Invoice enforces statutory invoice rules and flags violations", () => {
  // Valid invoice
  const validResult = validateRule46Invoice({
    invoiceNumber: "INV/2026-27/001",
    invoiceDate: "2026-10-29",
    supplier: {
      name: "Apex Technologies Pvt Ltd",
      gstin: "07AAAAA0000A1Z5",
    },
    buyer: {
      name: "Bright Solutions LLP",
      gstin: "29BBBBB1111B1Z2",
    },
    placeOfSupply: "29",
    items: [
      {
        id: "1",
        name: "Software Consulting",
        hsn: "998313",
        quantity: 1,
        unit: "HRS",
        rate: 10000,
        taxPercent: 18,
      },
    ],
    totalAmount: 11800,
  });
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.errors.length, 0);

  // Invalid: Invoice serial number exceeding 16 chars (Rule 46(b) violation)
  const invalidNumResult = validateRule46Invoice({
    invoiceNumber: "INVOICE-VERY-LONG-NUMBER-EXCEEDING-16",
    invoiceDate: "2026-10-29",
    supplier: {
      name: "Apex Technologies",
      gstin: "07AAAAA0000A1Z5",
    },
    buyer: {
      name: "Retail Customer",
    },
    placeOfSupply: "07",
    items: [
      {
        id: "1",
        name: "Item",
        quantity: 1,
        rate: 100,
        taxPercent: 18,
      },
    ],
  });
  assert.equal(invalidNumResult.isValid, false);
  assert.ok(invalidNumResult.errors.some((e: string) => e.includes("exceeds statutory maximum length of 16 characters")));

  // Invalid: B2C invoice >= 50,000 missing recipient address (Rule 46(e) violation)
  const b2cHighValResult = validateRule46Invoice({
    invoiceNumber: "INV/002",
    invoiceDate: "2026-10-29",
    supplier: {
      name: "Apex Technologies",
      gstin: "07AAAAA0000A1Z5",
    },
    buyer: {
      name: "John Doe",
      // Missing address for high value B2C
    },
    placeOfSupply: "07",
    items: [
      {
        id: "1",
        name: "High Value Laptop",
        hsn: "84713010",
        quantity: 1,
        unit: "NOS",
        rate: 60000,
        taxPercent: 18,
      },
    ],
    totalAmount: 70800,
  });
  assert.equal(b2cHighValResult.isValid, false);
  assert.ok(b2cHighValResult.errors.some((e: string) => e.includes("Rule 46(e)")));
});

test("getStateCodeFromGSTIN parses 2-digit state code correctly", () => {
  assert.equal(getStateCodeFromGSTIN("27AABCA1234F1Z8"), "27");
  assert.equal(getStateCodeFromGSTIN("07AAACG9876E1ZH"), "07");
  assert.equal(getStateCodeFromGSTIN("INVALID"), "");
});
