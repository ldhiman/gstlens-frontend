import test from "node:test";
import assert from "node:assert/strict";
import {
  SAMPLE_SANDBOX_PROFILE,
  buildSandboxInvoices,
  buildSandboxPurchases,
} from "../lib/sandboxData.ts";
import { generateGSTR1JSON } from "../lib/gstr1.ts";
import { computeGSTR3B } from "../lib/gstr3b.ts";
import { generateTallyXML } from "../lib/tally.ts";

test("buildSandboxInvoices generates deterministic IDs and current-month dates dynamically", () => {
  const jan1 = new Date(2027, 0, 1); // Jan 1, 2027
  const invoices = buildSandboxInvoices(jan1);

  assert.equal(invoices.length, 3);
  assert.deepEqual(
    invoices.map((i) => i.id),
    ["sandbox-inv-1", "sandbox-inv-2", "sandbox-inv-3"]
  );
  for (const inv of invoices) {
    assert.equal(inv.fp, "012027");
    assert.equal(inv.status, "confirmed");
    assert.equal(inv.data.invoice_date, "01-01-2027");
  }

  const nov15 = new Date(2026, 10, 15); // Nov 15, 2026
  const novInvoices = buildSandboxInvoices(nov15);
  assert.deepEqual(
    novInvoices.map((i) => i.data.invoice_date),
    ["02-11-2026", "05-11-2026", "08-11-2026"]
  );
  assert.equal(novInvoices[0].fp, "112026");
});

test("buildSandboxPurchases generates deterministic IDs and YYYY-MM-DD dates", () => {
  const ref = new Date(2026, 10, 11);
  const purchases = buildSandboxPurchases(ref);

  assert.equal(purchases.length, 2);
  assert.deepEqual(
    purchases.map((p) => p.id),
    ["sandbox-pur-1", "sandbox-pur-2"]
  );
  assert.equal(purchases[0].date, "2026-11-01");
  assert.equal(purchases[1].date, "2026-11-04");
  assert.equal(purchases[0].itcEligibility, "eligible");
});

test("Sandbox invoices compile into valid non-zero GSTR-1 JSON with exact HSNs", () => {
  const ref = new Date(2026, 10, 15);
  const invoices = buildSandboxInvoices(ref);
  const gstr1 = generateGSTR1JSON(SAMPLE_SANDBOX_PROFILE.gstin!, "112026", invoices);

  // 2 B2B invoices across 2 buyers
  assert.equal(gstr1.b2b.length, 2);
  const firstB2bItem = gstr1.b2b[0].inv[0].itms[0].itm_det;
  assert.equal(firstB2bItem.txval, 25000);
  assert.equal(firstB2bItem.iamt, 4500);
  assert.equal(firstB2bItem.rt, 18);

  // 1 B2C small invoice aggregated in b2cs
  assert.equal(gstr1.b2cs.length, 1);
  assert.equal(gstr1.b2cs[0].txval, 3000);
  assert.equal(gstr1.b2cs[0].camt, 270);
  assert.equal(gstr1.b2cs[0].samt, 270);

  // Table 12 HSN Summary uses real HSN codes (not fallback 9999)
  const hsnCodes = gstr1.hsn.data.map((h: any) => h.hsn_sc);
  assert.ok(hsnCodes.includes("998311"));
  assert.ok(hsnCodes.includes("8471"));
  assert.ok(!hsnCodes.includes("9999"));
});

test("Sandbox invoices & purchases compute valid GSTR-3B and balanced Tally XML", () => {
  const ref = new Date(2026, 10, 15);
  const invoices = buildSandboxInvoices(ref);
  const purchases = buildSandboxPurchases(ref);

  const mappedPurchases = purchases.map((p) => ({
    id: p.id,
    data: {
      is_inward: true,
      taxable_value: p.taxableAmount,
      cgst: p.cgst,
      sgst: p.sgst,
      igst: p.igst,
      cess: p.cess,
      invoice_total: p.total,
      itc_eligible: true,
    },
  }));

  const gstr3b = computeGSTR3B(
    SAMPLE_SANDBOX_PROFILE.gstin!,
    "112026",
    [...invoices, ...mappedPurchases]
  );

  // Outward taxable = 25000 + 12000 + 3000 = 40000
  assert.equal(gstr3b.sup_details.osup_det.txval, 40000);
  assert.equal(gstr3b.sup_details.osup_det.iamt, 4500);
  assert.equal(gstr3b.sup_details.osup_det.camt, 1350);
  assert.equal(gstr3b.sup_details.osup_det.samt, 1350);

  // Eligible ITC from purchases = 900+450 CGST + 900+450 SGST = 1350 + 1350
  assert.equal(gstr3b.itc_elg.itc_avl.OTH.camt, 1350);
  assert.equal(gstr3b.itc_elg.itc_avl.OTH.samt, 1350);

  // Tally XML generation succeeds cleanly with 3 vouchers
  const xml = generateTallyXML(
    SAMPLE_SANDBOX_PROFILE.gstin!,
    invoices,
    SAMPLE_SANDBOX_PROFILE.tradeName!
  );
  assert.ok(xml.includes("SI-2026-001"));
  assert.ok(xml.includes("SI-2026-002"));
  assert.ok(xml.includes("SI-2026-003"));
});
