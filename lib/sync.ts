// src/lib/sync.ts
import { v4 as uuid } from "uuid";
import { authFetch, handleResponse } from "@/lib/api";
import {
  getUnsyncedInvoices,
  markAsSynced,
  saveInvoiceDraft,
  StoredInvoice,
  upsertInvoice,
} from "@/lib/storage";
import { getSettings, saveLocalSettings } from "./settings";
import toast from "react-hot-toast";
import { SYNC_EVENT } from "@/lib/constants";
/* ----------------------------- */
/* Push unsynced local invoices  */
/* ----------------------------- */
async function pushUnsyncedInvoices(): Promise<number> {
  const unsynced = await getUnsyncedInvoices();
  console.log("Unsynced invoics: " + unsynced.length);
  if (unsynced.length === 0) return 0;

  const toastId = toast.loading(`Uploading 0/${unsynced.length} invoices...`);

  const toUpload = unsynced.map((inv) => {
    const { id, synced_to_cloud, cloud_id, ...rest } = inv;
    return {
      ...rest,
      created_at: Math.floor(inv.created_at / 1000),
      updated_at: Math.floor(inv.updated_at / 1000),
    };
  });

  try {
    const res = await authFetch("/sync/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toUpload),
    });

    const { cloud_ids } = await handleResponse(res);

    for (let i = 0; i < unsynced.length; i++) {
      await markAsSynced(unsynced[i].id, cloud_ids[i]);
      // Update progress
      toast.loading(`Uploading ${i + 1}/${unsynced.length} invoices...`, {
        id: toastId,
      });
    }

    toast.success(`Uploaded ${unsynced.length} invoice(s)`, { id: toastId });
    return unsynced.length;
  } catch (error) {
    toast.error("Failed to upload invoices", { id: toastId });
    throw error;
  }
}

/* ----------------------------- */
/* Pull new invoices from cloud  */
/* ----------------------------- */
async function pullNewInvoices(lastSyncTime: number): Promise<number> {
  const res = await authFetch(`/sync/invoices?last_sync_time=${lastSyncTime}`);
  const { invoices } = await handleResponse(res);

  if (invoices.length === 0) return 0;

  const toastId = toast.loading(
    `Downloading 0/${invoices.length} invoice(s)...`
  );

  for (let i = 0; i < invoices.length; i++) {
    const cloudInv = invoices[i];

    await upsertInvoice({
      id: cloudInv.cloud_id, // or generate mapping
      status: cloudInv.status,
      fp: cloudInv.fp,
      data: cloudInv.data,
      created_at: cloudInv.created_at,
      updated_at: cloudInv.updated_at,
      synced_to_cloud: 1,
      cloud_id: cloudInv.cloud_id,
    });

    // Update progress
    toast.loading(`Downloading ${i + 1}/${invoices.length} invoice(s)...`, {
      id: toastId,
    });
  }
  toast.success(`Downloaded ${invoices.length} invoice(s)`, { id: toastId });
  return invoices.length;
}

/* ----------------------------- */
/* Update local last_sync_time   */
/* ----------------------------- */
function updateLastSyncTime(): void {
  saveLocalSettings({ last_sync_time: Date.now() });
}

/* ----------------------------- */
/* Full sync orchestrator        */
/* ----------------------------- */
export async function performCloudSync(): Promise<void> {
  if (isSyncing) {
    console.log("Sync already in progress — skipping");
    return;
  }

  isSyncing = true;

  const lastSyncTime = getSettings().last_sync_time || 0;
  const isFirstSync = lastSyncTime === 0;

  let pulledCount = 0;
  let pushedCount = 0;
  let toastID;
  try {
    if (isFirstSync) {
      toastID = toast.loading(
        "First time sync — downloading all your invoices..."
      );
    }

    pulledCount = await pullNewInvoices(lastSyncTime);
    pushedCount = await pushUnsyncedInvoices();

    console.log("Pulled Invoices: " + pulledCount);
    console.log("Pushed Invoices: " + pushedCount);

    const total = pulledCount + pushedCount;
    if (total > 0) {
      toast.success(`Sync complete! ${total} invoice(s) updated`);
    } else {
      toast.success("All caught up — you're in sync!");
    }

    window.dispatchEvent(new Event(SYNC_EVENT));
    updateLastSyncTime();

    console.log("Cloud sync completed successfully");
  } catch (error: any) {
    console.error("Cloud sync failed:", error);

    if (
      error.message?.includes("subscription") ||
      error.message?.includes("403")
    ) {
      toast.error("Cloud sync requires an active subscription");
    } else {
      toast.error("Sync failed — will retry later");
    }
  } finally {
    toast.remove(toastID);
    isSyncing = false;
  }
}

/* ----------------------------- */
/* Background sync manager       */
/* ----------------------------- */
let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false; // ← Global flag to prevent concurrent syncs

export async function getSyncStatus() {
  if (isSyncing) {
    return "Syncing...";
  }

  const lastSyncTime = getSettings().last_sync_time;
  if (!lastSyncTime) {
    return "Not synced";
  }
  return formatLastSync(lastSyncTime);
}

function formatLastSync(lastSyncTime: number) {
  const now = new Date();
  const syncDate = new Date(lastSyncTime);

  // Helper to compare dates (ignoring time)
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  // Today → show time
  if (isSameDay(syncDate, now)) {
    return `Last synced: ${syncDate.toLocaleString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // Yesterday → show "Yesterday"
  if (isSameDay(syncDate, yesterday)) {
    return "Last synced: Yesterday";
  }

  // Older → show full date
  return `Last synced: ${syncDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

export function startBackgroundSync(
  hasActiveSubscription: boolean,
  intervalMs: number = 120000 // 2 minutes
): void {
  stopBackgroundSync();

  if (!hasActiveSubscription) {
    console.log("No active subscription — background sync disabled");
    return;
  }

  syncInterval = setInterval(async () => {
    await performCloudSync();
  }, intervalMs);

  // Immediate sync on start
  performCloudSync();
}

export function stopBackgroundSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
