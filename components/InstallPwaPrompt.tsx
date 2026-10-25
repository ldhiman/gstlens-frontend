"use client";

import { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Sparkles, Smartphone, Check } from "lucide-react";
import Image from "next/image";

export default function InstallPwaPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed as PWA / running in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandalone) {
      return;
    }

    // 2. Check dismissal cooldown (dismissed within last 3 days)
    const dismissedAt = localStorage.getItem("gstlens_pwa_dismissed");
    if (dismissedAt) {
      const daysSince = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 3) {
        return;
      }
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    const isSafari = ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios");

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // Delay showing for 2.5s so user has viewed initial content
      const timer = setTimeout(() => setShowPrompt(true), 2500);
      return () => clearTimeout(timer);
    }

    // 4. Android / Chrome / Edge BeforeInstallPromptEvent
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait 2s to show
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 5. App installed listener
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      localStorage.removeItem("gstlens_pwa_dismissed");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem("gstlens_pwa_dismissed", String(Date.now()));
  };

  if (!showPrompt || installed) return null;

  return (
    <>
      {/* Floating A2HS Mobile Banner */}
      <div className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-slide-up">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-indigo-200 dark:border-indigo-900/60 ring-1 ring-black/5 dark:ring-white/10 transition-all">
          <div className="flex items-start gap-3">
            {/* App Icon */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 p-0.5 shadow-md flex-shrink-0 overflow-hidden relative">
              <img
                src="/icon-192.png"
                alt="GSTLens Icon"
                className="w-full h-full object-cover rounded-[14px]"
              />
            </div>

            {/* Copy */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  Install GSTLens App
                </h4>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  Fast
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Add to your home screen for instant camera scanning without browser tabs.
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition text-center"
            >
              Not now
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1.5 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              {isIOS ? (
                <>
                  <Share className="w-3.5 h-3.5" />
                  Install Guide
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Add to Home Screen
                </>
              )}
            </button>
          </div>

          {/* iOS Safari 2-Step Guide Sheet */}
          {showIOSGuide && (
            <div className="mt-3 p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 text-xs space-y-2 animate-fade-in">
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Install on iPhone / iPad:
                </span>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button{" "}
                    <Share className="w-3.5 h-3.5 inline mx-0.5 text-indigo-600 dark:text-indigo-400" /> in Safari's bottom toolbar.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>{" "}
                    <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-indigo-600 dark:text-indigo-400" />.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
