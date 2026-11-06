"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Settings,
  Camera,
  UploadCloud,
  X,
  Sparkles,
  ShoppingCart,
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

      if (pathname !== "/dashboard" && pathname !== "/invoices") {
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

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Sales Invoice */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Sales Invoice</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Scan customer outward bill</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-2 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
                    title="Camera capture"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs hover:bg-indigo-700 active:scale-95 transition"
                    title="Upload file"
                  >
                    <UploadCloud className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Option 2: Purchase Bill */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Purchase Bill</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Scan vendor bill for ITC</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      router.push("/purchases?scan=camera");
                    }}
                    className="p-2 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
                    title="Camera capture"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      router.push("/purchases?scan=file");
                    }}
                    className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs hover:bg-emerald-700 active:scale-95 transition"
                    title="Upload file"
                  >
                    <UploadCloud className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </button>

          {/* Invoices */}
          <button
            onClick={() => router.push("/invoices")}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive("/invoices")
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Invoices</span>
          </button>

          {/* Scan Center Button */}
          <div className="relative -top-5 flex flex-col items-center">
            <button
              id="tour-scan-button"
              onClick={() => setSheetOpen(true)}
              aria-label="Scan or Upload Invoice"
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all ring-4 ring-white dark:ring-slate-950"
            >
              <Camera className="w-6 h-6" />
            </button>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">
              AI Scan
            </span>
          </div>

          {/* Parties */}
          <button
            onClick={() => router.push("/clients")}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive("/clients")
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileCheck className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Parties</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push("/settings")}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${
              isActive("/settings")
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
}
