import { v4 as uuid } from "uuid";
import type { DocumentType, LineItem } from "./gstBillingEngine.ts";
import { getFinancialYear } from "./gstBillingEngine.ts";

export type StoredInvoice = {
  id: string;
  status: "draft" | "confirmed" | "auto_saved";
  fp: string; // MMYYYY
  data: any; // Canonical invoice JSON or full invoice schema
  created_at: number;
  updated_at: number;
  synced_to_cloud: 0 | 1;
  deleted: 0 | 1;
  cloud_id: string;
};

export interface Client {
  id: string;
  name: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  type?: 'customer' | 'vendor' | 'both';
  isSEZ?: boolean;
  creditLimit?: number;
  openingBalance?: number;
  created_at: number;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  hsn?: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxPercent: number;
  cessPercent?: number;
  stock: number;
  minStockAlert?: number;
  description?: string;
  isService?: boolean;
  created_at: number;
}

export interface PurchaseItem {
  name: string;
  hsn?: string;
  quantity: number;
  unit?: string;
  rate: number;
  taxPercent: number;
  cessPercent?: number;
}

export interface PurchaseBill {
  id: string;
  invoiceNumber: string;
  date: string;
  supplierName: string;
  supplierGstin?: string;
  supplierAddress?: string;
  items: PurchaseItem[];
  interstate: boolean;
  itcEligibility: 'eligible' | 'ineligible' | 'rcm' | 'capital_goods';
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
  note?: string;
  created_at: number;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  itrHead: 'business' | 'salary' | 'depreciation' | 'notDeductible';
  amount: number;
  gstAmount: number;
  gstPercent?: number;
  interstate?: boolean;
  vendorName?: string;
  vendorGstin?: string;
  invoiceNo?: string;
  paymentMode: string;
  note?: string;
  created_at: number;
}

export interface ReceiptRecord {
  id: string;
  date: string;
  receiptNo: string;
  type: 'in' | 'out'; // 'in' = payment received, 'out' = payment made
  partyName: string;
  partyGstin?: string;
  partyAddress?: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  againstInvoice?: string;
  note?: string;
  created_at: number;
}

export interface RecurringTemplate {
  id: string;
  clientName: string;
  clientGstin?: string;
  clientAddress?: string;
  clientState?: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval: number;
  invoiceType: DocumentType;
  items: LineItem[];
  nextDate: string;
  active: boolean;
  note?: string;
  created_at: number;
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  tradeName?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  accountHolderName?: string;
  upiId?: string;
  logoUrl?: string;
  signatureUrl?: string;
  isDefault?: boolean;
}

export interface InvoiceNumberSettings {
  format: 'branded' | 'sequential' | 'random';
  brandPrefix: string;
  separator: '/' | '-' | '#';
  showFinYear: boolean;
  startNumber: number;
  padDigits: number;
}

export interface PrintSettings {
  template: 'modern' | 'classic' | 'minimalist' | 'compact' | 'thermal';
  colorTheme: string;
  showHSN: boolean;
  showLogo: boolean;
  showBankDetails: boolean;
  showUPI: boolean;
  showSignature: boolean;
  showTerms: boolean;
  declarationText: string;
  footerNote: string;
}

const DB_NAME = "gstlens-db";
const DB_VERSION = 3;
const STORE_NAME = "invoices";
const STORE_PURCHASES = "purchases";
const STORE_CLIENTS = "clients";
const STORE_PRODUCTS = "products";
const STORE_EXPENSES = "expenses";
const STORE_RECEIPTS = "receipts";
const STORE_RECURRING = "recurring";
const STORE_SETTINGS = "settings";

