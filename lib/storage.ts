import { v4 as uuid } from "uuid";

export type StoredInvoice = {
  id: string;
  status: "draft" | "confirmed" | "auto_saved";
  fp: string; // MMYYYY
  data: any; // Canonical invoice JSON
  created_at: number;
  updated_at: number;
  synced_to_cloud: 0 | 1;
  cloud_id: string;
};

const DB_NAME = "gstlens-db";
const DB_VERSION = 2;
const STORE_NAME = "invoices";

/* ----------------------------- */
/* Open / Init DB                */
/* ----------------------------- */

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        // First-time creation
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("fp", "fp", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }

      if (oldVersion < 2) {
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const store = tx.objectStore(STORE_NAME);
        if (!store.indexNames.contains("synced_to_cloud")) {
          store.createIndex("synced_to_cloud", "synced_to_cloud", {
            unique: false,
          });
        }
        if (!store.indexNames.contains("updated_at")) {
          store.createIndex("updated_at", "updated_at", { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

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
) {
  const db = await openDB();

  const fp = getFP(invoiceData.invoice_date);

  const id = invoiceData._local_id ?? uuid();

  const record: StoredInvoice = {
    id,
    status,
    fp,
    data: {
      ...invoiceData,
      _local_id: id,
    },
    created_at: invoiceData.created_at ?? Date.now(), // preserve if updating existing
    updated_at: Date.now(), // ADD THIS
    synced_to_cloud: 0, // ADD THIS
    cloud_id: "", // ADD THIS (empty initially)
  };

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function upsertInvoice(invoice: StoredInvoice) {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    store.put(invoice);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateInvoice(
  id: string,
  updates: Partial<
    Pick<StoredInvoice, "data" | "status" | "synced_to_cloud" | "cloud_id">
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

      const updated: StoredInvoice = {
        ...existing,
        ...updates,
        data: updates.data
          ? { ...existing.data, ...updates.data }
          : existing.data,
        updated_at: Date.now(),
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

    req.onsuccess = () => resolve(req.result);
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
        (inv) => inv.status === "confirmed" || inv.status === "auto_saved"
      );
      resolve(valid);
    };

    req.onerror = () => reject(req.error);
  });
}

export async function deleteInvoice(id: string) {
  const db = await openDB();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getFP(invoiceDate?: string): string {
  if (!invoiceDate || typeof invoiceDate !== "string") {
    return "UNKNOWN";
  }

  // Normalize separators
  const cleaned = invoiceDate.replace(/[./]/g, "-");

  const parts = cleaned.split("-");

  let day: string | undefined;
  let month: string | undefined;
  let year: string | undefined;

  // YYYY-MM-DD
  if (parts[0]?.length === 4) {
    year = parts[0];
    month = parts[1];
  }
  // DD-MM-YYYY or DD-MMM-YY
  else if (parts.length >= 3) {
    day = parts[0];
    month = parts[1];
    year = parts[2];
  }

  if (!month || !year) {
    return "UNKNOWN";
  }

  // Handle short year (25 → 2025)
  if (year.length === 2) {
    year = "20" + year;
  }

  // Month name → number
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
  const mm = monthMap[m] || month.padStart(2, "0");

  return `${mm}${year}`;
}
