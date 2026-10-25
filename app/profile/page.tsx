"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Mail,
  ShieldCheck,
  Building2,
  LogOut,
  Download,
  Trash2,
  Settings,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Copy,
} from "lucide-react";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { getAPPSettings, saveAppSettings } from "@/lib/settings";
import { auth } from "@/lib/firebase";
import {
  fetchGSTInfo,
  saveGSTINBackend,
  updateSettingsBackend,
} from "@/lib/api";
import UserAvatar from "@/components/UserAvatar";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ---------------- Utils ---------------- */
function isValidGSTIN(gstin: string) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
}

/* ---------------- Page ---------------- */
function ProfileContent() {
  const { user, userProfile, loading } = useAuth();

  const searchParams = useSearchParams();
  const require = searchParams.get("require");
  const setup = searchParams.get("setup");

  // One-time toasts from URL params
  useEffect(() => {
    if (setup === "1") {
      toast("Please complete your profile setup", { icon: "ℹ️" });
    }
    if (require && require.length > 0) {
      toast(`Required: ${require}`, { icon: "⚠️" });
    }
  }, [setup, require]); // Only runs once on mount if params exist

  const [gstin, setGstin] = useState("");
  const [gstInfo, setGstInfo] = useState<any>(null);
  const [fetching, setFetching] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedGstin, setCopiedGstin] = useState(false);
  const [settings, setSettings] = useState(getAPPSettings());

  const router = useRouter();

  const copyGstin = () => {
    if (!gstin) return;
    navigator.clipboard.writeText(gstin);
    setCopiedGstin(true);
    setTimeout(() => setCopiedGstin(false), 1800);
  };

  // Track if we already showed toast for current gstin
  const toastShownForGstin = useRef<string>("");

  /* ---------------- Sync Settings & Initial Data ---------------- */
  useEffect(() => {
    if (!userProfile?.settings) return;
    const merged = { ...settings, ...userProfile.settings };
    setSettings(merged);
    saveAppSettings(merged);
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.primary_gstin) setGstin(userProfile.primary_gstin);
    if (userProfile.gst_info) setGstInfo(userProfile.gst_info);
  }, [userProfile]);

  /* ---------------- Auto-fetch GST Info ---------------- */
  useEffect(() => {
    if (gstin.length !== 15) {
      setGstInfo(null);
      setError("");
      setFetching(false);
      toastShownForGstin.current = ""; // Reset toast flag
      return;
    }

    const formatted = gstin.toUpperCase().trim();
    if (!isValidGSTIN(formatted)) return;

    // Don't show toasts if this is the already-saved GSTIN
    const isSavedGstin = gstin === userProfile?.primary_gstin;

    const fetchData = async () => {
      try {
        setFetching(true);
        setError("");

        const res = await fetchGSTInfo(formatted);

        if (res.data != null && res.data.trade_name === null) {
          throw new Error("GST details not found for the provided GSTIN.");
        }

        setGstInfo(res.data);

        // Only show success toast once, and only for new/changed GSTIN
        if (!isSavedGstin && toastShownForGstin.current !== formatted) {
          toast.success("GST details fetched successfully!");
          toastShownForGstin.current = formatted;
        }
      } catch (e: any) {
        setGstInfo(null);
        setError(e.message || "Failed to fetch GST details.");

        if (!isSavedGstin && toastShownForGstin.current !== formatted) {
          toast.error(e.message || "Invalid or inactive GSTIN");
          toastShownForGstin.current = formatted;
        }
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [gstin, userProfile]);

  /* ---------------- Manual Verify ---------------- */
  async function verifyGSTIN() {
    const formatted = gstin.toUpperCase().trim();
    setError("");

    if (!isValidGSTIN(formatted)) {
      toast.error("Invalid GSTIN format");
      setError("Invalid GSTIN format. Expected: 22AAAAA0000A1Z5");
      return;
    }

    try {
      setVerifying(true);
      const res = await fetchGSTInfo(formatted);
      setGstInfo(res.data);
      toast.success("GSTIN verified successfully!");
    } catch (e: any) {
      setError(e.message || "Failed to verify GSTIN.");
      toast.error(e.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  /* ---------------- Save GSTIN ---------------- */
  async function saveGSTIN() {
    if (!user || !gstInfo) return;

    try {
      setSaving(true);
      await saveGSTINBackend(gstin);
      toast.success("GSTIN saved successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save GSTIN");
      setError(e.message || "Failed to save GSTIN");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- Update Setting ---------------- */
  async function updateSetting(key: keyof typeof settings, value: boolean) {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveAppSettings(updated);

    try {
      await updateSettingsBackend(getAPPSettings());
    } catch {
      toast.error("Failed to sync setting");
    }
  }

  useEffect(() => {
    // Auth check finished & user not logged in
    if (!loading && !user) {
      router.replace("/login"); // or /login
    }
  }, [loading, user, router]);

  /* ---------------- Loading Guard ---------------- */
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24 md:pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition flex items-center gap-1.5 font-medium text-xs sm:text-sm"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">Profile & Business Settings</h1>
            </div>
          </div>

          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Account Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
            <UserAvatar user={user} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {user.displayName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Google Verified
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 truncate">
                <Mail className="w-4 h-4 flex-shrink-0" />
                {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Business Information Card */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Primary Business GSTIN
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Used as seller identification in your GSTR-1 and GSTR-3B filings
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                15-Digit GST Identification Number
              </label>
              <input
                value={gstin}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setGstin(value);
                  if (value.length < 15) {
                    setGstInfo(null);
                    setError("");
                    toastShownForGstin.current = "";
                  }
                }}
                maxLength={15}
                placeholder="e.g. 07AAACU4747P1ZR"
                className="w-full px-4 py-3.5 pr-12 text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all text-base sm:text-lg uppercase font-mono tracking-wider outline-none"
              />
              {fetching && (
                <Loader2 className="absolute right-4 top-10 w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
              )}
            </div>

            {/* Verified Badge */}
            {userProfile?.gst_verified && gstin === userProfile.primary_gstin && (
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>GSTIN Verified & Saved as Primary Business</span>
                </div>
                <button
                  onClick={copyGstin}
                  className="flex items-center gap-1 text-[11px] text-emerald-800 dark:text-emerald-300 hover:underline"
                >
                  <Copy className="w-3 h-3" /> {copiedGstin ? "Copied" : "Copy"}
                </button>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 px-4 py-3 rounded-2xl text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Live GST Details Card */}
            {gstInfo && (() => {
              const isGSTActive =
                Boolean(gstInfo?.status) &&
                gstInfo.status.toLowerCase() === "active" &&
                gstInfo.trade_name !== "N/A" &&
                gstInfo.legal_name !== "N/A";

              return (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/50">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      GST Portal Registration Status
                    </p>
                    {isGSTActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-full text-xs font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Taxpayer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-full text-xs font-bold">
                        <AlertCircle className="w-3 h-3 text-rose-600" /> {gstInfo.status || "Inactive"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Trade Name</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                        {gstInfo.trade_name && gstInfo.trade_name !== "N/A" ? gstInfo.trade_name : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Legal Business Name</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                        {gstInfo.legal_name && gstInfo.legal_name !== "N/A" ? gstInfo.legal_name : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">State / Jurisdiction</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                        {gstInfo.state || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">PAN Number</p>
                      <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {gstInfo.pan_number || "—"}
                      </p>
                    </div>
                  </div>

                  {!isGSTActive && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                      <p>
                        This GSTIN could not be verified on the official GST portal or is inactive. Only active GSTINs can be saved as your primary business number.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={saveGSTIN}
                    disabled={saving || !isGSTActive || gstin === userProfile?.primary_gstin}
                    className="w-full mt-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {saving ? "Saving..." : gstin === userProfile?.primary_gstin ? "Current Primary GSTIN" : "Save as Primary Business GSTIN"}
                  </button>
                </div>
              );
            })()}

            {/* Manual Verify Trigger */}
            {!gstInfo && !fetching && gstin.length === 15 && !userProfile?.gst_verified && (
              <button
                onClick={verifyGSTIN}
                disabled={verifying}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 active:scale-98 transition disabled:opacity-70 min-h-[44px]"
              >
                {verifying ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Verify GSTIN on Portal"
                )}
              </button>
            )}
          </div>
        </div>

        {/* Preferences & System Settings */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Automation & Preferences
            </h3>
          </div>

          <div className="space-y-4">
            <ToggleRow
              label="Auto-save extracted invoices"
              description="Automatically commit invoice drafts to storage immediately after AI processing"
              enabled={settings.autoSave}
              onChange={(v) => updateSetting("autoSave", v)}
            />
            <ToggleRow
              label="Tax filing deadline reminders"
              description="Receive timely notifications for GSTR-1 (11th) and GSTR-3B (20th) due dates"
              enabled={settings.notificationsEnabled}
              onChange={(v) => updateSetting("notificationsEnabled", v)}
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <button
              onClick={() => toast("Export feature active in GSTR-1 and GSTR-3B pages", { icon: "📊" })}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-98 min-h-[44px] text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Export Return History (JSON / Excel)</span>
              </div>
              <span className="text-[11px] text-slate-400">GSTR-1 & 3B</span>
            </button>

            <button
              onClick={() => {
                if (confirm("Clear local temporary draft cache? Synced cloud data will remain safe.")) {
                  localStorage.removeItem("gstlens_draft_cache");
                  toast.success("Local temporary cache cleared");
                }
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 transition active:scale-98 min-h-[44px] text-xs sm:text-sm font-semibold"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Clear Local Cache</span>
              </div>
              <span className="text-[11px] text-rose-500">Free Space</span>
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut(auth)}
          className="w-full py-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 font-bold hover:bg-rose-100 dark:hover:bg-rose-950/50 active:scale-98 transition-all flex items-center justify-center gap-2.5 shadow-xs min-h-[44px] text-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Account
        </button>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 gap-4">
      <div className="flex-1 pr-2">
        <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">{label}</p>
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</p>
      </div>

      <button
        onClick={() => onChange(!enabled)}
        type="button"
        role="switch"
        aria-checked={enabled}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
          enabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
