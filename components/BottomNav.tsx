"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Camera,
  UploadCloud,
  X,
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
            className="absolute inset-0 bg-stone-950/40 backdrop-blur-xs"
            onClick={() => setSheetOpen(false)}
          />

          <div className="relative bg-[#fafaf9] dark:bg-[#161513] rounded-t-2xl p-5 shadow-xl border-t border-black/[0.08] dark:border-white/[0.08] z-10 space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
              <div>
                <h3 className="font-medium text-stone-900 dark:text-stone-100 text-sm">
                  Add invoice or bill
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Extract GSTIN, item lines, and statutory tax breakdown
                </p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Sales Invoice */}
              <div className="p-3 bg-white dark:bg-[#1c1a18] rounded-xl border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-stone-900 dark:text-stone-100">Sales invoice</h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">Scan customer outward bill</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md border border-black/[0.06] dark:border-white/[0.06]"
                    title="Camera capture"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
                    title="Upload file"
                  >
                    <UploadCloud className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Option 2: Purchase Bill */}
              <div className="p-3 bg-white dark:bg-[#1c1a18] rounded-xl border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-stone-900 dark:text-stone-100">Purchase bill</h4>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">Scan vendor bill for ITC claims</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      router.push("/purchases?scan=camera");
                    }}
                    className="p-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-md border border-black/[0.06] dark:border-white/[0.06]"
                    title="Camera capture"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSheetOpen(false);
                      router.push("/purchases?scan=file");
                    }}
                    className="p-1.5 bg-emerald-700 text-white rounded-md hover:bg-emerald-800"
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
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#fafaf9]/95 dark:bg-[#12110f]/95 backdrop-blur-md border-t border-black/[0.08] dark:border-white/[0.08] px-2 pb-safe transition-colors"
      >
        <div className="flex items-center justify-around h-14 relative">
          {/* Dashboard */}
          <button
            onClick={() => router.push("/dashboard")}
            className={`flex flex-col items-center justify-center w-12 h-full transition-colors ${
              isActive("/dashboard")
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] mt-1">Home</span>
          </button>

          {/* Invoices */}
          <button
            onClick={() => router.push("/invoices")}
            className={`flex flex-col items-center justify-center w-12 h-full transition-colors ${
              isActive("/invoices")
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="text-[10px] mt-1">Invoices</span>
          </button>

          {/* Scan Center Button */}
          <div className="relative -top-4 flex flex-col items-center">
            <button
              id="tour-scan-button"
              onClick={() => setSheetOpen(true)}
              aria-label="Scan or upload invoice"
              className="w-12 h-12 rounded-full bg-emerald-700 text-white shadow-sm flex items-center justify-center transition-colors ring-4 ring-[#fafaf9] dark:ring-[#12110f] hover:bg-emerald-800"
            >
              <Camera className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-medium text-stone-600 dark:text-stone-300 mt-1">
              Scan bill
            </span>
          </div>

          {/* Parties */}
          <button
            onClick={() => router.push("/clients")}
            className={`flex flex-col items-center justify-center w-12 h-full transition-colors ${
              isActive("/clients")
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px] mt-1">Parties</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => router.push("/settings")}
            className={`flex flex-col items-center justify-center w-12 h-full transition-colors ${
              isActive("/settings")
                ? "text-emerald-700 dark:text-emerald-400 font-medium"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-[10px] mt-1">Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
}
