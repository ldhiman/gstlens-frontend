"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  CreditCard,
  Zap,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Edit3,
  Calendar,
  DollarSign,
  FileText,
  LogOut,
  RefreshCw,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Building2,
  Check,
  Copy,
  Clock,
} from "lucide-react";
import {
  AdminStats,
  AdminUser,
  CustomSubscriptionPayload,
  fetchAdminStats,
  fetchAdminUsers,
  updateCustomSubscription,
  adjustUserCredits,
  cancelUserSubscription,
  verifyAdminSession,
  removeAdminToken,
} from "@/lib/adminApi";

export default function AdminDashboardPage() {
  const router = useRouter();

  // State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Custom Subscription Form State
  const [subForm, setSubForm] = useState<CustomSubscriptionPayload>({
    plan_name: "Chartered Accountant Suite",
    deal_amount: 2999,
    billing_cycle: "quarterly",
    duration_days: 90,
    active: true,
    unlimited_credits: false,
    bonus_credits: 500,
    cloud_sync_enabled: true,
    notes: "Pitched custom quarterly CA package with priority cloud sync.",
    as_upcoming: false,
  });

  // Credit Adjustment Form State
  const [creditForm, setCreditForm] = useState<{
    amount: number;
    mode: "add" | "set";
    note: string;
  }>({
    amount: 50,
    mode: "add",
    note: "Customer support credit top-up",
  });

  // Initial Auth Check and Data Fetch
  useEffect(() => {
    async function init() {
      const isValid = await verifyAdminSession();
      if (!isValid) {
        router.push("/admin/login");
        return;
      }
      await loadData();
    }
    init();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [statsData, usersData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(searchQuery, filterMode),
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (err: any) {
      if (err.message?.includes("expired") || err.message?.includes("token")) {
        removeAdminToken();
        router.push("/admin/login");
      } else {
        showToast("error", err.message || "Failed to load admin data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Handle Search & Filter trigger
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      try {
        const usersData = await fetchAdminUsers(searchQuery, filterMode);
        setUsers(usersData);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, filterMode]);

  function showToast(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }

  function handleLogout() {
    removeAdminToken();
    router.push("/admin/login");
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedUid(text);
    setTimeout(() => setCopiedUid(null), 1500);
  }

  // Preset Handlers for Subscription Modal
  function applyPreset(
    name: string,
    amount: number,
    cycle: "monthly" | "quarterly" | "annual" | "lifetime" | "custom",
    days: number,
    bonus: number,
    unlimited: boolean,
    notes: string
  ) {
    setSubForm({
      plan_name: name,
      deal_amount: amount,
      billing_cycle: cycle,
      duration_days: days,
      active: true,
      unlimited_credits: unlimited,
      bonus_credits: bonus,
      cloud_sync_enabled: true,
      notes,
    });
  }

  // Open Manage Subscription Modal
  function openSubscriptionModal(user: AdminUser) {
    setSelectedUser(user);
    const existing = user.subscription;
    const isCurrentlyActive = Boolean(
      existing?.active &&
      existing?.current_period_end &&
      existing.current_period_end > Math.floor(Date.now() / 1000)
    );

    if (existing?.is_custom) {
      setSubForm({
        plan_name: existing.plan || "Custom Pitch Deal",
        deal_amount: existing.deal_amount || 0,
        billing_cycle: (existing.billing_cycle as any) || "monthly",
        duration_days: 30,
        active: existing.active ?? true,
        unlimited_credits: existing.unlimited_credits ?? false,
        bonus_credits: 0,
        cloud_sync_enabled: user.cloud_sync_enabled ?? true,
        notes: existing.notes || "",
        as_upcoming: isCurrentlyActive,
      });
    } else {
      // Default initial preset: Chartered Accountant Deal
      applyPreset(
        "CA Enterprise Suite",
        2999,
        "quarterly",
        90,
        500,
        false,
        "Custom pitch negotiated with CA client."
      );
      if (isCurrentlyActive) {
        setSubForm((prev) => ({ ...prev, as_upcoming: true }));
      }
    }
    setIsSubModalOpen(true);
  }

  // Save Custom Subscription
  async function handleSaveSubscription(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await updateCustomSubscription(selectedUser.uid, subForm);
      showToast(
        "success",
        `Custom plan '${subForm.plan_name}' successfully assigned to ${selectedUser.name || selectedUser.email}`
      );
      setIsSubModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to update subscription");
    } finally {
      setActionLoading(false);
    }
  }

  // Cancel / Revoke Subscription
  async function handleCancelSub(user: AdminUser) {
    const hasUpcoming = user.upcoming_subscription?.active;
    const confirmMsg = hasUpcoming
      ? `Revoke active subscription for ${user.name || user.email}?\n\nNOTE: This user has a queued plan ('${user.upcoming_subscription.plan}'). Revoking will automatically promote and activate this queued plan immediately!`
      : `Are you sure you want to revoke the subscription for ${user.name || user.email}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await cancelUserSubscription(user.uid);
      showToast(
        "success",
        res.message || "Subscription updated successfully"
      );
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to cancel subscription");
    }
  }

  // Open Credit Modal
  function openCreditModal(user: AdminUser) {
    setSelectedUser(user);
    setCreditForm({
      amount: 50,
      mode: "add",
      note: "Customer support credit top-up",
    });
    setIsCreditModalOpen(true);
  }

  // Save Credit Adjustment
  async function handleSaveCredits(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const newCredits = await adjustUserCredits(
        selectedUser.uid,
        creditForm.amount,
        creditForm.mode,
        creditForm.note
      );
      showToast(
        "success",
        `Credits for ${selectedUser.name || selectedUser.email} updated to ${newCredits}`
      );
      setIsCreditModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast("error", err.message || "Failed to adjust credits");
    } finally {
      setActionLoading(false);
    }
  }

  // Format timestamp
  function formatPeriodEnd(ts?: number) {
    if (!ts) return "N/A";
    const date = new Date(ts * 1000);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border text-sm animate-slideDown ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/90 border-rose-500/40 text-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white">GSTLens</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-400">
              User &amp; Custom Subscription Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5 border border-slate-700"
            title="Refresh Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleLogout}
            className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 hover:border-slate-600 transition text-xs flex items-center gap-1.5 font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Total Users
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white">
              {stats?.total_users ?? "—"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats?.verified_gstin_count ?? 0} GSTIN-verified
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Active Subscribers
              </span>
              <CreditCard className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {stats?.active_subscriptions ?? "—"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Pro &amp; Custom Deals
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Custom Deals
              </span>
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-300">
              {stats?.custom_subscriptions ?? "—"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Admin Managed
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Platform Credits
              </span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300">
              {stats?.total_platform_credits?.toLocaleString("en-IN") ?? "—"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Total AI scan balances
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email, name, GSTIN, or UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: "all", label: "All Users" },
              { id: "active_sub", label: "Active Pro" },
              { id: "custom_sub", label: "Custom Pitch Deals" },
              { id: "free", label: "Free Tier" },
              { id: "low_credits", label: "Low Credits (≤5)" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterMode === f.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-700/60"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/70 border-b border-slate-700/80 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">User Details</th>
                  <th className="py-3.5 px-4 font-semibold">Business / GSTIN</th>
                  <th className="py-3.5 px-4 font-semibold text-center">
                    Credits
                  </th>
                  <th className="py-3.5 px-4 font-semibold">
                    Subscription Tier
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-center">
                    Cloud Sync
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                        <span>Loading users from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No users found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const sub = user.subscription;
                    const isActive = sub?.active;
                    const isCustom = sub?.is_custom;

                    return (
                      <tr
                        key={user.uid}
                        className="hover:bg-slate-750/50 transition-colors"
                      >
                        {/* User Identity */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-indigo-300 font-bold text-sm overflow-hidden flex-shrink-0">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (user.name || user.email || "U")[0].toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate max-w-[200px]">
                                {user.name || "Unnamed User"}
                              </div>
                              <div className="text-xs text-slate-400 truncate max-w-[220px]">
                                {user.email || "No email"}
                              </div>
                              <button
                                onClick={() => handleCopy(user.uid)}
                                className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 font-mono mt-0.5"
                                title="Click to copy UID"
                              >
                                <span>{user.uid.slice(0, 10)}...</span>
                                {copiedUid === user.uid ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Business / GSTIN */}
                        <td className="py-4 px-4">
                          {user.primary_gstin ? (
                            <div>
                              <div className="font-mono text-xs text-slate-200 font-medium">
                                {user.primary_gstin}
                              </div>
                              {user.gst_verified ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Verified
                                </span>
                              ) : (
                                <span className="text-[11px] text-amber-400">
                                  Unverified
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">
                              Not registered
                            </span>
                          )}
                        </td>

                        {/* Credits */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`font-bold font-mono text-base ${
                                user.credits <= 5
                                  ? "text-rose-400"
                                  : "text-amber-400"
                              }`}
                            >
                              {sub?.unlimited_credits ? "∞" : user.credits}
                            </span>
                            <button
                              onClick={() => openCreditModal(user)}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 mt-0.5 transition-colors"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Top Up</span>
                            </button>
                          </div>
                        </td>

                        {/* Subscription Tier */}
                        <td className="py-4 px-4">
                          <div>
                            {isActive ? (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  {isCustom ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                      <Sparkles className="w-3 h-3" />
                                      {sub?.plan || "Custom Deal"}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      <Award className="w-3 h-3" />
                                      {sub?.plan || "Active Pro"}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                  {sub?.deal_amount ? (
                                    <span className="text-slate-300 font-medium mr-2">
                                      ₹{sub.deal_amount} ({sub.billing_cycle})
                                    </span>
                                  ) : null}
                                  <span>
                                    Valid till:{" "}
                                    {formatPeriodEnd(sub?.current_period_end)}
                                  </span>
                                  {user.upcoming_subscription?.plan && (
                                    <div className="mt-1 flex items-center gap-1">
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 font-medium">
                                        <Clock className="w-2.5 h-2.5" />
                                        Queued: {user.upcoming_subscription.plan}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                  Free Tier
                                </span>
                                {sub?.status === "cancelled" && (
                                  <div className="text-[10px] text-rose-400 mt-0.5">
                                    Cancelled
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Cloud Sync */}
                        <td className="py-4 px-4 text-center">
                          {user.cloud_sync_enabled ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <XCircle className="w-4 h-4" />
                              <span>Disabled</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openSubscriptionModal(user)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Custom Plan</span>
                            </button>

                            {isActive && (
                              <button
                                onClick={() => handleCancelSub(user)}
                                className="px-2.5 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/20 text-xs font-medium transition-all"
                                title="Revoke Subscription"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: MANAGE CUSTOM SUBSCRIPTION                  */}
      {/* ---------------------------------------------------- */}
      {isSubModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Apply Custom Subscription
                  </h3>
                  <p className="text-xs text-slate-400">
                    For: {selectedUser.name || selectedUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Active Subscription Notice */}
            {selectedUser.subscription?.active && (
              <div className="mt-3 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-white">
                    Current Active Plan: {selectedUser.subscription.plan || "Pro"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Valid until: {formatPeriodEnd(selectedUser.subscription.current_period_end)}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active
                </span>
              </div>
            )}

            {/* Presets Chips */}
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Quick Pitch Presets:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset(
                      "SMB Pro Monthly",
                      499,
                      "monthly",
                      30,
                      100,
                      false,
                      "Standard SMB Pro monthly subscription."
                    )
                  }
                  className="p-2.5 text-left bg-slate-800/80 border border-slate-700 hover:border-slate-500 rounded-xl text-xs transition"
                >
                  <div className="font-semibold text-white">SMB Pro</div>
                  <div className="text-[10px] text-slate-400">₹499 / 30d</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPreset(
                      "CA Quarterly Special",
                      1499,
                      "quarterly",
                      90,
                      500,
                      false,
                      "Chartered Accountant quarterly package."
                    )
                  }
                  className="p-2.5 text-left bg-slate-800/80 border border-slate-700 hover:border-slate-500 rounded-xl text-xs transition"
                >
                  <div className="font-semibold text-indigo-300">CA Quarterly</div>
                  <div className="text-[10px] text-slate-400">₹1,499 / 90d</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPreset(
                      "Chartered Accountant Annual",
                      4999,
                      "annual",
                      365,
                      2500,
                      false,
                      "Annual CA Partner plan with 2,500 scans."
                    )
                  }
                  className="p-2.5 text-left bg-slate-800/80 border border-slate-700 hover:border-slate-500 rounded-xl text-xs transition"
                >
                  <div className="font-semibold text-emerald-300">CA Annual</div>
                  <div className="text-[10px] text-slate-400">₹4,999 / 365d</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPreset(
                      "Enterprise Unlimited",
                      9999,
                      "annual",
                      365,
                      0,
                      true,
                      "Full enterprise tier with unlimited scans."
                    )
                  }
                  className="p-2.5 text-left bg-slate-800/80 border border-slate-700 hover:border-slate-500 rounded-xl text-xs transition"
                >
                  <div className="font-semibold text-amber-300">Unlimited</div>
                  <div className="text-[10px] text-slate-400">₹9,999 / 365d</div>
                </button>
              </div>
            </div>

            {/* Custom Subscription Form */}
            <form onSubmit={handleSaveSubscription} className="mt-5 space-y-4">
              {/* Plan Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom Plan Name:
                </label>
                <input
                  type="text"
                  value={subForm.plan_name}
                  onChange={(e) =>
                    setSubForm({ ...subForm, plan_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              {/* Deal Amount & Billing Cycle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Agreed Deal Price (₹):
                  </label>
                  <input
                    type="number"
                    value={subForm.deal_amount}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        deal_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Billing Cycle:
                  </label>
                  <select
                    value={subForm.billing_cycle}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        billing_cycle: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="lifetime">Lifetime / Multi-Year</option>
                    <option value="custom">Custom Deal</option>
                  </select>
                </div>
              </div>

              {/* Validity Days & Bonus Credits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration (Days from Today):
                  </label>
                  <input
                    type="number"
                    value={subForm.duration_days}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        duration_days: parseInt(e.target.value) || 30,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bonus Credits to Grant:
                  </label>
                  <input
                    type="number"
                    value={subForm.bonus_credits}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        bonus_credits: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    min={0}
                  />
                </div>
              </div>

              {/* Switches */}
              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-200 font-medium">
                    Activate Pro Status &amp; Cloud Sync
                  </span>
                  <input
                    type="checkbox"
                    checked={subForm.active}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        active: e.target.checked,
                        cloud_sync_enabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-200 font-medium">
                    Unlimited AI Invoice Scans (Bypass Deductions)
                  </span>
                  <input
                    type="checkbox"
                    checked={subForm.unlimited_credits}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        unlimited_credits: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-700">
                  <div>
                    <span className="text-xs text-indigo-300 font-semibold block">
                      Queue as Upcoming Plan (as_upcoming)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {selectedUser.subscription?.current_period_end
                        ? `Schedules this plan to begin automatically when current cycle ends on ${formatPeriodEnd(selectedUser.subscription.current_period_end)}`
                        : "Schedules this plan to activate after current cycle ends"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(subForm.as_upcoming)}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        as_upcoming: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              </div>

              {/* Pitch Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Sales Pitch / Negotiation Notes:
                </label>
                <textarea
                  value={subForm.notes}
                  onChange={(e) =>
                    setSubForm({ ...subForm, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="e.g., Client requested quarterly discount. Promised priority email support."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Plan...</span>
                    </>
                  ) : (
                    <span>Save &amp; Apply Custom Plan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: ADJUST CREDITS                              */}
      {/* ---------------------------------------------------- */}
      {isCreditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Adjust AI Scan Credits
                </h3>
              </div>
              <button
                onClick={() => setIsCreditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="my-3 p-3 bg-slate-800 rounded-xl text-xs flex justify-between items-center">
              <span className="text-slate-400">Current Balance:</span>
              <span className="text-amber-400 font-mono font-bold text-sm">
                {selectedUser.credits} Credits
              </span>
            </div>

            <form onSubmit={handleSaveCredits} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adjustment Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreditForm({ ...creditForm, mode: "add" })}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                      creditForm.mode === "add"
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    + Add to Current
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditForm({ ...creditForm, mode: "set" })}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                      creditForm.mode === "set"
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    = Set Exact Total
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Credit Amount:
                </label>
                <input
                  type="number"
                  value={creditForm.amount}
                  onChange={(e) =>
                    setCreditForm({
                      ...creditForm,
                      amount: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason / Audit Note:
                </label>
                <input
                  type="text"
                  value={creditForm.note}
                  onChange={(e) =>
                    setCreditForm({ ...creditForm, note: e.target.value })
                  }
                  placeholder="e.g. Free top-up for demo feedback"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Confirm Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
