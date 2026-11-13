import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWhatsAppInvoiceMessage,
  buildGstr2bVendorReminder,
} from "../lib/whatsapp.ts";
import type { WhatsAppInvoiceData } from "../lib/whatsapp.ts";

test("buildWhatsAppInvoiceMessage generates formatted message with items and UPI intent", () => {
  const dummyInvoice: WhatsAppInvoiceData = {
    invoice_number: "INV-2026-999",
    invoice_date: "15-11-2026",
    seller_gstin: "07AAAAA0000A1Z5",
    buyer_gstin: "07BBBBB1111B1Z2",
    seller_gstin_info: { trade_name: "Apex Enterprises" },
    buyer_gstin_info: { trade_name: "Bharat Traders" },
    invoice_total: 11800,
    items: [
      { description: "MacBook Air", quantity: 1, taxable_amount: 10000, gst_rate: 18 },
    ],
  };

  const message = buildWhatsAppInvoiceMessage({
    invoice: dummyInvoice,
    sellerName: "Apex Enterprises",
    sellerUpiId: "apex@okhdfcbank",
    buyerPhone: "9876543210",
  });

  assert.ok(message.includes("TAX INVOICE — APEX ENTERPRISES"));
  assert.ok(message.includes("INV-2026-999"));
  assert.ok(message.includes("15-11-2026"));
  assert.ok(message.includes("MacBook Air"));
  assert.ok(message.includes("₹11,800"));
  assert.ok(message.includes("upi://pay?pa=apex%40okhdfcbank"));
  assert.ok(message.includes("gstlens.in"));
});

test("buildWhatsAppInvoiceMessage handles missing UPI and overflow items gracefully", () => {
  const dummyInvoice: WhatsAppInvoiceData = {
    invoice_number: "CASH-001",
    invoice_date: "10-11-2026",
    seller_gstin: "07AAAAA0000A1Z5",
    invoice_total: 550,
    items: [
      { description: "Item 1", quantity: 1, taxable_amount: 100 },
      { description: "Item 2", quantity: 1, taxable_amount: 100 },
      { description: "Item 3", quantity: 1, taxable_amount: 100 },
      { description: "Item 4", quantity: 1, taxable_amount: 100 },
      { description: "Item 5", quantity: 1, taxable_amount: 100 },
    ],
  };

  const message = buildWhatsAppInvoiceMessage({
    invoice: dummyInvoice,
  });

  assert.ok(message.includes("CASH-001"));
  assert.ok(message.includes("Item 1"));
  assert.ok(message.includes("and 2 more items"));
  assert.ok(!message.includes("upi://pay")); // No UPI generated when not provided
  assert.ok(message.includes("gstlens.in"));
});

test("buildWhatsAppInvoiceMessage includes full bill URL when provided", () => {
  const dummyInvoice: WhatsAppInvoiceData = {
    invoice_number: "INV-2026-444",
    invoice_date: "12-11-2026",
    seller_gstin: "07AAAAA0000A1Z5",
    invoice_total: 5000,
  };

  const billUrl = "https://gstlens.in/invoice/view?id=INV-2026-444&d=testpayload";
  const message = buildWhatsAppInvoiceMessage({
    invoice: dummyInvoice,
    fullBillUrl: billUrl,
  });

  assert.ok(message.includes("View Full Official Bill & Download PDF"));
  assert.ok(message.includes(billUrl));
});

test("buildGstr2bVendorReminder generates Section 16(2)(aa) statutory reminder for missing bills", () => {
  const msg = buildGstr2bVendorReminder({
    supplierName: "Apex Logistics Ltd",
    supplierGstin: "27AABCU9603R1ZM",
    invoiceNumber: "INV-2026-901",
    invoiceDate: "14-10-2026",
    invoiceValue: 59000,
    taxAmount: 9000,
    buyerBusinessName: "Bharat Enterprise",
    buyerGstin: "07AAACB1234F1Z0",
    tone: "statutory_standard",
  });

  assert.ok(msg.includes("GST COMPLIANCE REMINDER — SECTION 16(2)(aa)"));
  assert.ok(msg.includes("Apex Logistics Ltd"));
  assert.ok(msg.includes("INV-2026-901"));
  assert.ok(msg.includes("₹59,000"));
  assert.ok(msg.includes("₹9,000"));
  assert.ok(msg.includes("Rule 36(4)"));
  assert.ok(msg.includes("Bharat Enterprise"));
});

test("buildGstr2bVendorReminder formats urgent Rule 88C DRC-01B variance warning", () => {
  const msg = buildGstr2bVendorReminder({
    supplierName: "Metro Suppliers",
    invoiceNumber: "MET-554",
    invoiceDate: "20-10-2026",
    invoiceValue: 118000,
    taxAmount: 18000,
    buyerBusinessName: "Prime Retail",
    tone: "urgent_drc01b",
  });

  assert.ok(msg.includes("RISK OF RULE 88C / DRC-01B DEMAND NOTICE"));
  assert.ok(msg.includes("Section 50"));
  assert.ok(msg.includes("MET-554"));
  assert.ok(msg.includes("Prime Retail"));
});

test("buildGstr2bVendorReminder formats tax mismatch notice", () => {
  const msg = buildGstr2bVendorReminder({
    supplierName: "Falcon Heavy Goods",
    invoiceNumber: "FH-789",
    invoiceDate: "18-10-2026",
    invoiceValue: 25000,
    twoBValue: 20000,
    taxAmount: 3813,
    taxDiff: 5000,
    tone: "tax_mismatch",
  });

  assert.ok(msg.includes("GST TAX VARIANCE NOTICE"));
  assert.ok(msg.includes("Table 9"));
  assert.ok(msg.includes("FH-789"));
  assert.ok(msg.includes("₹25,000"));
  assert.ok(msg.includes("₹20,000"));
});
