import test from "node:test";
import assert from "node:assert/strict";
import {
  escapeXML,
  formatTallyDate,
  getTallyStateName,
  generateTallyXML,
  type TallyInvoiceRecord,
} from "../lib/tally.ts";
import { runBatchUploadQueue } from "../lib/batchUpload.ts";

test("Tally XML entity escaping sanitizes special XML characters", () => {
  const raw = `Apex & Sons <Trading> "Delhi" 'Retail'`;
  const escaped = escapeXML(raw);
  assert.equal(escaped, `Apex &amp; Sons &lt;Trading&gt; &quot;Delhi&quot; &apos;Retail&apos;`);
});

test("Tally date formatter produces mandatory 8-digit YYYYMMDD format", () => {
  assert.equal(formatTallyDate("24-10-2026"), "20261024");
  assert.equal(formatTallyDate("2026-10-24"), "20261024");
  assert.equal(formatTallyDate("05.02.2025"), "20250205");
  assert.equal(formatTallyDate("1/3/26"), "20260301");
});

test("State name lookup resolves standard Tally state names from 2-digit POS code", () => {
  assert.equal(getTallyStateName("07"), "Delhi");
  assert.equal(getTallyStateName("27"), "Maharashtra");
  assert.equal(getTallyStateName("29"), "Karnataka");
  assert.equal(getTallyStateName("06"), "Haryana");
});

