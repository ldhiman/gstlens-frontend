"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  Camera,
  FileCheck2,
  DownloadCloud,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle,
} from "lucide-react";
import { isSandboxModeActive } from "@/lib/sandboxData";

export type TourStep = {
  targetId?: string;
  title: string;
  description: string;
  icon: any;
  position?: "top" | "bottom" | "center";
  badge?: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to GSTLens",
    description:
      "Your intelligent GST compliance companion. Snap invoice photos or upload PDFs to extract GSTINs, tax slabs, and amounts instantly with AI.",
    icon: Sparkles,
    position: "center",
    badge: "10 free credits ready",
  },
  {
    targetId: "tour-scan-zone",
    title: "1. Scan or upload invoice",
    description:
      "Tap the Camera / Scan button on mobile or drag and drop PDFs/images on desktop. Our system processes bills in under 5 seconds.",
    icon: Camera,
    position: "bottom",
    badge: "Instant AI extraction",
  },
  {
    targetId: "tour-invoice-list",
    title: "2. Review & auto-correction",
    description:
      "Verify extracted data, check auto-calculated CGST/SGST/IGST sanity checks, and lookup live taxpayer registration details with 1 click.",
    icon: FileCheck2,
    position: "top",
    badge: "Built-in tax checks",
  },
  {
    targetId: "tour-returns-link",
    title: "3. One-click government returns",
    description:
      "Generate fully compliant GSTR-1 & GSTR-3B JSON files formatted for the official GST Portal offline tool. No manual data entry ever again.",
    icon: DownloadCloud,
    position: "bottom",
    badge: "GST portal ready",
  },
];

const TOUR_STORAGE_KEY = "has_seen_tour_v1";

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen && !isSandboxModeActive()) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleRestart = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener("RESTART_TOUR", handleRestart);
    return () => window.removeEventListener("RESTART_TOUR", handleRestart);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStep];
    if (step.targetId) {
      const el = document.getElementById(step.targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const updateRect = () => setTargetRect(el.getBoundingClientRect());
        updateRect();
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect);
        return () => {
          window.removeEventListener("resize", updateRect);
          window.removeEventListener("scroll", updateRect);
        };
      }
    }
    setTargetRect(null);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const StepIcon = step.icon;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 transition-opacity duration-300"
        onClick={handleComplete}
      />

      {/* Target Spotlight Highlight Ring */}
      {targetRect && (
        <div
          className="absolute border-2 border-[#047857] bg-emerald-500/10 rounded-2xl pointer-events-none transition-all duration-300 shadow-[0_0_25px_rgba(4,120,87,0.35)]"
          style={{
            top: `${Math.max(8, targetRect.top - 8)}px`,
            left: `${Math.max(8, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
          }}
        />
      )}

      {/* Tour Dialog Card */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative pointer-events-auto bg-white dark:bg-[#161513] text-stone-900 dark:text-stone-100 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200/80 dark:border-white/[0.08] animate-scale-in">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-[#047857] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <StepIcon className="w-5 h-5" />
              </div>
              <div>
                {step.badge && (
                  <span className="inline-block text-[10px] font-bold text-[#047857] dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 mb-1">
                    {step.badge}
                  </span>
                )}
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-base leading-tight">
                  {step.title}
                </h3>
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition"
              aria-label="Skip tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Progress & Navigation Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? "w-5 bg-[#047857]"
                      : "w-1.5 bg-stone-200 dark:bg-stone-700"
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1 active:scale-95 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
              >
                {isLast ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" /> Get started
                  </>
                ) : (
                  <>
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
