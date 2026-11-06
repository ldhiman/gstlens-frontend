"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings,
  Building2,
  CreditCard,
  Hash,
  Printer,
  Download,
  Upload,
  Save,
  CheckCircle,
  FileCheck,
  Shield,
  User,
  Mail,
  ShieldCheck,
  LogOut,
  Trash2,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/header";
import { useAuth } from "@/context/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import { getAPPSettings, saveAppSettings, AppSettings } from "@/lib/settings";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  BusinessProfile,
  InvoiceNumberSettings,
  PrintSettings,
  getBusinessProfile,
  saveBusinessProfile,
  getInvoiceNumberSettings,
  saveInvoiceNumberSettings,
  getPrintSettings,
  savePrintSettings,
  exportAllDataAsBackup,
  importBackupData,
} from "@/lib/storage";
import { INDIAN_STATES } from "@/lib/gstBillingEngine";
import { fetchGSTInfo, GstInfo } from "@/lib/api";
import toast from "react-hot-toast";

function SettingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<
    "account" | "profile" | "bank" | "numbering" | "print" | "backup"
  >("profile");

  const [appSettings, setAppSettings] = useState<AppSettings>(() => getAPPSettings());

  useEffect(() => {
    if (
      tabParam &&
      ["account", "profile", "bank", "numbering", "print", "backup"].includes(tabParam)
    ) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  const updateAppSetting = (key: keyof AppSettings, value: boolean) => {
    const updated = { ...appSettings, [key]: value };
    setAppSettings(updated);
    saveAppSettings(updated);
    toast.success("Preference updated");
  };

  // Profile State
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isFetchingGst, setIsFetchingGst] = useState<boolean>(false);
  const [gstVerified, setGstVerified] = useState<GstInfo | null>(null);

  const handleGstLookup = async (lookupGstin?: string) => {
    const rawGstin = (lookupGstin || profile?.gstin || "").trim().toUpperCase();
    if (rawGstin.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }

    try {
      setIsFetchingGst(true);
      const res = await fetchGSTInfo(rawGstin);
      if (res && res.data) {
        const info = res.data;
        setGstVerified(info);

        const stateObj = INDIAN_STATES.find(
          (s) =>
            s.code === info.state_code ||
            s.name.toLowerCase() === (info.state || "").toLowerCase()
        );

        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            gstin: rawGstin,
            businessName: info.legal_name || prev.businessName,
            tradeName: info.trade_name || info.legal_name || prev.tradeName,
            pan: info.pan_number || rawGstin.slice(2, 12),
            address: info.address || prev.address,
            city: info.city || prev.city,
            pincode: info.pincode || prev.pincode,
            state: stateObj ? stateObj.name : info.state || prev.state,
            stateCode: stateObj ? stateObj.code : info.state_code || prev.stateCode,
          };
        });

        toast.success(
          `Verified: ${info.trade_name || info.legal_name} (${info.status || "Active"})`
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch details from GST portal");
    } finally {
      setIsFetchingGst(false);
    }
  };

  // Numbering Settings State
  const [invSettings, setInvSettings] = useState<InvoiceNumberSettings | null>(null);

  // Print Settings State
  const [printSettings, setPrintSettings] = useState<PrintSettings | null>(null);

  const loadData = async () => {
    try {
      const [prof, nums, prnt] = await Promise.all([
        getBusinessProfile(),
        getInvoiceNumberSettings(),
        getPrintSettings(),
      ]);
      setProfile(prof);
      setInvSettings(nums);
      setPrintSettings(prnt);
    } catch (err: any) {
      toast.error("Failed to load settings: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      await saveBusinessProfile(profile);
      toast.success("Business profile saved successfully!");
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    }
  };

  const handleSaveNumbering = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invSettings) return;
    try {
      await saveInvoiceNumberSettings(invSettings);
      toast.success("Invoice numbering series saved!");
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    }
  };

  const handleSavePrint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!printSettings) return;
    try {
      await savePrintSettings(printSettings);
      toast.success("Print & Invoice styling saved!");
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    }
  };

  const handleBackupExport = async () => {
    try {
      const json = await exportAllDataAsBackup();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GSTLens_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported complete offline data backup");
    } catch (err: any) {
      toast.error("Backup export failed: " + err.message);
    }
  };

  const handleBackupImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const res = await importBackupData(text);
        toast.success(`Successfully restored ${res.count} records!`);
        loadData();
      } catch (err: any) {
        toast.error("Restore failed: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  if (!profile || !invSettings || !printSettings) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-16">
      <Header />

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              Settings & Customization
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure your business details, bank credentials, numbering series, and print templates.
            </p>
          </div>
        </div>

        {/* Setting Tabs */}
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab("account")}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === "account"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            User Account
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === "profile"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Business Profile
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === "bank"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Bank & UPI QR
          </button>
          <button
            onClick={() => setActiveTab("numbering")}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === "numbering"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Invoice Numbering
          </button>
          <button
            onClick={() => setActiveTab("print")}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === "print"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Print Designer
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === "backup"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Data Backup & Restore
          </button>
        </div>

        {/* TAB: User Account & Preferences */}
        {activeTab === "account" && (
          <div className="space-y-6">
            {/* Account Info Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Google Account & Session Identity
              </h3>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                <UserAvatar user={user || { displayName: "Local Offline User", email: "local@gstlens.offline" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                      {user?.displayName || "Offline Workspace User"}
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck className="w-3.5 h-3.5" /> {user?.isOffline ? "Offline Session" : "Google Verified"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {user?.email || "Local offline session"}
                  </p>
                </div>
              </div>
            </div>

            {/* App Preferences & Automation */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Automation & Filing Preferences
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Auto-Save Invoice Drafts</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Automatically persist invoice drafts locally as you enter items
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={appSettings.autoSave}
                    onChange={(e) => updateAppSetting("autoSave", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">GST Return Filing Alerts</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Receive alerts for GSTR-1 (11th) and GSTR-3B (20th) statutory due dates
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={appSettings.notificationsEnabled}
                    onChange={(e) => updateAppSetting("notificationsEnabled", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Actions: Clear Cache & Sign Out */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 text-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                Session & Storage Maintenance
              </h3>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("gstlens_draft_cache");
                    toast.success("Local temporary cache cleared");
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                  Clear Temporary Local Cache
                </button>

                <button
                  type="button"
                  onClick={() => signOut(auth)}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out of Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Business Profile */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Company Legal Particulars
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={profile.businessName}
                  onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Trade Name / Brand Name
                </label>
                <input
                  type="text"
                  value={profile.tradeName || ""}
                  onChange={(e) => setProfile({ ...profile, tradeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    GSTIN *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGstLookup()}
                    disabled={isFetchingGst || !profile.gstin || profile.gstin.length < 15}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
                  >
                    {isFetchingGst ? (
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Fetching Details...
                      </span>
                    ) : (
                      "Auto-Fill from GST Portal"
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="e.g. 27AABCU9603R1ZM"
                  value={profile.gstin || ""}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                    setProfile({ ...profile, gstin: val });
                    if (val.length === 15) {
                      handleGstLookup(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                {gstVerified && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 shrink-0" />
                    GST Portal Status: {gstVerified.status || "Active"} ({gstVerified.constitution || "Registered Taxpayer"})
                  </p>
                )}
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  PAN (Income Tax Permanent Account Number)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. AABCU9603R"
                  value={profile.pan || ""}
                  onChange={(e) => setProfile({ ...profile, pan: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  State / Jurisdiction
                </label>
                <select
                  value={profile.state || "Maharashtra"}
                  onChange={(e) => {
                    const st = INDIAN_STATES.find((s) => s.name === e.target.value);
                    setProfile({ ...profile, state: e.target.value, stateCode: st ? st.code : "27" });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={profile.pincode || ""}
                  onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Full Registered Address
              </label>
              <textarea
                rows={2}
                value={profile.address || ""}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
              >
                <Save className="w-4 h-4" />
                Save Business Profile
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: Bank & UPI */}
        {activeTab === "bank" && (
          <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Settlement Bank Account & Dynamic UPI QR
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  value={profile.bankName || ""}
                  onChange={(e) => setProfile({ ...profile, bankName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  placeholder="50200012345678"
                  value={profile.accountNumber || ""}
                  onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="HDFC0000123"
                  value={profile.ifsc || ""}
                  onChange={(e) => setProfile({ ...profile, ifsc: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  UPI VPA / UPI ID (For Instant Bill Payments)
                </label>
                <input
                  type="text"
                  placeholder="yourname@okaxis or business@hdfcbank"
                  value={profile.upiId || ""}
                  onChange={(e) => setProfile({ ...profile, upiId: e.target.value.trim() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-blue-600"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
              >
                <Save className="w-4 h-4" />
                Save Bank Details
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Invoice Numbering */}
        {activeTab === "numbering" && (
          <form onSubmit={handleSaveNumbering} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-600" />
              Automated Document Numbering Series
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Prefix (Brand Token)
                </label>
                <input
                  type="text"
                  placeholder="INV"
                  value={invSettings.brandPrefix}
                  onChange={(e) => setInvSettings({ ...invSettings, brandPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Separator
                </label>
                <select
                  value={invSettings.separator}
                  onChange={(e) => setInvSettings({ ...invSettings, separator: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="/">Slash ( / )</option>
                  <option value="-">Hyphen ( - )</option>
                  <option value="#">Hash ( # )</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Zero Padding Digits
                </label>
                <input
                  type="number"
                  min="2"
                  max="8"
                  value={invSettings.padDigits}
                  onChange={(e) => setInvSettings({ ...invSettings, padDigits: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={invSettings.showFinYear}
                  onChange={(e) => setInvSettings({ ...invSettings, showFinYear: e.target.checked })}
                  className="rounded text-blue-600"
                />
                Include Indian Financial Year token (e.g. 2026-27)
              </label>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <span className="text-[11px] text-slate-400 block font-semibold uppercase">
                Sample Generated Number Format:
              </span>
              <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 mt-0.5 block">
                {invSettings.brandPrefix}{invSettings.separator}{invSettings.showFinYear ? "2026-27" + invSettings.separator : ""}{"1".padStart(invSettings.padDigits, "0")}
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
              >
                <Save className="w-4 h-4" />
                Save Numbering Series
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: Print Settings */}
        {activeTab === "print" && (
          <form onSubmit={handleSavePrint} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-600" />
              Default Invoice Template & Print Styling
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Layout Template
                </label>
                <select
                  value={printSettings.template}
                  onChange={(e) => setPrintSettings({ ...printSettings, template: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="modern">Modern (Accent banners & clean typography)</option>
                  <option value="classic">Classic (Traditional boxed Indian GST format)</option>
                  <option value="minimalist">Minimalist (Monochrome clean lines)</option>
                  <option value="compact">Compact (High density 1-page)</option>
                  <option value="thermal">Thermal POS (80mm narrow slip)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Brand Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={printSettings.colorTheme}
                    onChange={(e) => setPrintSettings({ ...printSettings, colorTheme: e.target.value })}
                    className="w-10 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={printSettings.colorTheme}
                    onChange={(e) => setPrintSettings({ ...printSettings, colorTheme: e.target.value })}
                    className="w-28 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Custom Invoice Footer Note
              </label>
              <input
                type="text"
                value={printSettings.footerNote}
                onChange={(e) => setPrintSettings({ ...printSettings, footerNote: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
              >
                <Save className="w-4 h-4" />
                Save Print Settings
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: Backup & Restore */}
        {activeTab === "backup" && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              Granular Data Backup & Restore
            </h3>
            <p className="text-slate-500">
              Export your entire GST database (invoices, client directory, inventory, purchases, and settings) as a portable JSON file, or restore an existing backup.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Download Backup</h4>
                <p className="text-slate-500 text-[11px]">
                  Exports all invoices, products, clients, expenses, and returns to a secured JSON archive.
                </p>
                <button
                  onClick={handleBackupExport}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition"
                >
                  <Download className="w-4 h-4" />
                  Export Full Backup (.json)
                </button>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">Restore From Backup</h4>
                <p className="text-slate-500 text-[11px]">
                  Select a previously exported GSTLens backup JSON file to restore your workspace.
                </p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  Select Backup File
                  <input type="file" accept=".json" onChange={handleBackupImport} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
