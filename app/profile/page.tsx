"use client";

import { useEffect, useState, useRef } from "react"; // ← Added useRef
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
  ArrowLeftCircleIcon,
} from "lucide-react";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { getAPPSettings, saveAppSettings } from "@/lib/settings";
import { auth, db } from "@/lib/firebase";
import {
  fetchGSTInfo,
  saveGSTINBackend,
  updateSettingsBackend,
} from "@/lib/api";
import UserAvatar from "@/components/UserAvatar";
import { useRouter, useSearchParams } from "next/navigation";
import { get } from "http";

/* ---------------- Utils ---------------- */
function isValidGSTIN(gstin: string) {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
}

/* ---------------- Page ---------------- */
export default function ProfilePage() {
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
  const [settings, setSettings] = useState(getAPPSettings());

  const router = useRouter();

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <a href="/dashboard">
            <ArrowLeftCircleIcon className="w-7 h-7 text-indigo-800" />
          </a>
          <Settings className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Account Card */}
        <div className="rounded-3xl bg-white/90 shadow-xl backdrop-blur-xl border border-white/50 p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <UserAvatar user={user} />
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {user.displayName}
              </h2>
              <p className="text-lg text-gray-600 flex items-center gap-2 mt-1">
                <Mail className="w-5 h-5" />
                {user.email}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold">
                <ShieldCheck className="w-5 h-5" />
                Verified with Google
              </div>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="rounded-3xl bg-white/90 shadow-xl backdrop-blur-xl border border-white/50 p-8 space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Business Information
          </h3>

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary GSTIN
              </label>
              <input
                value={gstin}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setGstin(value);
                  if (value.length < 15) {
                    setGstInfo(null);
                    setError("");
                    toastShownForGstin.current = ""; // Reset when typing new
                  }
                }}
                maxLength={15}
                placeholder="22AAAAA0000A1Z5"
                className="w-full px-5 py-4 pr-12 text-black rounded-2xl border border-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-lg uppercase font-mono tracking-wider"
              />
              {fetching && (
                <Loader2 className="absolute right-4 top-12 w-5 h-5 animate-spin text-indigo-600" />
              )}
            </div>

            {/* Verified Badge */}
            {userProfile?.gst_verified &&
              gstin === userProfile.primary_gstin && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-5 py-3 rounded-2xl">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-medium">GSTIN Verified & Saved</span>
                </div>
              )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 text-red-600 bg-red-50 px-5 py-4 rounded-2xl">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* GST Details */}
            {gstInfo && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 space-y-4">
                <p className="text-sm font-medium text-indigo-700">
                  GST Details Found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow
                    label="Trade Name"
                    value={gstInfo.trade_name || "—"}
                  />
                  <InfoRow
                    label="Legal Name"
                    value={gstInfo.legal_name || "—"}
                  />
                  <InfoRow label="State" value={gstInfo.state || "—"} />
                  <InfoRow
                    label="Status"
                    value={
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        {gstInfo.status || "Active"}
                      </span>
                    }
                  />
                </div>

                <button
                  onClick={saveGSTIN}
                  disabled={saving || gstin === userProfile?.primary_gstin}
                  className="w-full mt-4 py-4 rounded-2xl bg-green-600 text-white font-bold text-lg shadow-lg hover:shadow-xl active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save GSTIN to Profile"}
                </button>
              </div>
            )}

            {/* Manual Verify */}
            {!gstInfo &&
              !fetching &&
              gstin.length === 15 &&
              !userProfile?.gst_verified && (
                <button
                  onClick={verifyGSTIN}
                  disabled={verifying}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg shadow-lg hover:shadow-xl active:scale-98 transition-all disabled:opacity-70"
                >
                  {verifying ? (
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  ) : (
                    "Verify GSTIN"
                  )}
                </button>
              )}
          </div>
        </div>

        {/* Preferences & Actions */}
        <div className="rounded-3xl bg-white/90 shadow-xl backdrop-blur-xl border border-white/50 p-8 space-y-6">
          <h3 className="text-xl font-semibold text-gray-900">Preferences</h3>

          <div className="space-y-5">
            <ToggleRow
              label="Auto-save invoices"
              description="Automatically save invoices after upload"
              enabled={settings.autoSave}
              onChange={(v) => updateSetting("autoSave", v)}
            />
            <ToggleRow
              label="Notifications"
              description="Receive GST filing reminders and alerts"
              enabled={settings.notificationsEnabled}
              onChange={(v) => updateSetting("notificationsEnabled", v)}
            />
          </div>

          <div className="pt-6 border-t border-gray-200 space-y-3">
            <ActionButton
              icon={<Download className="w-5 h-5" />}
              label="Export all data"
            />
            <ActionButton
              icon={<Trash2 className="w-5 h-5" />}
              label="Clear local cache"
              danger
            />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut(auth)}
          className="w-full py-5 rounded-3xl bg-red-50/80 text-red-600 font-bold text-lg hover:bg-red-100 active:scale-98 transition-all flex items-center justify-center gap-3 shadow-lg"
        >
          <LogOut className="w-6 h-6" />
          Sign Out
        </button>
      </main>
    </div>
  );
}

/* ---------------- Reusable Components ---------------- */
function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all active:scale-98 ${
        danger
          ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
          : "bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200"
      }`}
    >
      {icon}
      <span className="font-medium text-lg">{label}</span>
    </button>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
  badge,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-3">
          <p className="font-medium text-gray-900 text-lg">{label}</p>
          {badge && (
            <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
          enabled
            ? "bg-gradient-to-r from-indigo-500 to-purple-600"
            : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
            enabled ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
