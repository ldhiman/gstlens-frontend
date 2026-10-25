"use client";

import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  FileText,
  RotateCcw,
  Check,
  Layers,
} from "lucide-react";
import type { BatchFileItem, BatchSummaryState } from "@/lib/batchUpload";

interface BatchUploadModalProps {
  isOpen: boolean;
  items: BatchFileItem[];
  summary: BatchSummaryState;
  onClose: () => void;
  onRetryFailed?: () => void;
  onStop?: () => void;
}

export default function BatchUploadModal({
  isOpen,
  items,
  summary,
  onClose,
  onRetryFailed,
  onStop,
}: BatchUploadModalProps) {
  if (!isOpen) return null;

  const percent =
    summary.total > 0
      ? Math.min(100, Math.round((summary.completed / summary.total) * 100))
      : 0;

  const isFinished = !summary.inProgress;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (isFinished) onClose();
        }}
      />

      {/* Modal - Bottom Sheet on mobile, Centered Modal on desktop */}
      <div className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl border-t sm:border border-slate-200/80 dark:border-slate-800 max-h-[92vh] sm:max-h-[88vh] flex flex-col z-10 overflow-hidden animate-slide-up">
        {/* Mobile Swipe Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Batch Invoice Processing
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Concurrency Pool (3x)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  AI OCR extraction with Section 16(2) statutory duplicate checks
                </p>
              </div>
            </div>

            {isFinished && (
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Overview Header */}
        <div className="px-5 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              {summary.inProgress ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  Processing Invoices...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Batch Complete
                </>
              )}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {summary.completed} / {summary.total} ({percent}%)
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Summary Metric Pills */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold pt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Check className="w-3 h-3" /> {summary.successful} Successful
            </span>

            {summary.duplicates > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-3 h-3" /> {summary.duplicates} Duplicates Flagged
              </span>
            )}

            {summary.failed > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-3 h-3" /> {summary.failed} Failed
              </span>
            )}
          </div>
        </div>

        {/* Per-File Status Queue List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 max-h-[380px]">
          {items.map((item, idx) => {
            const isCompleted = item.status === "completed";
            const isError = item.status === "error";
            const isDuplicate = item.duplicateInfo?.isDuplicate;

            return (
              <div
                key={item.id || idx}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isCompleted
                    ? isDuplicate
                      ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                    : isError
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40"
                    : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? isDuplicate
                          ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                        : isError
                        ? "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {isCompleted ? (
                      isDuplicate ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )
                    ) : isError ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.statusMessage || `${(item.size / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                </div>

                {/* Status Pill Badge */}
                <div className="flex-shrink-0">
                  <StatusBadge status={item.status} isDuplicate={isDuplicate} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between gap-3">
          {summary.inProgress ? (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Processing pool active (max 3 concurrent)
              </p>
              {onStop && (
                <button
                  onClick={onStop}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition min-h-[44px]"
                >
                  Stop
                </button>
              )}
            </>
          ) : (
            <>
              {summary.failed > 0 && onRetryFailed ? (
                <button
                  onClick={onRetryFailed}
                  className="px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 transition flex items-center gap-1.5 min-h-[44px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Failed ({summary.failed})
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-800 active:scale-98 transition min-h-[44px]"
              >
                Done & View Invoices
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  isDuplicate,
}: {
  status: string;
  isDuplicate?: boolean;
}) {
  switch (status) {
    case "queued":
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          Queued
        </span>
      );
    case "compressing":
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 animate-pulse">
          Optimizing
        </span>
      );
    case "uploading":
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 animate-pulse">
          Extracting AI
        </span>
      );
    case "dedup_check":
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 animate-pulse">
          Dedup Check
        </span>
      );
    case "completed":
      return isDuplicate ? (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          Duplicate
        </span>
      ) : (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          Saved
        </span>
      );
    case "error":
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          Failed
        </span>
      );
    default:
      return null;
  }
}
