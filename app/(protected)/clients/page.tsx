"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Trash2,
  FileText,
  DollarSign,
  X,
  ExternalLink,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  Client,
  getAllClients,
  saveClient,
  deleteClient,
  getAllInvoices,
  StoredInvoice,
} from "@/lib/storage";
import {
  INDIAN_STATES,
  formatINR,
  getStateCodeFromGSTIN,
} from "@/lib/gstBillingEngine";
import { fetchGSTInfo, GstInfo } from "@/lib/api";
import toast from "react-hot-toast";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form states
  const [name, setName] = useState<string>("");
  const [tradeName, setTradeName] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [pan, setPan] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [state, setState] = useState<string>("Maharashtra");
  const [pincode, setPincode] = useState<string>("");
  const [clientType, setClientType] = useState<"customer" | "vendor" | "both">("customer");
  const [isSEZ, setIsSEZ] = useState<boolean>(false);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isFetchingGst, setIsFetchingGst] = useState<boolean>(false);
  const [gstStatus, setGstStatus] = useState<string | null>(null);

  const handleGstLookup = async (lookupGstin?: string) => {
    const clean = (lookupGstin || gstin).trim().toUpperCase();
    if (clean.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }
    setIsFetchingGst(true);
    try {
      const res = await fetchGSTInfo(clean);
      if (res && res.data) {
        const info = res.data;
        setName(info.legal_name || info.trade_name || name);
        if (info.trade_name) setTradeName(info.trade_name);
        setPan(info.pan_number || clean.slice(2, 12));
        if (info.address) setAddress(info.address);
        if (info.city) setCity(info.city);
        if (info.pincode) setPincode(info.pincode);
        if (info.state) {
          const stateObj = INDIAN_STATES.find(
            (s) =>
              s.code === info.state_code ||
              s.name.toLowerCase() === (info.state || "").toLowerCase()
          );
          if (stateObj) setState(stateObj.name);
        }
        setGstStatus(
          `${info.status || "Active"} • ${info.constitution || "Registered Taxpayer"}`
        );
        toast.success(`Party verified: ${info.trade_name || info.legal_name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch details from GST portal");
    } finally {
      setIsFetchingGst(false);
    }
  };

  const loadData = async () => {
    try {
      const [cls, invs] = await Promise.all([getAllClients(), getAllInvoices()]);
      setClients(cls);
      setInvoices(invs);
    } catch (err: any) {
      toast.error("Failed to load clients: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingClient(null);
    setName("");
    setTradeName("");
    setGstin("");
    setPan("");
    setPhone("");
    setEmail("");
    setAddress("");
    setCity("");
    setState("Maharashtra");
    setPincode("");
    setClientType("customer");
    setIsSEZ(false);
    setOpeningBalance(0);
    setGstStatus(null);
    setIsFetchingGst(false);
    setShowModal(true);
  };

  const openEditModal = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setTradeName(c.tradeName || "");
    setGstin(c.gstin || "");
    setPan(c.pan || "");
    setPhone(c.phone || "");
    setEmail(c.email || "");
    setAddress(c.address || "");
    setCity(c.city || "");
    setState(c.state || "Maharashtra");
    setPincode(c.pincode || "");
    setClientType(c.type || "customer");
    setIsSEZ(c.isSEZ || false);
    setOpeningBalance(c.openingBalance || 0);
    setGstStatus(c.gstin ? "Registered Party" : null);
    setIsFetchingGst(false);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Party name is required");
      return;
    }

    const stateObj = INDIAN_STATES.find((s) => s.name === state);
    const stateCode = stateObj ? stateObj.code : getStateCodeFromGSTIN(gstin);

    const clientPayload: Client = {
      id: editingClient ? editingClient.id : `cli-${Date.now()}`,
      name: name.trim(),
      tradeName: tradeName.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      pan: pan.trim().toUpperCase() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      state,
      stateCode,
      pincode: pincode.trim() || undefined,
      type: clientType,
      isSEZ,
      openingBalance,
      created_at: editingClient ? editingClient.created_at : Date.now(),
    };

    try {
      await saveClient(clientPayload);
      toast.success(`Saved party ${clientPayload.name}`);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    }
  };

  const handleDelete = async (id: string, clientName: string) => {
    if (!confirm(`Delete party "${clientName}"?`)) return;
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
      toast.success(`Party deleted`);
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  // Filtered clients
  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      (c.tradeName || "").toLowerCase().includes(q) ||
      (c.gstin || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || c.type === typeFilter || c.type === "both";
    return matchesSearch && matchesType;
  });

  const registeredPartiesCount = clients.filter((c) => c.gstin && c.gstin.length === 15).length;
  const totalClientSales = invoices.reduce(
    (acc, inv) => acc + Number(inv.data?.totals?.grandTotal || inv.data?.grand_total || 0),
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Title & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
              <Users className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Clients & Suppliers Directory
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                Manage B2B buyers, vendors, GSTINs, and party ledgers with one-click statements.
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Party</span>
          </button>
        </div>

        {/* Metrics Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Parties</span>
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {clients.length}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Customers and suppliers onboarded</p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>GST Registered</span>
              <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
              {registeredPartiesCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Verified 15-digit GSTIN businesses</p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Invoiced Sales</span>
              <span className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-blue-600 dark:text-blue-400 mt-2">
              {formatINR(totalClientSales)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Across all registered bills</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by party name, trade name, GSTIN or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl text-xs font-semibold">
            {(["all", "customer", "vendor"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 rounded-xl capitalize transition-all ${
                  typeFilter === t
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t === "all" ? "All Parties" : `${t}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Grid / Empty State */}
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-16 text-center space-y-3 shadow-xs">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No parties found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {search || typeFilter !== "all"
                ? "No customer or supplier matches your search criteria. Try modifying your filter."
                : "Add your customer and vendor profiles for automatic auto-fill in GST invoices."}
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add First Party
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((c) => {
              const clientInvoices = invoices.filter(
                (inv) =>
                  (inv.data?.buyer?.name || inv.data?.customer_name || "").toLowerCase() ===
                  c.name.toLowerCase()
              );
              const totalTurnover = clientInvoices.reduce(
                (acc, inv) => acc + Number(inv.data?.totals?.grandTotal || inv.data?.grand_total || 0),
                0
              );

              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            {c.type || "Customer"}
                          </span>
                          {c.isSEZ && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                              SEZ
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5 truncate">
                          {c.name}
                        </h3>
                        {c.tradeName && (
                          <p className="text-[11px] text-slate-500 font-medium truncate">{c.tradeName}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition"
                          title="Edit Party"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-xl transition"
                          title="Delete Party"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                      <p className="font-mono text-[11px]">
                        <span className="font-semibold text-slate-400">GSTIN:</span>{" "}
                        {c.gstin ? (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{c.gstin}</span>
                        ) : (
                          <span className="text-slate-400 italic">Unregistered (B2C)</span>
                        )}
                      </p>
                      {c.phone && (
                        <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {c.phone}
                        </p>
                      )}
                      {c.email && (
                        <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {c.email}
                        </p>
                      )}
                      <p className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {c.address ? `${c.address}, ` : ""}{c.state || "India"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Ledger Quick Summary */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        Total Invoiced
                      </span>
                      <span className="font-black font-mono tabular-nums text-slate-900 dark:text-white">
                        {formatINR(totalTurnover)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        Invoices
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {clientInvoices.length} bill{clientInvoices.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add / Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingClient ? "Edit Party Profile" : "Add New Customer / Supplier"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* GSTIN First for Instant Auto-Fill */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    GSTIN (Optional for Unregistered B2C)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGstLookup()}
                    disabled={isFetchingGst || !gstin || gstin.length < 15}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                  >
                    {isFetchingGst ? (
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        Fetching Details...
                      </span>
                    ) : (
                      "Auto-Fill from GST Portal"
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                    setGstin(val);
                    if (val.length === 15) {
                      handleGstLookup(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs uppercase font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {gstStatus && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    GST Portal Status: {gstStatus}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Party Name / Legal Entity *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reliance Retail Ltd or Rajesh Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trade Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Doing Business As (DBA)"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PAN
                  </label>
                  <input
                    type="text"
                    placeholder="AAAAA0000A"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="billing@party.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Address
                  </label>
                  <input
                    type="text"
                    placeholder="Shop No, Building, Street, Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="400001"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Party Type
                  </label>
                  <select
                    value={clientType}
                    onChange={(e: any) => setClientType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="customer">Customer (Buyer)</option>
                    <option value="vendor">Vendor (Supplier)</option>
                    <option value="both">Both (Buyer & Supplier)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isSEZ"
                    checked={isSEZ}
                    onChange={(e) => setIsSEZ(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isSEZ" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    SEZ Unit (Zero-Rated Supply)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
