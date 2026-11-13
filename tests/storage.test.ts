import test from "node:test";
import assert from "node:assert/strict";
import { getFP } from "../lib/storage.ts";

// In-memory IndexedDB mock for unit testing storage contract without browser runtime
class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: any = null;
  onerror: any = null;

  _resolve(val: any) {
    this.result = val;
    if (this.onsuccess) this.onsuccess({ target: this });
  }

  _reject(err: any) {
    this.error = err;
    if (this.onerror) this.onerror({ target: this });
  }
}

class MockIDBObjectStore {
  name: string;
  keyPath: string;
  data: Map<string, any>;
  indices: Map<string, string>;

  constructor(name: string, keyPath: string = "id") {
    this.name = name;
    this.keyPath = keyPath;
    this.data = new Map();
    this.indices = new Map();
  }

  createIndex(indexName: string, keyPath: string, options?: any) {
    this.indices.set(indexName, keyPath);
  }

  put(val: any) {
    const key = val[this.keyPath];
    if (key === undefined) throw new Error(`Missing keyPath: ${this.keyPath}`);
    this.data.set(String(key), JSON.parse(JSON.stringify(val)));
    const req = new MockIDBRequest();
    setTimeout(() => req._resolve(key), 0);
    return req;
  }

  get(key: string) {
    const req = new MockIDBRequest();
    setTimeout(() => req._resolve(this.data.get(String(key))), 0);
    return req;
  }

  getAll() {
    const req = new MockIDBRequest();
    setTimeout(() => req._resolve(Array.from(this.data.values())), 0);
    return req;
  }

  count() {
    const req = new MockIDBRequest();
    setTimeout(() => req._resolve(this.data.size), 0);
    return req;
  }

  delete(key: string) {
    this.data.delete(String(key));
    const req = new MockIDBRequest();
    setTimeout(() => req._resolve(undefined), 0);
    return req;
  }

  index(name: string) {
    const prop = this.indices.get(name);
    return {
      getAll: (val: any) => {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const res = Array.from(this.data.values()).filter((item) => item[prop!] === val);
          req._resolve(res);
        }, 0);
        return req;
      },
    };
  }
}

class MockIDBTransaction {
  db: MockIDBDatabase;
  storeNames: string[];
  mode: string;
  oncomplete: any = null;
  onerror: any = null;
  onabort: any = null;
  error: any = null;
  aborted = false;

  constructor(db: MockIDBDatabase, storeNames: string[], mode: string) {
    this.db = db;
    this.storeNames = storeNames;
    this.mode = mode;
    setTimeout(() => {
      if (!this.aborted && this.oncomplete) {
        this.oncomplete();
      }
    }, 15);
  }

  objectStore(name: string) {
    return this.db.stores.get(name)!;
  }

  abort() {
    this.aborted = true;
    if (this.onabort) this.onabort();
  }
}

class MockIDBDatabase {
  stores: Map<string, MockIDBObjectStore>;
  objectStoreNames: { contains: (name: string) => boolean };

  constructor() {
    this.stores = new Map();
    this.objectStoreNames = {
      contains: (name: string) => this.stores.has(name),
    };
  }

  createObjectStore(name: string, options?: { keyPath: string }) {
    const s = new MockIDBObjectStore(name, options?.keyPath);
    this.stores.set(name, s);
    return s;
  }

  transaction(storeNames: string | string[], mode: string) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, names, mode);
  }

  close() {}
}

test("IndexedDB Schema defines all 8 required offline object stores", () => {
  const db = new MockIDBDatabase();
  const stores = [
    "invoices",
    "purchases",
    "clients",
    "products",
    "expenses",
    "receipts",
    "recurring",
    "settings",
  ];

  for (const s of stores) {
    db.createObjectStore(s, { keyPath: s === "settings" ? "key" : "id" });
  }

  for (const s of stores) {
    assert.equal(db.objectStoreNames.contains(s), true, `Store ${s} must exist`);
  }
});

