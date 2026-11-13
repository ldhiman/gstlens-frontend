export type ScanStage = "compressing" | "ocr" | "verifying" | "finalizing";

export interface ScanPipelineStep {
  stage: ScanStage;
  label: string;
  shortLabel: string;
  detail: string;
  minProgress: number;
  maxProgress: number;
}

export const SCAN_PIPELINE_STEPS: ScanPipelineStep[] = [
  {
    stage: "compressing",
    label: "Optimizing & deskewing bill image",
    shortLabel: "Optimizing image...",
    detail: "300 DPI enhancement & contrast normalization",
    minProgress: 12,
    maxProgress: 24,
  },
  {
    stage: "ocr",
    label: "Gemini AI reading items, HSN & totals",
    shortLabel: "Gemini AI analysing bill...",
    detail: "Extracting line items, tax slabs & invoice metadata",
    minProgress: 25,
    maxProgress: 84,
  },
  {
    stage: "verifying",
    label: "Verifying GSTIN & Place of Supply",
    shortLabel: "Verifying GSTIN & taxes...",
    detail: "Validating 15-digit GSTIN & statutory state codes",
    minProgress: 85,
    maxProgress: 94,
  },
  {
    stage: "finalizing",
    label: "Running duplicate & Rule 46 checks",
    shortLabel: "Preparing invoice review...",
    detail: "Checking Section 16(2) / Rule 46(b) uniqueness",
    minProgress: 95,
    maxProgress: 99,
  },
];

/**
 * Resolves the active step index (0..3) monotonically.
 * When `stage` is omitted, advances deterministically with elapsed time and clamps at the final step.
 */
export function resolveStepIndex(stage: ScanStage | undefined, elapsedSeconds: number): number {
  if (stage) {
    const idx = SCAN_PIPELINE_STEPS.findIndex((s) => s.stage === stage);
    if (idx !== -1) return idx;
  }

  if (elapsedSeconds < 2) return 0;
  if (elapsedSeconds < 6) return 1;
  if (elapsedSeconds < 9) return 2;
  return 3;
}

/**
 * Computes the next smooth monotonic progress percentage.
 * Progress never moves backward and eases asymptotically toward the stage ceiling.
 */
export function computeNextProgress(currentProgress: number, stage?: ScanStage): number {
  const step = stage
    ? SCAN_PIPELINE_STEPS.find((s) => s.stage === stage) ?? SCAN_PIPELINE_STEPS[1]
    : null;

  const floor = step ? step.minProgress : 12;
  const ceiling = step ? step.maxProgress : 94;

  const base = Math.max(currentProgress, floor);
  if (base >= ceiling) return Math.min(99, base);

  const remaining = ceiling - base;
  const delta = Math.max(1, Math.round(remaining * 0.18));
  return Math.min(ceiling, base + delta);
}

/**
 * Formats elapsed seconds concisely (e.g., "0s", "5s", "1m 04s").
 */
export function formatElapsedSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  if (safe < 60) return `${safe}s`;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

/**
 * Formats byte size into human-readable KB / MB string.
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Detects whether an error came from a user-triggered AbortController cancellation.
 */
export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { name?: string; code?: string };
  return anyErr.name === "AbortError" || anyErr.code === "ABORT_ERR";
}