/* ----------------------------- */
/* Open / Init DB (Cached Pool)  */
/* ----------------------------- */

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;
const SEEDED_KEY = "starter_data_seeded_v1";

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  if (dbOpenPromise) {
    return dbOpenPromise;
  }

  dbOpenPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("fp", "fp", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }

      if (oldVersion < 2) {
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const store = tx.objectStore(STORE_NAME);
        if (!store.indexNames.contains("synced_to_cloud")) {
          store.createIndex("synced_to_cloud", "synced_to_cloud", { unique: false });
        }
        if (!store.indexNames.contains("updated_at")) {
          store.createIndex("updated_at", "updated_at", { unique: false });
        }
        if (!store.indexNames.contains("deleted")) {
          store.createIndex("deleted", "deleted", { unique: false });
        }
      }

      if (oldVersion < 3) {
        // Create new stores for billing, clients, products, purchases, expenses, receipts, recurring, settings
        if (!db.objectStoreNames.contains(STORE_PURCHASES)) {
          const s = db.createObjectStore(STORE_PURCHASES, { keyPath: "id" });
          s.createIndex("date", "date", { unique: false });
          s.createIndex("supplierGstin", "supplierGstin", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_CLIENTS)) {
          const s = db.createObjectStore(STORE_CLIENTS, { keyPath: "id" });
          s.createIndex("name", "name", { unique: false });
          s.createIndex("gstin", "gstin", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
          const s = db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
          s.createIndex("name", "name", { unique: false });
          s.createIndex("hsn", "hsn", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
          const s = db.createObjectStore(STORE_EXPENSES, { keyPath: "id" });
          s.createIndex("date", "date", { unique: false });
          s.createIndex("category", "category", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_RECEIPTS)) {
          const s = db.createObjectStore(STORE_RECEIPTS, { keyPath: "id" });
          s.createIndex("date", "date", { unique: false });
          s.createIndex("receiptNo", "receiptNo", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_RECURRING)) {
          const s = db.createObjectStore(STORE_RECURRING, { keyPath: "id" });
          s.createIndex("nextDate", "nextDate", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
        }
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      dbInstance = db;

      db.onversionchange = () => {
        db.close();
        dbInstance = null;
        dbOpenPromise = null;
      };

      db.onclose = () => {
        dbInstance = null;
        dbOpenPromise = null;
      };

      seedStarterDataIfEmpty(db)
        .catch(() => {})
        .finally(() => resolve(db));
    };

    request.onerror = () => {
      dbOpenPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn("[IndexedDB] Database connection blocked by another active window.");
    };
  });

  return dbOpenPromise;
}

/* ---------------- Seed Starter Data ---------------- */

