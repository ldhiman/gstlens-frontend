"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Minimize2,
  Maximize2,
  Loader2,
  FileText,
  CheckCircle2,
  X,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  SCAN_PIPELINE_STEPS,
  ScanStage,
  resolveStepIndex,
  computeNextProgress,
  formatElapsedSeconds,
  formatFileSize,
} from "@/lib/scanProgress";
import { AI_RETRY_EVENT, AiRetryEventDetail } from "@/lib/constants";

export interface UploadingModalProps {
  title?: string;
  subtitle?: string;
  onCancel?: () => void;
  fileName?: string;
  fileSize?: number;
  previewUrl?: string;
  isPdf?: boolean;
  stage?: ScanStage;
  defaultMinimized?: boolean;
}

export default function UploadingModal({
  title = "Analyzing Purchase Bill",
  subtitle = "Extracting line items, vendor GSTIN & ITC breakdown in background",
  onCancel,
  fileName,
  fileSize,
  previewUrl,
  isPdf = false,
  stage,
  defaultMinimized = true,
}: UploadingModalProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState(() => computeNextProgress(12, stage));
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [retryDetail, setRetryDetail] = useState<AiRetryEventDetail | null>(null);

  useEffect(() => {
    const handleRetry = (e: any) => {
      if (e.detail) {
        setRetryDetail(e.detail);
      }
    };
    window.addEventListener(AI_RETRY_EVENT, handleRetry);
    return () => window.removeEventListener(AI_RETRY_EVENT, handleRetry);
  }, []);

  const stepIndex = resolveStepIndex(stage, elapsedSeconds);
  const activeStep = SCAN_PIPELINE_STEPS[stepIndex] || SCAN_PIPELINE_STEPS[1];
  const formattedSize = formatFileSize(fileSize);

  // Bump progress floor when external stage transitions
  useEffect(() => {
    setProgress((prev) => computeNextProgress(prev, stage));
  }, [stage]);

  // Elapsed timer (1s) and smooth monotonic progress ticks (700ms)
  useEffect(() => {
    const elapsedTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const progressTimer = setInterval(() => {
      setProgress((prev) => computeNextProgress(prev, stage));
    }, 700);

    return () => {
      clearInterval(elapsedTimer);
      clearInterval(progressTimer);
    };
  }, [stage]);

  // Allow Escape key to minimize expanded modal back into non-blocking widget
  useEffect(() => {
    if (isMinimized) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMinimized(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMinimized]);

  /* ---------------- Minimized Non-Blocking Background Widget ---------------- */
  if (isMinimized) {
    return (
      <aside
        aria-label="Background AI Bill Analysis"
        aria-live="polite"
        className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-[380px] z-50 flex items-center gap-3 bg-white/95 dark:bg-[#1a1a1c]/95 border border-stone-200/90 dark:border-stone-800 rounded-2xl p-3 shadow-lg backdrop-blur-md animate-slide-up transition-all"
      >
        {/* Preview Thumbnail / Scanner Icon */}
        <div
          onClick={() => setIsMinimized(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsMinimized(false);
            }
          }}
          title="Click to view full analysis progress"
          className="relative w-11 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 text-[#047857] dark:text-emerald-400 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group"
        >
          {previewUrl && !isPdf ? (
            <>
              <img
                src={previewUrl}
                alt={fileName || "Scanning bill"}
                className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-x-0 h-0.5 bg-[#047857] shadow-[0_0_6px_rgba(4,120,87,0.6)] animate-mini-scan" />
            </>
          ) : isPdf ? (
            <>
              <FileText className="w-5 h-5 text-stone-500" />
              <div className="absolute inset-x-0 h-0.5 bg-[#047857] shadow-[0_0_6px_rgba(4,120,87,0.6)] animate-mini-scan" />
            </>
          ) : (
            <Loader2 className="w-5 h-5 animate-spin text-[#047857]" />
          )}
        </div>

        {/* Status & Progress */}
        <div
          onClick={() => setIsMinimized(false)}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#047857] animate-pulse shrink-0" />
              <span className="font-medium text-xs text-stone-900 dark:text-stone-100 truncate">
                {fileName || title}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
              <span className="text-stone-400 dark:text-stone-500 tabular-nums">
                {formatElapsedSeconds(elapsedSeconds)}
              </span>
              <span className="font-semibold text-[#047857] dark:text-emerald-400 tabular-nums">
                {progress}%
              </span>
            </div>
          </div>

          {retryDetail?.active ? (
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 truncate mt-0.5 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3 h-3 shrink-0 text-amber-500" />
              <span>Model busy (503) · Retrying in {retryDetail.secondsLeft}s...</span>
            </p>
          ) : (
            <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
              {elapsedSeconds >= 14 && stage === "ocr"
                ? "Deep parsing multi-line taxes..."
                : activeStep.shortLabel}
            </p>
          )}

          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="bg-[#047857] h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls: Expand & Cancel */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            title="Expand progress modal"
            aria-label="Expand progress modal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              title="Cancel scan"
              aria-label="Cancel AI bill scan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <style jsx>{`
          @keyframes mini-scan {
            0%, 100% {
              top: 8%;
            }
            50% {
              top: 86%;
            }
          }
          .animate-mini-scan {
            animation: mini-scan 1.6s ease-in-out infinite;
          }
        `}</style>
      </aside>
    );
  }

  /* ---------------- Expanded Modal View ---------------- */
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={() => setIsMinimized(true)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-[#1a1a1c] border-t sm:border border-stone-200/90 dark:border-stone-800 rounded-t-2xl sm:rounded-2xl p-5 sm:p-7 shadow-xl max-w-md w-full mx-auto overflow-hidden animate-slide-up"
      >
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-stone-200 dark:bg-stone-700 rounded-full mx-auto mb-3 sm:hidden" />

        {/* Top-right Minimize Button */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="absolute top-4 right-4 p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          title="Minimize to background"
          aria-label="Minimize to background"
        >
          <Minimize2 className="w-4 h-4" />
        </button>

        {/* Header: Scanner Thumbnail + Title */}
        <div className="flex flex-col items-center text-center">
          {/* Document Scanner Preview Frame */}
          <div className="relative mx-auto w-24 h-32 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-inner flex flex-col justify-between mb-4 overflow-hidden">
            {previewUrl && !isPdf ? (
              <img
                src={previewUrl}
                alt={fileName || "Invoice being scanned"}
                className="w-full h-full object-cover"
              />
            ) : isPdf ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2">
                <FileText className="w-8 h-8 text-stone-400" />
                <span className="text-[9px] font-mono uppercase tracking-wider text-stone-400">
                  PDF Bill
                </span>
              </div>
            ) : (
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5 opacity-60">
                  <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded w-2/3" />
                  <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded w-1/2" />
                </div>
                <div className="space-y-1 opacity-40">
                  <div className="h-1 bg-stone-200 dark:bg-stone-700 rounded w-full" />
                  <div className="h-1 bg-stone-200 dark:bg-stone-700 rounded w-4/5" />
                  <div className="h-1 bg-stone-200 dark:bg-stone-700 rounded w-3/4" />
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-200 dark:border-stone-800 opacity-60">
                  <div className="h-1.5 bg-[#047857]/60 rounded w-1/3" />
                  <div className="h-1.5 bg-stone-200 dark:bg-stone-700 rounded w-1/4" />
                </div>
              </div>
            )}

            {/* Animated Laser Scan Beam */}
            <div className="absolute left-0 right-0 h-0.5 bg-[#047857] shadow-[0_0_8px_rgba(4,120,87,0.6)] animate-scan" />
          </div>

          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 mb-2">
            <Sparkles className="w-3 h-3 text-[#047857]" />
            <span>Gemini Vision OCR</span>
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-stone-900 dark:text-stone-100 leading-tight">
            {title}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 max-w-xs">
            {subtitle}
          </p>

          {/* File Pill */}
          {(fileName || formattedSize) && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] text-stone-700 dark:text-stone-300 max-w-full">
              <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate max-w-[190px]">{fileName || "Invoice"}</span>
              {formattedSize && (
                <span className="text-[10px] font-mono text-stone-400 shrink-0">
                  {formattedSize}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 503 Model High Demand Spike Notice inside Modal */}
        {retryDetail?.active && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-left flex items-start gap-2.5 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                AI Model Experiencing High Demand (503)
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                Spikes in demand are temporary. Adding a 5 sec delay and retrying automatically in {retryDetail.secondsLeft}s (Attempt {retryDetail.attempt} of {retryDetail.maxRetries})...
              </p>
            </div>
          </div>
        )}

        {/* 4-Stage Pipeline Checklist */}
        <div className="mt-5 bg-stone-50 dark:bg-stone-900/50 border border-stone-200/70 dark:border-stone-800 rounded-xl p-3.5 space-y-2.5 text-left">
          {SCAN_PIPELINE_STEPS.map((step, idx) => {
            const isCompleted = idx < stepIndex;
            const isActive = idx === stepIndex;

            return (
              <div key={step.stage} className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-[#047857] animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-stone-300 dark:border-stone-700" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs leading-tight ${
                      isCompleted
                        ? "font-medium text-[#047857] dark:text-emerald-400"
                        : isActive
                        ? "font-medium text-stone-900 dark:text-stone-100"
                        : "text-stone-400 dark:text-stone-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                      {elapsedSeconds >= 14 && step.stage === "ocr"
                        ? "Parsing multi-line table & taxes..."
                        : step.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Bar & Elapsed Metadata */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 font-mono tabular-nums">
              <Clock className="w-3 h-3" />
              {formatElapsedSeconds(elapsedSeconds)}
              <span className="font-sans text-stone-400 ml-1">
                {elapsedSeconds < 12 ? "• Usually 3–8s" : "• Processing multi-page bill"}
              </span>
            </span>
            <span className="font-mono font-medium text-[#047857] dark:text-emerald-400 tabular-nums">
              {progress}%
            </span>
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#047857] h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex-1 py-2 px-3.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-xs font-medium shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Continue in background</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="py-2 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 4%;
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            top: 92%;
            opacity: 0;
          }
        }
        .animate-scan {
          animation: scan 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
