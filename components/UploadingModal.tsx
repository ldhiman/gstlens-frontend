"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Minimize2, Maximize2, Loader2, FileText, CheckCircle2 } from "lucide-react";

interface UploadingModalProps {
  title?: string;
  subtitle?: string;
  onCancel?: () => void;
  fileName?: string;
}

const SCAN_STEPS = [
  "Reading bill image & text...",
  "Extracting items, rates & HSN...",
  "Verifying GSTIN & calculating tax...",
  "Formatting invoice for review...",
];

export default function UploadingModal({
  title = "AI Bill Scanning",
  subtitle = "Extracting invoice details automatically",
  onCancel,
  fileName,
}: UploadingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(25);
  const [isMinimized, setIsMinimized] = useState(true); // Default to non-blocking background widget

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SCAN_STEPS.length);
    }, 1800);

    const progressTimer = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 1200);

    return () => {
      clearInterval(timer);
      clearInterval(progressTimer);
    };
  }, []);

  /* ---------------- Minimized Non-Blocking Floating Widget ---------------- */
  if (isMinimized) {
    return (
      <aside
        aria-label="Background AI Scanning"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-slide-up max-w-sm w-[340px] text-left transition-all"
      >
        <div className="relative w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
              {fileName || "Scanning bill with AI..."}
            </span>
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 ml-1">
              {progress}%
            </span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {SCAN_STEPS[stepIndex]}
          </p>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Expand modal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  /* ---------------- Full Modal View ---------------- */
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-sm w-full mx-auto text-center overflow-hidden">
        {/* Minimize Button in Top-Right */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Continue in background"
        >
          <Minimize2 className="w-4 h-4" />
        </button>

        {/* Glow backdrop */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Document Scanner Graphic */}
        <div className="relative mx-auto w-24 h-32 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 p-3 shadow-inner flex flex-col justify-between mb-5 overflow-hidden">
          <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_12px_#6366f1] animate-scan" />
          <div className="space-y-1.5 opacity-60">
            <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded w-2/3" />
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
          <div className="space-y-1 opacity-40">
            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-full" />
            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
            <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700/60 opacity-60">
            <div className="h-1.5 bg-indigo-500/60 rounded w-1/3" />
            <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded w-1/4" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900/60 mb-2.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Google Gemini Vision OCR</span>
        </div>

        <h3 className="text-lg font-black text-slate-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {subtitle}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-5 overflow-hidden">
          <div
            className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Active Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300 min-h-[20px]">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
          <span className="transition-opacity duration-300">{SCAN_STEPS[stepIndex]}</span>
        </div>

        {/* Action: Minimize to Background */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Work in Background (Don&apos;t wait)</span>
          </button>
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
