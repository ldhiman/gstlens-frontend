import test from "node:test";
import assert from "node:assert/strict";
import { generateGSTR1JSON } from "../lib/gstr1.ts";

test("GSTR-1 separates B2B and B2C invoices correctly", () => {
  const sellerGSTIN = "07AAAAA0000A1Z5";
  const fp = "102026";
  const invoices = [
    {
      data: {
        invoice_number: "INV-B2B-1",
        invoice_date: "24.10.2026",
        invoice_type: "B2B",
        buyer_gstin: "29BBBBB1111B2Z6",
        seller_gstin: sellerGSTIN,
        pos: "29",
        taxable_value: 1000,
        cgst: 0,
        sgst: 0,
        igst: 180,
        invoice_total: 1180,
      },
    },
    {
      data: {
        invoice_number: "INV-B2C-1",
        invoice_date: "2026-10-25",
        invoice_type: "B2C",
        buyer_gstin: null,
        seller_gstin: sellerGSTIN,
        pos: "07",
        taxable_value: 500,
        cgst: 45,
        sgst: 45,
        igst: 0,
        invoice_total: 590,
      },
    },
  ];

  const result = generateGSTR1JSON(sellerGSTIN, fp, invoices);

  assert.equal(result.gstin, sellerGSTIN);
  assert.equal(result.fp, fp);
  assert.equal(result.version, "GST3.0.4");

  // B2B assertions
  assert.equal(result.b2b.length, 1);
  assert.equal(result.b2b[0].ctin, "29BBBBB1111B2Z6");
  assert.equal(result.b2b[0].inv.length, 1);
  const b2bInv = result.b2b[0].inv[0];
  assert.equal(b2bInv.inum, "INV-B2B-1");
  assert.equal(b2bInv.idt, "24-10-2026"); // Normalized to hyphens
  assert.equal(b2bInv.val, 1180);
  assert.equal(b2bInv.itms[0].itm_det.txval, 1000);
  assert.equal(b2bInv.itms[0].itm_det.rt, 18);
  assert.equal(b2bInv.itms[0].itm_det.iamt, 180);

  // B2CS summary assertions
  assert.equal(result.b2cs.length, 1);
  const b2csSummary = result.b2cs[0];
  assert.equal(b2csSummary.sply_ty, "INTRA");
  assert.equal(b2csSummary.pos, "07");
  assert.equal(b2csSummary.rt, 18);
  assert.equal(b2csSummary.txval, 500);
  assert.equal(b2csSummary.camt, 45);
  assert.equal(b2csSummary.samt, 45);
});

test("GSTR-1 aggregates multiple B2C invoices into same summary block", () => {
  const sellerGSTIN = "07AAAAA0000A1Z5";
  const fp = "102026";
  const invoices = [
    {
      data: {
        invoice_number: "C1",
        invoice_type: "B2C",
        pos: "07",
        taxable_value: 100,
        cgst: 9,
        sgst: 9,
        igst: 0,
        invoice_total: 118,
      },
    },
    {
      data: {
        invoice_number: "C2",
        invoice_type: "B2C",
        pos: "07",
        taxable_value: 200,
        cgst: 18,
        sgst: 18,
        igst: 0,
        invoice_total: 236,
      },
    },
  ];

  const result = generateGSTR1JSON(sellerGSTIN, fp, invoices);

  // Both should be merged into 1 INTRA 07 18% summary entry
  assert.equal(result.b2cs.length, 1);
  assert.equal(result.b2cs[0].txval, 300);
  assert.equal(result.b2cs[0].camt, 27);
  assert.equal(result.b2cs[0].samt, 27);
  assert.equal(result.b2c.length, 2); // Raw list preserved
});
