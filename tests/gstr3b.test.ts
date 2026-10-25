import test from "node:test";
import assert from "node:assert/strict";
import {
  computeGSTR3B,
  generateGSTR3BJSON,
  roundNearest,
  checkDRC01BRisk,
} from "../lib/gstr3b.ts";
import { generateGSTR3BCSV, generateGSTR1CSV } from "../lib/export.ts";

test("GSTR-3B computes Table 3.1 outward liability and Section 170 nearest rupee rounding", () => {
  const userGSTIN = "07AAAAA0000A1Z5";
  const fp = "102026";
  const invoices = [
    {
      data: {
        seller_gstin: "07AAAAA0000A1Z5",
        buyer_gstin: "29BBBBB1111B1Z2",
        taxable_value: 1000.49,
        igst: 180.49,
        cgst: 0,
        sgst: 0,
        pos: "29",
      },
    },
    {
      data: {
        seller_gstin: "07AAAAA0000A1Z5",
        buyer_gstin: "07CCCCC2222C1Z3",
        taxable_value: 2000.51,
        igst: 0,
        cgst: 180.51,
        sgst: 180.51,
        pos: "07",
      },
    },
  ];

  const comp = computeGSTR3B(userGSTIN, fp, invoices);

  assert.equal(comp.gstin, userGSTIN);
  assert.equal(comp.ret_period, "102026");
  assert.equal(comp.filing_typ, "GSTR3B");

  const osup = comp.sup_details.osup_det;
  assert.equal(osup.txval, roundNearest(1000.49 + 2000.51)); // 3001
  assert.equal(osup.iamt, roundNearest(180.49)); // 180
  assert.equal(osup.camt, roundNearest(180.51)); // 181
  assert.equal(osup.samt, roundNearest(180.51)); // 181
});

test("GSTR-3B computes Table 4 Eligible ITC from inward purchase invoices", () => {
  const userGSTIN = "07AAAAA0000A1Z5";
  const fp = "102026";
  const invoices = [
    // Outward Sale
    {
      data: {
        seller_gstin: "07AAAAA0000A1Z5",
        buyer_gstin: "07XXXXX9999X1Z1",
        taxable_value: 10000,
        cgst: 900,
        sgst: 900,
        igst: 0,
      },
    },
    // Inward Purchase (Eligible ITC)
    {
      data: {
        seller_gstin: "27VENDOR1234V1Z5",
        buyer_gstin: "07AAAAA0000A1Z5",
        taxable_value: 5000,
        igst: 900,
        cgst: 0,
        sgst: 0,
        is_inward: true,
      },
    },
    // Inward Purchase with Section 17(5) Blocked Credit (e.g. food/restaurant)
    {
      data: {
        seller_gstin: "07HOTEL5555H1Z5",
        buyer_gstin: "07AAAAA0000A1Z5",
        taxable_value: 1000,
        cgst: 25,
        sgst: 25,
        igst: 0,
        is_inward: true,
        is_blocked_itc: true,
      },
    },
  ];

  const comp = computeGSTR3B(userGSTIN, fp, invoices);

  // Table 4(A)(5) All Other ITC
  const oth = comp.itc_elg.itc_avl.OTH;
  assert.equal(oth.iamt, 900);
  assert.equal(oth.camt, 25);
  assert.equal(oth.samt, 25);

  // Table 4(B)(1) Ineligible / Reversed ITC
  const rev = comp.itc_elg.itc_rev.RUL;
  assert.equal(rev.camt, 25);
  assert.equal(rev.samt, 25);

  // Table 4(C) Net ITC = 4(A) - 4(B)
  const net = comp.itc_elg.itc_net;
  assert.equal(net.iamt, 900);
  assert.equal(net.camt, 0); // 25 - 25 = 0
  assert.equal(net.samt, 0); // 25 - 25 = 0

  // Net Cash Payable: Outward CGST(900) - Net ITC(0) = 900; Outward SGST(900) - Net ITC(0) = 900
  const cashPay = comp.tax_summary.net_cash_payable;
  assert.equal(cashPay.camt, 900);
  assert.equal(cashPay.samt, 900);
  assert.equal(cashPay.iamt, 0); // Outward IGST 0 - Net ITC 900 = 0
});

test("GSTR-3B Table 3.2 aggregates inter-state supplies to unregistered persons by POS", () => {
  const userGSTIN = "07AAAAA0000A1Z5"; // State 07 (Delhi)
  const invoices = [
    {
      data: {
        seller_gstin: "07AAAAA0000A1Z5",
        buyer_gstin: "", // B2C unregistered
        pos: "08", // Rajasthan
        taxable_value: 2000,
        igst: 360,
      },
    },
    {
      data: {
        seller_gstin: "07AAAAA0000A1Z5",
        buyer_gstin: "", // B2C unregistered
        pos: "08", // Rajasthan again
        taxable_value: 3000,
        igst: 540,
      },
    },
    {
      data: {
        seller_gstin: "07AAAAA0000A1Z5",
        buyer_gstin: "", // B2C intra-state (Delhi) -> NOT in Table 3.2
        pos: "07",
        taxable_value: 1000,
        cgst: 90,
        sgst: 90,
      },
    },
  ];

  const comp = computeGSTR3B(userGSTIN, "102026", invoices);
  const unreg = comp.inter_sup.unreg_details;

  assert.equal(unreg.length, 1);
  assert.equal(unreg[0].pos, "08");
  assert.equal(unreg[0].txval, 5000); // 2000 + 3000
  assert.equal(unreg[0].iamt, 900); // 360 + 540
});

test("CA CSV export generator generates valid UTF-8 BOM workpaper for Excel", () => {
  const comp = computeGSTR3B("07AAAAA0000A1Z5", "102026", [
    {
      data: {
        seller_gstin: "07AAAAA0000A1Z5",
        taxable_value: 10000,
        igst: 1800,
      },
    },
  ]);

  const csv = generateGSTR3BCSV(comp);
  assert.ok(csv.startsWith("\uFEFF")); // Contains BOM
  assert.ok(csv.includes("TABLE 3.1: DETAILS OF OUTWARD SUPPLIES"));
  assert.ok(csv.includes("TABLE 4: ELIGIBLE INPUT TAX CREDIT"));
  assert.ok(csv.includes("NET CASH TAX PAYABLE"));
});

test("checkDRC01BRisk detects high risk when GSTR-1 exceeds GSTR-3B by over 25,000", () => {
  const risk = checkDRC01BRisk(50000, 20000); // Diff 30,000
  assert.equal(risk.isRisk, true);
  assert.equal(risk.severity, "high");
  assert.ok(risk.message.includes("High DRC-01B Notice Risk"));
});