async function seedStarterDataIfEmpty(db: IDBDatabase) {
  try {
    // 1. Check persistent setting flag to avoid re-running counts on every single DB load
    const checkTx = db.transaction([STORE_SETTINGS, STORE_CLIENTS, STORE_PRODUCTS], "readonly");
    const settingsStore = checkTx.objectStore(STORE_SETTINGS);
    const clientStore = checkTx.objectStore(STORE_CLIENTS);
    const productStore = checkTx.objectStore(STORE_PRODUCTS);

    const isSeededReq = settingsStore.get(SEEDED_KEY);
    const clientCountReq = clientStore.count();
    const productCountReq = productStore.count();

    const [isSeeded, clientCount, productCount] = await new Promise<[any, number, number]>((res) => {
      checkTx.oncomplete = () => {
        res([isSeededReq.result?.value, clientCountReq.result ?? 0, productCountReq.result ?? 0]);
      };
      checkTx.onerror = () => res([true, 1, 1]);
      checkTx.onabort = () => res([true, 1, 1]);
    });

    if (isSeeded) return;

    // 2. Perform idempotent seeding with deterministic IDs to eliminate concurrent race duplicates
    const wTx = db.transaction([STORE_CLIENTS, STORE_PRODUCTS, STORE_SETTINGS], "readwrite");
    const wClientStore = wTx.objectStore(STORE_CLIENTS);
    const wProductStore = wTx.objectStore(STORE_PRODUCTS);
    const wSettingsStore = wTx.objectStore(STORE_SETTINGS);

    if (clientCount === 0) {
      const sampleClients: Client[] = [
        {
          id: "seed-client-apex",
          name: "Apex Enterprises Pvt Ltd",
          tradeName: "Apex Retail",
          gstin: "27AABCA1234F1Z8",
          pan: "AABCA1234F",
          phone: "+91 98200 12345",
          email: "billing@apexenterprises.in",
          address: "Unit 402, Trade Center, BKC",
          city: "Mumbai",
          state: "Maharashtra",
          stateCode: "27",
          pincode: "400051",
          type: "both",
          isSEZ: false,
          creditLimit: 200000,
          openingBalance: 0,
          created_at: Date.now(),
        },
        {
          id: "seed-client-globaltech",
          name: "Global Tech Solutions",
          tradeName: "Global Tech",
          gstin: "07AAACG9876E1ZH",
          pan: "AAACG9876E",
          phone: "+91 98110 54321",
          email: "accounts@globaltech.com",
          address: "Plot 12, Okhla Phase 3",
          city: "New Delhi",
          state: "Delhi",
          stateCode: "07",
          pincode: "110020",
          type: "customer",
          isSEZ: false,
          creditLimit: 500000,
          openingBalance: 15400,
          created_at: Date.now(),
        },
      ];
      sampleClients.forEach((c) => wClientStore.put(c));
    }

    if (productCount === 0) {
      const sampleProducts: Product[] = [
        {
          id: "seed-prod-dell-4k",
          name: "Dell UltraSharp 27 4K Monitor",
          sku: "MON-U2723QE",
          hsn: "84716060",
          unit: "Pcs",
          purchasePrice: 42000,
          sellingPrice: 51999,
          taxPercent: 18,
          stock: 14,
          minStockAlert: 3,
          description: "Dell 27-inch 4K IPS Black USB-C Hub Monitor",
          isService: false,
          created_at: Date.now(),
        },
        {
          id: "seed-prod-logi-mx3s",
          name: "Logitech MX Master 3S Wireless Mouse",
          sku: "MOU-MX3S",
          hsn: "84716070",
          unit: "Pcs",
          purchasePrice: 6500,
          sellingPrice: 8995,
          taxPercent: 18,
          stock: 4,
          minStockAlert: 5,
          description: "Ergonomic quiet performance mouse with 8K DPI sensor",
          isService: false,
          created_at: Date.now(),
        },
        {
          id: "seed-prod-consulting",
          name: "Software Consulting & Cloud Migration",
          sku: "SRV-CLOUD-MIG",
          hsn: "998313",
          unit: "Hrs",
          purchasePrice: 0,
          sellingPrice: 3500,
          taxPercent: 18,
          stock: 999,
          minStockAlert: 0,
          description: "Expert AWS / GCP Architecture and Migration Consulting",
          isService: true,
          created_at: Date.now(),
        },
      ];
      sampleProducts.forEach((p) => wProductStore.put(p));
    }

    wSettingsStore.put({ key: SEEDED_KEY, value: true });
  } catch {
    // Ignore seeding error
  }
}

/* ---------------- Invoices (Core) ---------------- */

export async function getInvoiceById(
  id: string
): Promise<StoredInvoice | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveInvoiceDraft(
  invoiceData: any,
  status: "draft" | "confirmed" | "auto_saved"
): Promise<string> {
  const db = await openDB();
  const fp = getFP(invoiceData.invoice_date);

  if (invoiceData._local_id) {
    const existing = await getInvoiceById(invoiceData._local_id);
    if (existing?.deleted === 1) {
      throw new Error("Cannot save a deleted invoice");
    }
  }

  const id = invoiceData._local_id ?? uuid();

  const record: StoredInvoice = {
    id,
    status,
    fp,
    data: {
      ...invoiceData,
      fp,
      _local_id: id,
    },
    created_at: invoiceData.created_at ?? Date.now(),
    updated_at: Date.now(),
    synced_to_cloud: 0,
    deleted: 0,
    cloud_id: "",
  };

  return new Promise<string>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);

    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function upsertInvoice(invoice: StoredInvoice) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(invoice);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateInvoice(
  id: string,
  updates: Partial<
    Pick<
      StoredInvoice,
      "data" | "status" | "synced_to_cloud" | "cloud_id" | "deleted"
    >
  >
) {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const existing = getReq.result as StoredInvoice | undefined;
      if (!existing) {
        reject(new Error("Invoice not found"));
        return;
      }

      if (
        existing.deleted === 1 &&
        updates.deleted !== 0 &&
        (updates.data || updates.status)
      ) {
        reject(new Error("Cannot modify data/status of a deleted invoice"));
        return;
      }

      const mergedData = updates.data
        ? { ...existing.data, ...updates.data }
        : existing.data;

      const newFP = mergedData?.invoice_date
        ? getFP(mergedData.invoice_date)
        : existing.fp;

      if (mergedData) {
        mergedData.fp = newFP;
      }

      const updated: StoredInvoice = {
        ...existing,
        ...updates,
        fp: newFP,
        data: mergedData,
        updated_at: Date.now(),
        deleted:
          updates.deleted !== undefined
            ? updates.deleted
            : existing.deleted !== undefined
            ? existing.deleted
            : 0,
        synced_to_cloud:
          updates.synced_to_cloud !== undefined
            ? updates.synced_to_cloud
            : updates.data
            ? 0
            : existing.synced_to_cloud,
      };

      store.put(updated);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllInvoices(): Promise<StoredInvoice[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () =>
      resolve(req.result.filter((inv) => inv.deleted !== 1));
    req.onerror = () => reject(req.error);
  });
}

