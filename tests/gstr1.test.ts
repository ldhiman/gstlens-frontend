import test from "node:test";
import assert from "node:assert/strict";
import { generateGSTR1JSON, getTaxRate } from "../lib/gstr1.ts";

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

test("GSTR-1 separates B2CL (Inter-state unregistered > 2.5L) from B2CS with offline schema parity", () => {
  const sellerGSTIN = "07AAAAA0000A1Z5"; // Delhi (07)
  const fp = "102026";
  const invoices = [
    // B2CL: Inter-state (POS 27 Maharashtra != 07 Delhi), Unregistered buyer, Total 3,54,000 > 2,50,000
    {
      data: {
        invoice_number: "INV-B2CL-01",
        invoice_date: "2026-10-20",
        invoice_type: "B2C",
        buyer_gstin: null,
        pos: "27",
        taxable_value: 300000,
        igst: 54000,
        invoice_total: 354000,
        hsn: "84713010",
      },
    },
    // B2CS: Inter-state (POS 27 Maharashtra), Unregistered buyer, Total 59,000 <= 2,50,000
    {
      data: {
        invoice_number: "INV-B2CS-01",
        invoice_date: "2026-10-21",
        invoice_type: "B2C",
        buyer_gstin: null,
        pos: "27",
        taxable_value: 50000,
        igst: 9000,
        invoice_total: 59000,
        hsn: "84713010",
      },
    },
  ];

  const result = generateGSTR1JSON(sellerGSTIN, fp, invoices);

  // Assert B2CL section
  assert.equal(result.b2cl.length, 1);
  const b2clEntry = result.b2cl[0];
  assert.equal(b2clEntry.pos, "27");
  assert.equal(b2clEntry.inv.length, 1);
  const b2clInv = b2clEntry.inv[0];
  assert.equal(b2clInv.inum, "INV-B2CL-01");
  assert.equal(b2clInv.val, 354000);
  assert.equal(b2clInv.itms[0].itm_det.txval, 300000);
  assert.equal(b2clInv.itms[0].itm_det.rt, 18);
  assert.equal(b2clInv.itms[0].itm_det.iamt, 54000);

  // Assert B2CS section (only the 59,000 invoice goes here)
  assert.equal(result.b2cs.length, 1);
  const b2csEntry = result.b2cs[0];
  assert.equal(b2csEntry.sply_ty, "INTER");
  assert.equal(b2csEntry.pos, "27");
  assert.equal(b2csEntry.txval, 50000);
  assert.equal(b2csEntry.iamt, 9000);
});

test("GSTR-1 reflects Reverse Charge flag 'Y' on B2B invoices", () => {
  const sellerGSTIN = "07AAAAA0000A1Z5";
  const fp = "102026";
  const invoices = [
    {
      data: {
        invoice_number: "INV-RCM-B2B",
        invoice_date: "2026-10-15",
        invoice_type: "B2B",
        buyer_gstin: "29BBBBB1111B2Z6",
        pos: "29",
        reverse_charge: true,
        taxable_value: 100000,
        igst: 18000,
        invoice_total: 118000,
      },
    },
  ];

  const result = generateGSTR1JSON(sellerGSTIN, fp, invoices);
  assert.equal(result.b2b.length, 1);
  const inv = result.b2b[0].inv[0];
  assert.equal(inv.rchrg, "Y");
  assert.equal(inv.inv_typ, "R");
});

test("GSTR-1 populates Table 12 HSN Summary compliant with GSTN offline tool schema", () => {
  const sellerGSTIN = "07AAAAA0000A1Z5";
  const fp = "102026";
  const invoices = [
    {
      data: {
        invoice_number: "INV-HSN-1",
        invoice_date: "2026-10-10",
        invoice_type: "B2B",
        buyer_gstin: "07CCCCC3333C1Z8",
        pos: "07",
        invoice_total: 11800,
        items: [
          {
            name: "Server Rack",
            hsn: "84717020",
            quantity: 2,
            unit: "NOS",
            taxable_value: 10000,
            taxPercent: 18,
            cgst: 900,
            sgst: 900,
            igst: 0,
          },
        ],
      },
    },
  ];

  const result = generateGSTR1JSON(sellerGSTIN, fp, invoices);
  assert.ok(result.hsn);
  assert.ok(Array.isArray(result.hsn.data));
  assert.equal(result.hsn.data.length, 1);

  const hsnItem = result.hsn.data[0];
  assert.equal(hsnItem.num, 1);
  assert.equal(hsnItem.hsn_sc, "84717020");
  assert.equal(hsnItem.desc, "Server Rack");
  assert.equal(hsnItem.uqc, "NOS");
  assert.equal(hsnItem.qty, 2);
  assert.equal(hsnItem.txval, 10000);
  assert.equal(hsnItem.camt, 900);
  assert.equal(hsnItem.samt, 900);
  assert.equal(hsnItem.val, 11800);
});

test("GSTR-1 handles statutory fractional GST rates accurately (0.25%, 1.5%, 3%)", () => {
  // 0.25% Rough diamonds: Taxable 4,00,000, IGST 1,000
  assert.equal(getTaxRate({ taxable_value: 400000, igst: 1000 }), 0.25);

  // 1.5% Cut & polished diamonds: Taxable 2,00,000, IGST 3,000
  assert.equal(getTaxRate({ taxable_value: 200000, igst: 3000 }), 1.5);

  // 3% Gold bullion: Taxable 1,00,000, CGST 1,500, SGST 1,500
  assert.equal(getTaxRate({ taxable_value: 100000, cgst: 1500, sgst: 1500 }), 3);
});
