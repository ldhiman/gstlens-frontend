import { checkDuplicateInvoice } from "./duplicates.ts";
import type { DuplicateCheckResult, StoredInvoiceRef } from "./duplicates.ts";

export type BatchFileStatus =
  | "queued"
  | "compressing"
  | "uploading"
  | "dedup_check"
  | "completed"
  | "error";

export interface BatchFileItem {
  id: string;
  name: string;
  size: number;
  status: BatchFileStatus;
  progress: number; // 0 - 100
  statusMessage?: string;
  error?: string;
  data?: any;
  duplicateInfo?: DuplicateCheckResult;
  localId?: string;
}

export interface BatchSummaryState {
  total: number;
  completed: number;
  successful: number;
  duplicates: number;
  failed: number;
  inProgress: boolean;
}

export interface BatchUploadProcessorOptions {
  concurrency?: number; // Defaults to 3 workers
  uploadFn: (file: any) => Promise<{ data: any }>;
  verifyGSTFn?: (gstin: string) => Promise<{ data: any }>;
  saveDraftFn?: (data: any, status: string) => Promise<string>;
  compressImageFn?: (file: any) => Promise<any>;
  onProgress?: (items: BatchFileItem[], summary: BatchSummaryState) => void;
  existingInvoices?: StoredInvoiceRef[];
}

/**
 * Enterprise Multi-Invoice Batch Upload Engine
 * Employs a controlled worker pool with configurable concurrency (default: 3)
 * to avoid API rate-limit spikes (HTTP 429) and browser thread starvation.
 * Performs per-file pipeline tracking:
 * 1. queued -> 2. compressing -> 3. uploading (AI OCR) -> 4. dedup_check -> 5. completed / error
 */
export async function runBatchUploadQueue(
  files: any[],
  options: BatchUploadProcessorOptions
): Promise<{ items: BatchFileItem[]; summary: BatchSummaryState }> {
  const concurrency = Math.max(1, options.concurrency || 3);
  const sessionInvoices: StoredInvoiceRef[] = [...(options.existingInvoices || [])];

  const items: BatchFileItem[] = files.map((file, idx) => ({
    id: `batch_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    name: file.name || `invoice_${idx + 1}`,
    size: file.size || 0,
    status: "queued",
    progress: 0,
    statusMessage: "Queued in upload pool...",
  }));

  const summary: BatchSummaryState = {
    total: files.length,
    completed: 0,
    successful: 0,
    duplicates: 0,
    failed: 0,
    inProgress: true,
  };

  const emitProgress = () => {
    options.onProgress?.(
      items.map((i) => ({ ...i })),
      { ...summary }
    );
  };

  emitProgress();

  let cursor = 0;

  async function processNext(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      const currentItem = items[idx];
      const currentFile = files[idx];

      try {
        let fileToUpload = currentFile;

        // Stage 1: Optional compression for large images (> 1MB)
        if (
          currentFile?.type?.startsWith("image/") &&
          currentFile?.size > 1 * 1024 * 1024 &&
          options.compressImageFn
        ) {
          currentItem.status = "compressing";
          currentItem.progress = 20;
          currentItem.statusMessage = "Optimizing image resolution...";
          emitProgress();
          try {
            fileToUpload = await options.compressImageFn(currentFile);
          } catch (e) {
            console.warn("Compression fallback to original:", e);
          }
        }

        // Stage 2: AI OCR Extraction
        currentItem.status = "uploading";
        currentItem.progress = 50;
        currentItem.statusMessage = "Extracting GST invoice data via AI...";
        emitProgress();

        const uploadRes = await options.uploadFn(fileToUpload);
        const data = uploadRes.data || {};

        // Stage 3: Duplicate Check (Section 16(2) CGST Act & Rule 46(b))
        currentItem.status = "dedup_check";
        currentItem.progress = 80;
        currentItem.statusMessage = "Validating Section 16(2) statutory uniqueness...";
        emitProgress();

        const dupResult = checkDuplicateInvoice(data, sessionInvoices);
        currentItem.duplicateInfo = dupResult;
        currentItem.data = data;

        if (dupResult.isDuplicate) {
          data.duplicate_warning = dupResult.warningMessage;
          summary.duplicates++;
        }

        // Save into local draft storage if function provided
        if (options.saveDraftFn) {
          const saveStatus = dupResult.isDuplicate ? "draft" : "auto_saved";
          const localId = await options.saveDraftFn(data, saveStatus);
          currentItem.localId = localId;
          data._local_id = localId;

          // Add to session memory so subsequent batch files can be checked against this
          sessionInvoices.push({
            id: localId,
            status: saveStatus,
            fp: data.invoice_date || "",
            data,
            created_at: Date.now(),
            updated_at: Date.now(),
            synced_to_cloud: 0,
            deleted: 0,
          });
        }

        // Stage 4: Completed
        currentItem.status = "completed";
        currentItem.progress = 100;
        currentItem.statusMessage = dupResult.isDuplicate
          ? "Duplicate flagged (Section 16(2))"
          : "Successfully extracted and verified";
        summary.successful++;
      } catch (err: any) {
        currentItem.status = "error";
        currentItem.progress = 100;
        currentItem.error = err.message || "Failed to process invoice";
        currentItem.statusMessage = currentItem.error;
        summary.failed++;
      } finally {
        summary.completed++;
        emitProgress();
      }
    }
  }

  // Spawn pool with bounded concurrency
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => processNext());
  await Promise.all(workers);

  summary.inProgress = false;
  emitProgress();

  return { items, summary };
}

export const runBatchUpload = runBatchUploadQueue;

