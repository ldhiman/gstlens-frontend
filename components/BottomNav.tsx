"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Coins,
  Camera,
  UploadCloud,
  X,
  Sparkles,
} from "lucide-react";
import { useState, useRef } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isActive = (path: string) => pathname === path;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSheetOpen(false);
      // Dispatch global file event for the dashboard or active view
      const event = new CustomEvent("DIRECT_FILE_SELECT", { detail: file });
      window.dispatchEvent(event);

      if (pathname !== "/dashboard") {
        router.push("/dashboard");
      }
      e.target.value = "";
    }
  };

  return (
    <>
      {/* Mobile Bottom Sheet for Scan / Upload */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setSheetOpen(false)}
          />

          <div className="relative bg-white dark:bg-slate-900 rounded-t-3xl p-6 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-slide-up z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Process New Invoice
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    AI auto-extracts GSTIN, amounts & taxes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-slate-800 dark:text-slate-200 font-medium active:scale-98"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Take Photo
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                  Camera capture
                </span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-slate-800 dark:text-slate-200 font-medium active:scale-98"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center shadow-md">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Upload File
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                  PDF, PNG, JPG
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File / Camera Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        onChange={handleFile}
      />

      {/* Persistent Bottom Bar */}
      <nav
        id="tour-bottom-nav"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 px-2 pb-safe transition-colors"
      >
        <div className="flex items-center justify-around h-16 relative">
          {/* Dashboard */}
          <button
            onClick={() => router.push("/dashboard")}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive("/dashboard")
                ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Dashboard</span>
          </button>

          {/* GSTR-1 */}
          <button
            onClick={() => router.push("/gstr-1")}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive("/gstr-1")
                ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">GSTR-1</span>
          </button>

          {/* Scan Center Button */}
          <div className="relative -top-5 flex flex-col items-center">
            <button
              id="tour-scan-button"
              onClick={() => setSheetOpen(true)}
              aria-label="Scan or Upload Invoice"
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all ring-4 ring-white dark:ring-slate-950"
            >
              <Camera className="w-6 h-6" />
            </button>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">
              Scan
            </span>
          </div>

          {/* GSTR-3B */}
          <button
            onClick={() => router.push("/gstr-3b")}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive("/gstr-3b")
                ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileCheck className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">GSTR-3B</span>
          </button>

          {/* Credits */}
          <button
            onClick={() => router.push("/credits")}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive("/credits")
                ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Coins className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Credits</span>
          </button>
        </div>
      </nav>
    </>
  );
}