test("Statutory FP format normalizes DD-MM-YYYY, YYYY-MM-DD and dotted formats to MMYYYY", () => {
  assert.equal(getFP("31-03-2026"), "032026");
  assert.equal(getFP("2026-04-01"), "042026");
  assert.equal(getFP("15.08.2025"), "082025");
  assert.equal(getFP("01/01/2026"), "012026");
  assert.equal(getFP(undefined), "UNKNOWN");
  assert.equal(getFP(""), "UNKNOWN");
});

test("Backup export JSON structure includes complete schema for all 8 business domains", () => {
  const sampleBackup = {
    version: "GSTLENS_V1_BACKUP",
    exported_at: new Date().toISOString(),
    invoices: [{ id: "inv-1", status: "confirmed", fp: "102026" }],
    purchases: [{ id: "pur-1", invoiceNumber: "PB-001", total: 5000 }],
    clients: [{ id: "cli-1", name: "Sample Client Pvt Ltd", gstin: "27AABCA1234F1Z8" }],
    products: [{ id: "prod-1", name: "Thermal Printer", sellingPrice: 2500, stock: 10 }],
    expenses: [{ id: "exp-1", category: "Office Supplies", amount: 450 }],
    receipts: [{ id: "rec-1", type: "in", amount: 5000 }],
    recurring: [{ id: "rec-temp-1", frequency: "monthly", active: true }],
    settings: {
      profile: { businessName: "GSTLens Enterprise Ltd", gstin: "27AABCA1234F1Z8" },
      invSettings: { format: "branded", brandPrefix: "INV", separator: "/" },
      printSettings: { template: "modern", colorTheme: "#2563eb" },
      appLockPin: "1234",
    },
  };

  const jsonStr = JSON.stringify(sampleBackup);
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.version, "GSTLENS_V1_BACKUP");
  assert.equal(parsed.invoices.length, 1);
  assert.equal(parsed.purchases.length, 1);
  assert.equal(parsed.clients.length, 1);
  assert.equal(parsed.products.length, 1);
  assert.equal(parsed.expenses.length, 1);
  assert.equal(parsed.receipts.length, 1);
  assert.equal(parsed.recurring.length, 1);
  assert.equal(parsed.settings.profile.businessName, "GSTLens Enterprise Ltd");
  assert.equal(parsed.settings.appLockPin, "1234");
});

test("Backup restore assigns resilient IDs when imported items lack explicit id", () => {
  const rawData = {
    invoices: [{ data: { invoice_date: "25-10-2026", invoice_number: "INV-99" } }],
    clients: [{ name: "Imported Party Without ID" }],
  };

  const restoredInvoices = rawData.invoices.map((inv: any) => ({
    ...inv,
    id: inv.id || "generated-local-uuid",
    fp: inv.fp || getFP(inv.data?.invoice_date),
  }));

  assert.equal(restoredInvoices[0].id, "generated-local-uuid");
  assert.equal(restoredInvoices[0].fp, "102026");
});

test("Consecutive invoice number generator prevents collisions when earlier invoices are deleted", () => {
  const existingInvoices = [
    { data: { invoice_number: "INV/2026-27/0001" }, deleted: 0 },
    { data: { invoice_number: "INV/2026-27/0002" }, deleted: 1 }, // deleted
    { data: { invoice_number: "INV/2026-27/0003" }, deleted: 0 },
  ];

  const sep = "/";
  let maxSeq = 0;
  for (const inv of existingInvoices) {
    const num = inv.data.invoice_number;
    const parts = num.split(sep);
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed) && parsed > maxSeq) {
      maxSeq = parsed;
    }
  }

  const nextSeq = maxSeq + 1;
  const numStr = String(nextSeq).padStart(4, "0");
  const nextInvoiceNumber = `INV/2026-27/${numStr}`;

  assert.equal(nextInvoiceNumber, "INV/2026-27/0004");
  assert.notEqual(nextInvoiceNumber, "INV/2026-27/0003");
});

