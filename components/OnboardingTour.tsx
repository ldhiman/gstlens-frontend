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
    title: "Welcome to GSTLens! 🚀",
    description:
      "Your intelligent GST compliance companion. Snap invoice photos or upload PDFs to extract GSTINs, tax slabs, and amounts instantly with AI.",
    icon: Sparkles,
    position: "center",
    badge: "10 Free Credits Ready",
  },
  {
    targetId: "tour-scan-zone",
    title: "1. Scan or Upload Invoice",
    description:
      "Tap the Camera / Scan button on mobile or drag and drop PDFs/images on desktop. Our system processes bills in under 5 seconds.",
    icon: Camera,
    position: "bottom",
    badge: "Instant AI Extraction",
  },
  {
    targetId: "tour-invoice-list",
    title: "2. Review & Auto-Correction",
    description:
      "Verify extracted data, check auto-calculated CGST/SGST/IGST sanity checks, and lookup live taxpayer registration details with 1 click.",
    icon: FileCheck2,
    position: "top",
    badge: "Built-in Tax Checks",
  },
  {
    targetId: "tour-returns-link",
    title: "3. One-Click Government Returns",
    description:
      "Generate fully compliant GSTR-1 & GSTR-3B JSON files formatted for the official GST Portal offline tool. No manual data entry ever again!",
    icon: DownloadCloud,
    position: "bottom",
    badge: "GST Portal Ready",
  },
];

const TOUR_STORAGE_KEY = "has_seen_tour_v1";

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Check if user has already seen the tour
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      // Short delay for initial UI render
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for manual tour restart events
  useEffect(() => {
    const handleRestart = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener("RESTART_TOUR", handleRestart);
    return () => window.removeEventListener("RESTART_TOUR", handleRestart);
  }, []);

  // Update spotlight target positioning
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
      {/* Dimmed backdrop - unblurred for crystal clear UI visibility */}
      <div
        className="absolute inset-0 bg-slate-950/50 transition-opacity duration-300"
        onClick={handleComplete}
      />

      {/* Target Spotlight Highlight Ring */}
      {targetRect && (
        <div
          className="absolute border-2 border-indigo-400 bg-indigo-500/10 rounded-2xl pointer-events-none transition-all duration-300 shadow-[0_0_40px_rgba(99,102,241,0.5)] animate-pulse"
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
        <div className="relative pointer-events-auto bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-scale-in">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <StepIcon className="w-6 h-6" />
              </div>
              <div>
                {step.badge && (
                  <span className="inline-block text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 mb-1">
                    {step.badge}
                  </span>
                )}
                <h3 className="font-bold text-slate-900 text-lg leading-tight">
                  {step.title}
                </h3>
              </div>
            </div>

            <button
              onClick={handleComplete}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              aria-label="Skip tour"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Progress & Navigation Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? "w-6 bg-indigo-600"
                      : "w-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 active:scale-95 transition"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/25 active:scale-95 transition"
              >
                {isLast ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Get Started
                  </>
                ) : (
                  <>
                    Next <ChevronRight className="w-4 h-4" />
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
