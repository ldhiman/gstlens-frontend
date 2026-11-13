"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone, Share, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Detect if already in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // 2. Check if user dismissed prompt recently (24 hour cool-down)
    const dismissedTime = localStorage.getItem("gstlens_pwa_dismissed");
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime, 10);
      if (elapsed < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      /safari/.test(userAgent) &&
      !/crios|fxios|opios|mercury/.test(userAgent);

    if (isAppleDevice && isSafari && !isStandalone) {
      setIsIOS(true);
      // Delay showing banner slightly for calm UX
      const timer = setTimeout(() => setShowPrompt(true), 4000);
      return () => clearTimeout(timer);
    }

    // 4. Android / Chrome BeforeInstallPrompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait 3.5 seconds after page load before showing banner
      setTimeout(() => setShowPrompt(true), 3500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 5. Track successful install
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
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

    await deferredPrompt.prompt();
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
        <div className="bg-white/95 dark:bg-[#161513]/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-stone-200/80 dark:border-white/[0.08] ring-1 ring-black/5 dark:ring-white/5 transition-all">
          <div className="flex items-start gap-3">
            {/* App Icon */}
            <div className="w-11 h-11 rounded-xl bg-[#047857] p-0.5 shadow-sm shrink-0 overflow-hidden relative">
              <img
                src="/icon-192.png"
                alt="GSTLens Icon"
                className="w-full h-full object-cover rounded-[10px]"
              />
            </div>

            {/* Copy */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                  Install GSTLens app
                </h4>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                  Fast
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug">
                Add to your home screen for instant camera scanning without browser tabs.
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition text-center cursor-pointer"
            >
              Not now
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1.5 py-2 px-3.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold shadow-sm active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isIOS ? (
                <>
                  <Share className="w-3.5 h-3.5" />
                  Install guide
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Add to home screen
                </>
              )}
            </button>
          </div>

          {/* iOS Safari 2-Step Guide Sheet */}
          {showIOSGuide && (
            <div className="mt-3 p-3 rounded-xl bg-stone-50 dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 text-xs space-y-2 animate-fade-in">
              <div className="flex items-center justify-between font-bold text-stone-900 dark:text-stone-100">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#047857] dark:text-emerald-400" />
                  Install on iPhone / iPad:
                </span>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#047857] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button{" "}
                    <Share className="w-3.5 h-3.5 inline mx-0.5 text-[#047857] dark:text-emerald-400" /> in Safari's bottom toolbar.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#047857] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong>{" "}
                    <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#047857] dark:text-emerald-400" />.
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
