"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  QrCode,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { adminLogin, fetchAdminSetup, verifyAdminSession } from "@/lib/adminApi";

export default function AdminLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup QR code state
  const [showSetup, setShowSetup] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    provisioning_uri: string;
    instructions: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    async function checkExisting() {
      const isValid = await verifyAdminSession();
      if (isValid) {
        router.push("/admin");
      }
    }
    checkExisting();
  }, [router]);

  // Handle Login
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the admin master password");
      return;
    }
    if (!totpCode.trim() || totpCode.trim().length !== 6) {
      setError("Please enter the 6-digit Authenticator code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminLogin(password.trim(), totpCode.trim());
      router.push("/admin");
    } catch (err: any) {
      setError(err.message || "Authentication failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  }

  // Load 2FA Setup QR Code
  async function handleLoadSetup() {
    if (!password.trim()) {
      setError("Enter the admin password first to reveal 2FA setup");
      return;
    }

    setSetupLoading(true);
    setError(null);

    try {
      const data = await fetchAdminSetup(password.trim());
      setSetupData(data);
      const url = await QRCode.toDataURL(data.provisioning_uri, {
        width: 220,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      });
      setQrDataUrl(url);
      setShowSetup(true);
    } catch (err: any) {
      setError(err.message || "Unable to load 2FA setup. Check password.");
    } finally {
      setSetupLoading(false);
    }
  }

  function handleCopySecret() {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            GSTLens Admin
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Two-Factor Authenticator Protected Access
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-8 max-w-sm w-full">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Master Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Admin Master Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            {/* TOTP 6-Digit Code */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Authenticator Code
                </label>
                <button
                  type="button"
                  onClick={handleLoadSetup}
                  disabled={setupLoading}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <QrCode className="w-3 h-3" />
                  <span>{setupLoading ? "Loading..." : "Setup 2FA"}</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setTotpCode(clean);
                  }}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono text-base tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Enter code from Google or Microsoft Authenticator
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 2FA Setup Drawer / Modal */}
          {showSetup && (
            <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Scan with Authenticator
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Close
                </button>
              </div>

              {qrDataUrl && (
                <div className="flex flex-col items-center p-3 bg-white rounded-xl border border-slate-200 mb-3">
                  <img
                    src={qrDataUrl}
                    alt="Authenticator QR Code"
                    className="w-40 h-40 object-contain"
                  />
                  <p className="text-[11px] text-slate-600 mt-1.5 text-center">
                    Scan in your authenticator app
                  </p>
                </div>
              )}

              {setupData?.secret && (
                <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-1 uppercase">
                    Manual Key
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs text-slate-900 dark:text-slate-100">
                    <span className="truncate">{setupData.secret}</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline ml-2 px-1.5 py-0.5"
                    >
                      {copiedSecret ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back Link */}
        <div className="text-center mt-5">
          <a
            href="/dashboard"
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            ← Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