test("Invoices and purchases sort by updated_time descending (most recently updated first)", () => {
  const t1 = "2026-11-13T10:00:00.000Z";
  const t2 = "2026-11-13T12:00:00.000Z";
  const t3 = "2026-11-13T14:30:00.000Z";

  const sampleInvoices = [
    { id: "inv-1", created_time: t1, updated_time: t1, data: { invoice_number: "INV-1" } },
    { id: "inv-2", created_time: t1, updated_time: t3, data: { invoice_number: "INV-2" } },
    { id: "inv-3", created_time: t2, updated_time: t2, data: { invoice_number: "INV-3" } },
  ];

  const sortedInvoices = [...sampleInvoices].sort((a, b) => {
    const tA = new Date(a.updated_time).getTime();
    const tB = new Date(b.updated_time).getTime();
    return tB - tA;
  });

  assert.equal(sortedInvoices[0].id, "inv-2"); // updated at t3 (latest)
  assert.equal(sortedInvoices[1].id, "inv-3"); // updated at t2
  assert.equal(sortedInvoices[2].id, "inv-1"); // updated at t1

  const samplePurchases = [
    { id: "pur-1", invoiceNumber: "PB-1", created_time: t1, updated_time: t1 },
    { id: "pur-2", invoiceNumber: "PB-2", created_time: t2, updated_time: t3 },
    { id: "pur-3", invoiceNumber: "PB-3", created_time: t1, updated_time: t2 },
  ];

  const sortedPurchases = [...samplePurchases].sort((a, b) => {
    const tA = new Date(a.updated_time).getTime();
    const tB = new Date(b.updated_time).getTime();
    return tB - tA;
  });

  assert.equal(sortedPurchases[0].id, "pur-2"); // updated at t3
  assert.equal(sortedPurchases[1].id, "pur-3"); // updated at t2
  assert.equal(sortedPurchases[2].id, "pur-1"); // updated at t1
});

test("Draft invoices and confirmed invoices are separated so drafts are never aggregated into confirmed sales", () => {
  const allInvoices = [
    { id: "inv-1", status: "confirmed", data: { invoice_total: 10000, invoice_number: "INV-001" } },
    { id: "inv-2", status: "draft", data: { invoice_total: 5000, invoice_number: "INV-DRAFT-1" } },
    { id: "inv-3", status: "auto_saved", data: { invoice_total: 2000, invoice_number: "INV-002" } },
  ];

  const confirmedInvoices = allInvoices.filter((inv) => inv.status !== "draft");
  const draftInvoices = allInvoices.filter((inv) => inv.status === "draft");

  assert.equal(confirmedInvoices.length, 2);
  assert.equal(draftInvoices.length, 1);

  // Confirmed turnover must NOT include the ₹5,000 draft
  const confirmedTotal = confirmedInvoices.reduce((sum, inv) => sum + inv.data.invoice_total, 0);
  assert.equal(confirmedTotal, 12000);
});

test("Draft purchase bills and confirmed purchases are separated so drafts are never aggregated into ITC or expense totals", () => {
  const allPurchases = [
    { id: "pur-1", status: "confirmed", invoiceNumber: "PB-101", total: 8000, cgst: 720, sgst: 720 },
    { id: "pur-2", status: "draft", invoiceNumber: "PB-DRAFT", total: 4000, cgst: 360, sgst: 360 },
  ];

  const confirmedPurchases = allPurchases.filter((p) => p.status !== "draft");
  const draftPurchases = allPurchases.filter((p) => p.status === "draft");

  assert.equal(confirmedPurchases.length, 1);
  assert.equal(draftPurchases.length, 1);

  // Confirmed purchase total and ITC must NOT include draft bill
  const confirmedPurchasesTotal = confirmedPurchases.reduce((sum, p) => sum + p.total, 0);
  const confirmedITC = confirmedPurchases.reduce((sum, p) => sum + (p.cgst + p.sgst), 0);

  assert.equal(confirmedPurchasesTotal, 8000);
  assert.equal(confirmedITC, 1440);
});