export async function getUnsyncedInvoices(): Promise<StoredInvoice[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("synced_to_cloud");
    const req = index.getAll(0);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function markAsSynced(localId: string, cloudId: string) {
  return updateInvoice(localId, {
    synced_to_cloud: 1,
    cloud_id: cloudId,
  });
}

export async function getInvoicesForGSTR1(
  fp: string
): Promise<StoredInvoice[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("fp");
    const req = index.getAll(fp);
    req.onsuccess = () => {
      const valid = req.result.filter(
        (inv) =>
          inv.deleted !== 1 &&
          (inv.status === "confirmed" || inv.status === "auto_saved")
      );
      resolve(valid);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteInvoice(id: string) {
  return updateInvoice(id, {
    deleted: 1,
    synced_to_cloud: 0,
  });
}

/* ---------------- Clients ---------------- */

export async function getAllClients(): Promise<Client[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIENTS, "readonly");
    const req = tx.objectStore(STORE_CLIENTS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveClient(client: Client): Promise<string> {
  const db = await openDB();
  const id = client.id || uuid();
  const toSave = { ...client, id, created_at: client.created_at || Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIENTS, "readwrite");
    tx.objectStore(STORE_CLIENTS).put(toSave);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteClient(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CLIENTS, "readwrite");
    tx.objectStore(STORE_CLIENTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------- Products / Inventory ---------------- */

export async function getAllProducts(): Promise<Product[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTS, "readonly");
    const req = tx.objectStore(STORE_PRODUCTS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProduct(product: Product): Promise<string> {
  const db = await openDB();
  const id = product.id || uuid();
  const toSave = { ...product, id, created_at: product.created_at || Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTS, "readwrite");
    tx.objectStore(STORE_PRODUCTS).put(toSave);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteProduct(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTS, "readwrite");
    tx.objectStore(STORE_PRODUCTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function adjustProductStock(productId: string, quantityDelta: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTS, "readwrite");
    const store = tx.objectStore(STORE_PRODUCTS);
    const getReq = store.get(productId);
    getReq.onsuccess = () => {
      const p = getReq.result as Product | undefined;
      if (p) {
        p.stock = Math.max(0, (Number(p.stock) || 0) + quantityDelta);
        store.put(p);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------- Purchase Bills ---------------- */

export async function getAllPurchases(): Promise<PurchaseBill[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PURCHASES, "readonly");
    const req = tx.objectStore(STORE_PURCHASES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function savePurchase(purchase: PurchaseBill): Promise<string> {
  const db = await openDB();
  const id = purchase.id || uuid();
  const toSave = { ...purchase, id, created_at: purchase.created_at || Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PURCHASES, "readwrite");
    tx.objectStore(STORE_PURCHASES).put(toSave);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePurchase(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PURCHASES, "readwrite");
    tx.objectStore(STORE_PURCHASES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------- Expenses ---------------- */

export async function getAllExpenses(): Promise<Expense[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EXPENSES, "readonly");
    const req = tx.objectStore(STORE_EXPENSES).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveExpense(expense: Expense): Promise<string> {
  const db = await openDB();
  const id = expense.id || uuid();
  const toSave = { ...expense, id, created_at: expense.created_at || Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EXPENSES, "readwrite");
    tx.objectStore(STORE_EXPENSES).put(toSave);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_EXPENSES, "readwrite");
    tx.objectStore(STORE_EXPENSES).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------- Receipts & Payments ---------------- */

export async function getAllReceipts(): Promise<ReceiptRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECEIPTS, "readonly");
    const req = tx.objectStore(STORE_RECEIPTS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveReceipt(receipt: ReceiptRecord): Promise<string> {
  const db = await openDB();
  const id = receipt.id || uuid();
  const toSave = { ...receipt, id, created_at: receipt.created_at || Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECEIPTS, "readwrite");
    tx.objectStore(STORE_RECEIPTS).put(toSave);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteReceipt(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECEIPTS, "readwrite");
    tx.objectStore(STORE_RECEIPTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------- Recurring Invoices ---------------- */

export async function getAllRecurring(): Promise<RecurringTemplate[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECURRING, "readonly");
    const req = tx.objectStore(STORE_RECURRING).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecurring(template: RecurringTemplate): Promise<string> {
  const db = await openDB();
  const id = template.id || uuid();
  const toSave = { ...template, id, created_at: template.created_at || Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECURRING, "readwrite");
    tx.objectStore(STORE_RECURRING).put(toSave);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteRecurring(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECURRING, "readwrite");
    tx.objectStore(STORE_RECURRING).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------- Settings & Business Profiles ---------------- */

const DEFAULT_PROFILE: BusinessProfile = {
  id: "default",
  businessName: "GSTLens Enterprise Ltd",
  tradeName: "GSTLens Solutions",
  gstin: "27AABCA1234F1Z8",
  pan: "AABCA1234F",
  phone: "+91 98765 43210",
  email: "support@gstlens.in",
  address: "Tower B, Level 5, Cyber City",
  city: "Mumbai",
  state: "Maharashtra",
  stateCode: "27",
  pincode: "400051",
  bankName: "HDFC Bank",
  accountHolderName: "GSTLens Enterprise Ltd",
  accountNumber: "50200012345678",
  ifsc: "HDFC0000123",
  branch: "BKC Branch",
  upiId: "gstlens@hdfcbank",
  isDefault: true,
};

const DEFAULT_INV_SETTINGS: InvoiceNumberSettings = {
  format: "branded",
  brandPrefix: "INV",
  separator: "/",
  showFinYear: true,
  startNumber: 1,
  padDigits: 4,
};

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  template: "modern",
  colorTheme: "#2563eb",
  showHSN: true,
  showLogo: true,
  showBankDetails: true,
  showUPI: true,
  showSignature: true,
  showTerms: true,
  declarationText: "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.",
  footerNote: "Thank you for your business! For queries, contact support@gstlens.in",
};

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const req = tx.objectStore(STORE_SETTINGS).get("business_profile");
    req.onsuccess = () => resolve(req.result?.value || DEFAULT_PROFILE);
    req.onerror = () => resolve(DEFAULT_PROFILE);
  });
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key: "business_profile", value: profile });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getInvoiceNumberSettings(): Promise<InvoiceNumberSettings> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const req = tx.objectStore(STORE_SETTINGS).get("invoice_number_settings");
    req.onsuccess = () => resolve(req.result?.value || DEFAULT_INV_SETTINGS);
    req.onerror = () => resolve(DEFAULT_INV_SETTINGS);
  });
}

export async function saveInvoiceNumberSettings(settings: InvoiceNumberSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key: "invoice_number_settings", value: settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getNextDocumentNumber(docTypePrefix: string = "INV"): Promise<string> {
  const settings = await getInvoiceNumberSettings();
  const db = await openDB();

  // Read all records (including deleted) to prevent sequence collisions if prior bills were deleted
  const allInvoices = await new Promise<StoredInvoice[]>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
    tx.onabort = () => resolve([]);
  });

  const prefix = settings.brandPrefix || docTypePrefix;
  const sep = settings.separator || "/";
  const fy = settings.showFinYear ? getFinancialYear() : null;

  // Find the highest sequence number in existing invoice numbers to uphold Rule 46(b)
  let maxSeq = settings.startNumber - 1;
  for (const inv of allInvoices) {
    const invoiceNum = inv.data?.invoice_number || inv.data?.invoiceNumber;
    if (typeof invoiceNum === "string") {
      const parts = invoiceNum.split(sep);
      const lastPart = parts[parts.length - 1];
      const parsed = parseInt(lastPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const nextSeq = Math.max(maxSeq + 1, settings.startNumber + allInvoices.length);
  const numStr = String(nextSeq).padStart(settings.padDigits, "0");

  if (fy) {
    return `${prefix}${sep}${fy}${sep}${numStr}`;
  }
  return `${prefix}${sep}${numStr}`;
}

export async function getPrintSettings(): Promise<PrintSettings> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const req = tx.objectStore(STORE_SETTINGS).get("print_settings");
    req.onsuccess = () => resolve(req.result?.value || DEFAULT_PRINT_SETTINGS);
    req.onerror = () => resolve(DEFAULT_PRINT_SETTINGS);
    tx.onabort = () => resolve(DEFAULT_PRINT_SETTINGS);
  });
}

export async function savePrintSettings(settings: PrintSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key: "print_settings", value: settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

/* ---------------- App Lock PIN ---------------- */

export async function getAppLockPin(): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_SETTINGS, "readonly");
    const req = tx.objectStore(STORE_SETTINGS).get("app_lock_pin");
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = () => resolve(null);
    tx.onabort = () => resolve(null);
  });
}

export async function setAppLockPin(pin: string | null): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, "readwrite");
    tx.objectStore(STORE_SETTINGS).put({ key: "app_lock_pin", value: pin });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transaction aborted"));
  });
}

/* ---------------- Granular Backup & Restore ---------------- */

export async function exportAllDataAsBackup(): Promise<string> {
  const [
    invoices,
    purchases,
    clients,
    products,
    expenses,
    receipts,
    recurring,
    profile,
    invSettings,
    printSettings,
    appLockPin,
  ] = await Promise.all([
    getAllInvoices(),
    getAllPurchases(),
    getAllClients(),
    getAllProducts(),
    getAllExpenses(),
    getAllReceipts(),
    getAllRecurring(),
    getBusinessProfile(),
    getInvoiceNumberSettings(),
    getPrintSettings(),
    getAppLockPin(),
  ]);

  const backup = {
    version: "GSTLENS_V1_BACKUP",
    exported_at: new Date().toISOString(),
    invoices,
    purchases,
    clients,
    products,
    expenses,
    receipts,
    recurring,
    settings: {
      profile,
      invSettings,
      printSettings,
      appLockPin,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function importBackupData(jsonString: string): Promise<{ success: boolean; count: number }> {
  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch (err: any) {
    throw new Error(`Invalid backup JSON: ${err.message}`);
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid backup format: root must be a JSON object");
  }

  const db = await openDB();

  return new Promise<{ success: boolean; count: number }>((resolve, reject) => {
    const tx = db.transaction(
      [
        STORE_NAME,
        STORE_PURCHASES,
        STORE_CLIENTS,
        STORE_PRODUCTS,
        STORE_EXPENSES,
        STORE_RECEIPTS,
        STORE_RECURRING,
        STORE_SETTINGS,
      ],
      "readwrite"
    );

    let count = 0;

    tx.onabort = () => reject(tx.error || new Error("Restore transaction aborted"));
    tx.onerror = () => reject(tx.error || new Error("Restore transaction failed"));
    tx.oncomplete = () => resolve({ success: true, count });

    try {
      // 1. Invoices
      const invStore = tx.objectStore(STORE_NAME);
      if (Array.isArray(data.invoices)) {
        for (const inv of data.invoices) {
          if (!inv || typeof inv !== "object") continue;
          const id = inv.id || inv._local_id || uuid();
          const fp = inv.fp || getFP(inv.data?.invoice_date);
          invStore.put({
            ...inv,
            id,
            fp,
            status: inv.status || "confirmed",
            data: inv.data || {},
            created_at: inv.created_at || Date.now(),
            updated_at: inv.updated_at || Date.now(),
            synced_to_cloud: inv.synced_to_cloud ?? 0,
            deleted: inv.deleted ?? 0,
            cloud_id: inv.cloud_id || "",
          });
          count++;
        }
      }

      // 2. Purchases
      const purStore = tx.objectStore(STORE_PURCHASES);
      if (Array.isArray(data.purchases)) {
        for (const p of data.purchases) {
          if (!p || typeof p !== "object") continue;
          const id = p.id || uuid();
          purStore.put({ ...p, id, created_at: p.created_at || Date.now() });
          count++;
        }
      }

      // 3. Clients
      const clientStore = tx.objectStore(STORE_CLIENTS);
      if (Array.isArray(data.clients)) {
        for (const c of data.clients) {
          if (!c || typeof c !== "object") continue;
          const id = c.id || uuid();
          clientStore.put({ ...c, id, created_at: c.created_at || Date.now() });
          count++;
        }
      }

      // 4. Products / Inventory
      const prodStore = tx.objectStore(STORE_PRODUCTS);
      if (Array.isArray(data.products)) {
        for (const prod of data.products) {
          if (!prod || typeof prod !== "object") continue;
          const id = prod.id || uuid();
          prodStore.put({ ...prod, id, created_at: prod.created_at || Date.now() });
          count++;
        }
      }

      // 5. Expenses
      const expStore = tx.objectStore(STORE_EXPENSES);
      if (Array.isArray(data.expenses)) {
        for (const e of data.expenses) {
          if (!e || typeof e !== "object") continue;
          const id = e.id || uuid();
          expStore.put({ ...e, id, created_at: e.created_at || Date.now() });
          count++;
        }
      }

      // 6. Receipts & Payments
      const recStore = tx.objectStore(STORE_RECEIPTS);
      if (Array.isArray(data.receipts)) {
        for (const r of data.receipts) {
          if (!r || typeof r !== "object") continue;
          const id = r.id || uuid();
          recStore.put({ ...r, id, created_at: r.created_at || Date.now() });
          count++;
        }
      }

      // 7. Recurring Templates
      const recurStore = tx.objectStore(STORE_RECURRING);
      if (Array.isArray(data.recurring)) {
        for (const rec of data.recurring) {
          if (!rec || typeof rec !== "object") continue;
          const id = rec.id || uuid();
          recurStore.put({ ...rec, id, created_at: rec.created_at || Date.now() });
          count++;
        }
      }

      // 8. Settings & Profile
      const setStore = tx.objectStore(STORE_SETTINGS);
      if (data.settings?.profile) {
        setStore.put({ key: "business_profile", value: data.settings.profile });
      }
      if (data.settings?.invSettings) {
        setStore.put({ key: "invoice_number_settings", value: data.settings.invSettings });
      }
      if (data.settings?.printSettings) {
        setStore.put({ key: "print_settings", value: data.settings.printSettings });
      }
      if (data.settings?.appLockPin !== undefined) {
        setStore.put({ key: "app_lock_pin", value: data.settings.appLockPin });
      }
    } catch (err) {
      tx.abort();
      reject(err);
    }
  });
}

/* ---------------- Statutory FP Normalizer ---------------- */

export function getFP(invoiceDate?: string): string {
  if (!invoiceDate || typeof invoiceDate !== "string") {
    return "UNKNOWN";
  }

  const cleaned = invoiceDate.replace(/[./]/g, "-");
  const parts = cleaned.split("-");

  let day: string | undefined;
  let month: string | undefined;
  let year: string | undefined;

  if (parts[0]?.length === 4) {
    year = parts[0];
    month = parts[1];
  } else if (parts.length >= 3) {
    day = parts[0];
    month = parts[1];
    year = parts[2];
  }

  if (!month || !year) {
    return "UNKNOWN";
  }

  if (year.length === 2) {
    year = "20" + year;
  }

  const monthMap: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  const m = month.toLowerCase().slice(0, 3);
  let mm = monthMap[m];

  if (!mm) {
    const num = parseInt(month, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      mm = String(num).padStart(2, "0");
    }
  }

  if (!mm || !/^\d{4}$/.test(year)) {
    return "UNKNOWN";
  }

  return `${mm}${year}`;
}
