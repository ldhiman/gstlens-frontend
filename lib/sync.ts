// src/lib/sync.ts
import { v4 as uuid } from "uuid";
import { authFetch, handleResponse } from "@/lib/api";
import {
  getUnsyncedInvoices,
  markAsSynced,
  saveInvoiceDraft,
  StoredInvoice,
  getInvoiceById,
  upsertInvoice,
} from "@/lib/storage";
import { getSettings, saveLocalSettings } from "./settings";
import toast from "react-hot-toast";
import { SYNC_EVENT } from "@/lib/constants";

type SyncProgress = {
  phase: "push" | "pull";
  current: number;
  total: number;
};

/* ----------------------------- */
/* Push unsynced local invoices  */
/* ----------------------------- */
async function pushUnsyncedInvoices(
  onProgress?: (p: SyncProgress) => void
): Promise<number> {
  const unsynced = (await getUnsyncedInvoices()).filter(
    (inv) => inv.status !== "draft"
  );
  console.log("Unsynced invoics: " + unsynced.length);
  if (unsynced.length === 0) return 0;

  let toastId;

  const toUpload = unsynced.map((inv) => ({
    local_id: inv.id, // 🔑 REQUIRED
    cloud_id: inv.cloud_id || null,
    deleted: inv.deleted,
    status: inv.status,
    fp: inv.fp,
    data: inv.data,
    created_at: Math.floor(inv.created_at / 1000),
    updated_at: Math.floor(inv.updated_at / 1000),
  }));

  try {
    const res = await authFetch("/sync/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toUpload),
    });

    const { cloud_ids } = await handleResponse(res);

    // toastId = toast.loading(`Uploading 0/${unsynced.length} invoices...`);

    for (let i = 0; i < unsynced.length; i++) {
      await markAsSynced(unsynced[i].id, cloud_ids[i]);
      // Update progress
      onProgress?.({
        phase: "push",
        current: i + 1,
        total: unsynced.length,
      });
      // toast.loading(`Uploading ${i + 1}/${unsynced.length} invoices...`, {
      //   id: toastId,
      // });
    }

    // toast.success(`Uploaded ${unsynced.length} invoice(s)`, { id: toastId });
    return unsynced.length;
  } catch (error) {
    // toast.error("Failed to upload invoices", { id: toastId });
    throw error;
  }
}

/* ----------------------------- */
/* Pull new invoices from cloud  */
/* ----------------------------- */
async function pullNewInvoices(
  lastSyncTime: number,
  onProgress?: (p: SyncProgress) => void
): Promise<number> {
  const res = await authFetch(`/sync/invoices?last_sync_time=${lastSyncTime}`);
  const { invoices } = await handleResponse(res);

  if (invoices.length === 0) return 0;

  for (let i = 0; i < invoices.length; i++) {
    const cloudInv = invoices[i];

    const local = cloudInv.local_id
      ? await getInvoiceById(cloudInv.local_id)
      : null;

    if (local?.deleted === 1 && cloudInv.deleted !== 1) {
      // Local delete wins
      continue;
    }

    await upsertInvoice({
      id: cloudInv.local_id ?? uuid(), // ✅ keep local ID stable
      status: cloudInv.status,
      fp: cloudInv.fp,
      data: cloudInv.data,
      created_at: cloudInv.created_at * 1000,
      updated_at: cloudInv.updated_at * 1000,
      synced_to_cloud: 1,
      deleted: cloudInv.deleted,
      cloud_id: cloudInv.cloud_id,
    });

    // Update progress
    // toast.loading(`Downloading ${i + 1}/${invoices.length} invoice(s)...`, {
    //   id: toastId,
    // });
    onProgress?.({
      phase: "pull",
      current: i + 1,
      total: invoices.length,
    });
  }
  // toast.success(`Downloaded ${invoices.length} invoice(s)`, { id: toastId });
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
  const toastId = toast.loading(
    isFirstSync ? "First time sync — preparing..." : "Syncing your invoices..."
  );
  try {
    const pushedCount = await pushUnsyncedInvoices((p) => {
      toast.loading(`Uploading invoices ${p.current}/${p.total}...`, {
        id: toastId,
      });
    });

    const pulledCount = await pullNewInvoices(lastSyncTime, (p) => {
      toast.loading(`Downloading invoices ${p.current}/${p.total}...`, {
        id: toastId,
      });
    });

    const total = pushedCount + pulledCount;

    console.log("Pulled Invoices: " + pulledCount);
    console.log("Pushed Invoices: " + pushedCount);

    toast.success(
      total > 0
        ? `Sync complete! ${total} invoice(s) updated`
        : "All caught up — you're in sync!",
      { id: toastId }
    );

    window.dispatchEvent(new Event(SYNC_EVENT));
    updateLastSyncTime();

    console.log("Cloud sync completed successfully");
  } catch (err: any) {
    console.error("Cloud sync failed:", err);
    toast.error(
      err.message?.includes("subscription")
        ? "Cloud sync requires an active subscription"
        : "Sync failed — will retry later",
      { id: toastId }
    );
  } finally {
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