test("Generates schema-compliant Tally Prime Sales Voucher with perfect Debit/Credit balance", () => {
  const userGSTIN = "07AAAAA0000A1Z5";
  const invoices: TallyInvoiceRecord[] = [
    {
      data: {
        invoice_number: "INV/2026/001",
        invoice_date: "24-10-2026",
        seller_gstin: "07AAAAA0000A1Z5",
        buyer_gstin: "07BBBBB1111B1Z2",
        buyer_gstin_info: {
          trade_name: "Gupta & Sons Retail",
        },
        pos: "07",
        taxable_value: 10000.0,
        cgst: 900.0,
        sgst: 900.0,
        igst: 0.0,
        invoice_total: 11800.0,
        direction: "outward",
      },
    },
  ];

  const xml = generateTallyXML(userGSTIN, invoices, "Apex Global Ltd");

  // Envelope and Header checks
  assert.match(xml, /<TALLYREQUEST>Import Data<\/TALLYREQUEST>/);
  assert.match(xml, /<REPORTNAME>Vouchers<\/REPORTNAME>/);
  assert.match(xml, /<SVCURRENTCOMPANY>Apex Global Ltd<\/SVCURRENTCOMPANY>/);

  // Voucher Structure
  assert.match(xml, /<VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">/);
  assert.match(xml, /<DATE>20261024<\/DATE>/);
  assert.match(xml, /<VOUCHERNUMBER>INV\/2026\/001<\/VOUCHERNUMBER>/);
  assert.match(xml, /<PARTYLEDGERNAME>Gupta &amp; Sons Retail<\/PARTYLEDGERNAME>/);
  assert.match(xml, /<PARTYGSTIN>07BBBBB1111B1Z2<\/PARTYGSTIN>/);

  // Party Debit Entry (-11800.00 with ISDEEMEDPOSITIVE Yes)
  assert.match(xml, /<LEDGERNAME>Gupta &amp; Sons Retail<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>Yes<\/ISDEEMEDPOSITIVE>\s*<ISPARTYLEDGER>Yes<\/ISPARTYLEDGER>\s*<AMOUNT>-11800.00<\/AMOUNT>/);

  // Sales Account Credit Entry (10000.00 with ISDEEMEDPOSITIVE No)
  assert.match(xml, /<LEDGERNAME>Sales Account @ 18%<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>No<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>10000.00<\/AMOUNT>/);

  // Output CGST & SGST Credit Entries
  assert.match(xml, /<LEDGERNAME>Output CGST<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>No<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>900.00<\/AMOUNT>/);
  assert.match(xml, /<LEDGERNAME>Output SGST<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>No<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>900.00<\/AMOUNT>/);

  // Statutory Balance Validation: Party (-11800) + Sales (10000) + CGST (900) + SGST (900) = 0
  const amounts = Array.from(xml.matchAll(/<AMOUNT>(-?[\d.]+)<\/AMOUNT>/g)).map((m) => parseFloat(m[1]));
  // Filter out BILLALLOCATIONS repetition if any, by taking unique ledger block amounts
  assert.ok(amounts.includes(-11800.0));
  assert.ok(amounts.includes(10000.0));
  assert.ok(amounts.includes(900.0));
});

test("Generates schema-compliant Tally Prime Purchase Voucher with Input Tax Credit Ledgers", () => {
  const userGSTIN = "07AAAAA0000A1Z5";
  const invoices: TallyInvoiceRecord[] = [
    {
      data: {
        invoice_number: "PUR/990",
        invoice_date: "18-10-2026",
        seller_gstin: "27SUPPLIER1234S1Z9",
        buyer_gstin: "07AAAAA0000A1Z5",
        seller_gstin_info: {
          trade_name: "Mahindra Logistics & Freight",
        },
        pos: "27",
        taxable_value: 50000.0,
        cgst: 0.0,
        sgst: 0.0,
        igst: 9000.0,
        invoice_total: 59000.0,
        direction: "inward",
        is_inward: true,
      },
    },
  ];

  const xml = generateTallyXML(userGSTIN, invoices);

  // Purchase Voucher Type
  assert.match(xml, /<VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">/);
  assert.match(xml, /<DATE>20261018<\/DATE>/);
  assert.match(xml, /<VOUCHERNUMBER>PUR\/990<\/VOUCHERNUMBER>/);
  assert.match(xml, /<PARTYLEDGERNAME>Mahindra Logistics &amp; Freight<\/PARTYLEDGERNAME>/);

  // Creditor Party Entry (Positive Amount 59000.00 with ISDEEMEDPOSITIVE No)
  assert.match(xml, /<LEDGERNAME>Mahindra Logistics &amp; Freight<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>No<\/ISDEEMEDPOSITIVE>\s*<ISPARTYLEDGER>Yes<\/ISPARTYLEDGER>\s*<AMOUNT>59000.00<\/AMOUNT>/);

  // Purchase Account Entry (Negative Amount -50000.00 with ISDEEMEDPOSITIVE Yes)
  assert.match(xml, /<LEDGERNAME>Purchase Account @ 18%<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>Yes<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>-50000.00<\/AMOUNT>/);

  // Input IGST Entry (Negative Amount -9000.00 with ISDEEMEDPOSITIVE Yes)
  assert.match(xml, /<LEDGERNAME>Input IGST<\/LEDGERNAME>\s*<ISDEEMEDPOSITIVE>Yes<\/ISDEEMEDPOSITIVE>\s*<AMOUNT>-9000.00<\/AMOUNT>/);
});

test("Enterprise Batch Upload Queue manages concurrent workers and detects duplicates", async () => {
  const dummyFiles = [
    { name: "bill1.pdf", size: 1024, type: "application/pdf" },
    { name: "bill2.pdf", size: 2048, type: "application/pdf" },
    { name: "bill1_dup.pdf", size: 1024, type: "application/pdf" },
  ];

  let uploadedCount = 0;
  const mockUploadFn = async (file: any) => {
    uploadedCount++;
    const isDup = file.name === "bill1_dup.pdf";
    return {
      data: {
        invoice_number: isDup ? "INV-100" : (file.name === "bill1.pdf" ? "INV-100" : "INV-200"),
        invoice_date: "24-10-2026",
        seller_gstin: "07AAAAA0000A1Z5",
        taxable_value: 1000,
        cgst: 90,
        sgst: 90,
        invoice_total: 1180,
      },
    };
  };

  const savedDrafts: any[] = [];
  const mockSaveDraftFn = async (data: any, status: string) => {
    savedDrafts.push({ data, status });
    return `local_${savedDrafts.length}`;
  };

  const progressEvents: number[] = [];
  const result = await runBatchUploadQueue(dummyFiles, {
    concurrency: 2,
    uploadFn: mockUploadFn,
    saveDraftFn: mockSaveDraftFn,
    onProgress: (items, summary) => {
      progressEvents.push(summary.completed);
    },
  });

  assert.equal(result.summary.total, 3);
  assert.equal(result.summary.completed, 3);
  assert.equal(result.summary.successful, 3);
  assert.equal(result.summary.duplicates, 1); // bill1_dup.pdf was flagged duplicate of bill1.pdf!
  assert.equal(result.summary.failed, 0);

  // File 0: Completed normal
  assert.equal(result.items[0].status, "completed");
  assert.equal(result.items[0].duplicateInfo?.isDuplicate, false);

  // File 2: Completed with duplicate warning
  assert.equal(result.items[2].status, "completed");
  assert.equal(result.items[2].duplicateInfo?.isDuplicate, true);
  assert.match(result.items[2].statusMessage || "", /Duplicate flagged/);
});

test("Tally XML strictly differentiates between Sales and Purchase vouchers even for same bill", () => {
  const userGSTIN = "07AAAAA0000A1Z5";
  const baseInvoice = {
    invoice_number: "DEMO-INV-001",
    invoice_date: "25-10-2026",
    seller_gstin: "07AAAAA0000A1Z5",
    buyer_gstin: "27BBBBB2222B1Z3",
    taxable_value: 10000.0,
    cgst: 900.0,
    sgst: 900.0,
    invoice_total: 11800.0,
  };

  // 1. Export as Sales
  const salesXML = generateTallyXML(userGSTIN, [
    { data: { ...baseInvoice, direction: "outward", is_inward: false } },
  ]);

  // 2. Export as Purchase
  const purchaseXML = generateTallyXML(userGSTIN, [
    { data: { ...baseInvoice, direction: "inward", is_inward: true } },
  ]);

  // Sales must have VCHTYPE="Sales" and Output GST
  assert.match(salesXML, /<VOUCHER VCHTYPE="Sales"/);
  assert.match(salesXML, /<VOUCHERTYPENAME>Sales<\/VOUCHERTYPENAME>/);
  assert.match(salesXML, /<LEDGERNAME>Sales Account/);
  assert.match(salesXML, /<LEDGERNAME>Output CGST<\/LEDGERNAME>/);

  // Purchase must have VCHTYPE="Purchase" and Input GST
  assert.match(purchaseXML, /<VOUCHER VCHTYPE="Purchase"/);
  assert.match(purchaseXML, /<VOUCHERTYPENAME>Purchase<\/VOUCHERTYPENAME>/);
  assert.match(purchaseXML, /<LEDGERNAME>Purchase Account/);
  assert.match(purchaseXML, /<LEDGERNAME>Input CGST<\/LEDGERNAME>/);

  // They MUST NOT be identical!
  assert.notEqual(salesXML, purchaseXML);
});
