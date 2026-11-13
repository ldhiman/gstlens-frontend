"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Trash2,
  Calendar,
  Building2,
  CheckCircle,
  CreditCard,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  ReceiptRecord,
  getAllReceipts,
  saveReceipt,
  deleteReceipt,
  getAllClients,
  getAllInvoices,
  Client,
  StoredInvoice,
  getBusinessProfile,
  BusinessProfile,
  updateInvoice,
} from "@/lib/storage";
import { formatINR, numberToWords, getLocalToday } from "@/lib/gstBillingEngine";
import toast from "react-hot-toast";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<StoredInvoice[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptRecord | null>(null);

  // Form
  const [date, setDate] = useState<string>(getLocalToday());
  const [receiptNo, setReceiptNo] = useState<string>("");
  const [type, setType] = useState<"in" | "out">("in");
  const [partyName, setPartyName] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [againstInvoice, setAgainstInvoice] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const loadData = async () => {
    try {
      const [recs, cls, invs, prof] = await Promise.all([
        getAllReceipts(),
        getAllClients(),
        getAllInvoices(),
        getBusinessProfile(),
      ]);
      setReceipts(recs.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
      setClients(cls);
      setInvoices(invs);
      setProfile(prof);
    } catch (err: any) {
      toast.error("Failed to load receipts: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = (mode: "in" | "out" = "in") => {
    setType(mode);
    setDate(getLocalToday());
    setReceiptNo(`RCP-${Date.now().toString().slice(-6)}`);
    setPartyName("");
    setAmount(0);
    setPaymentMode("Bank Transfer");
    setReferenceNo("");
    setAgainstInvoice("");
    setNote("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      toast.error("Party name is required");
      return;
    }
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const payload: ReceiptRecord = {
      id: `rcp-${Date.now()}`,
      date,
      receiptNo: receiptNo.trim() || `RCP-${Date.now().toString().slice(-6)}`,
      type,
      partyName: partyName.trim(),
      amount: Number(amount) || 0,
      paymentMode,
      referenceNo: referenceNo.trim() || undefined,
      againstInvoice: againstInvoice.trim() || undefined,
      note: note.trim() || undefined,
      created_at: Date.now(),
    };

    try {
      await saveReceipt(payload);

      // If matched against an invoice, mark invoice as paid
      if (againstInvoice) {
        const matched = invoices.find(
          (inv) => inv.data?.invoice_number === againstInvoice
        );
        if (matched) {
          await updateInvoice(matched.id, {
            data: {
              ...matched.data,
              payment_status: "Paid",
            },
          });
        }
      }

      toast.success(
        type === "in"
          ? `Receipt ${payload.receiptNo} recorded!`
          : `Payment Voucher ${payload.receiptNo} recorded!`
      );
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this receipt voucher?")) return;
    try {
      await deleteReceipt(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
      toast.success("Receipt deleted");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const filtered = receipts.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      r.partyName.toLowerCase().includes(q) ||
      r.receiptNo.toLowerCase().includes(q) ||
      (r.againstInvoice || "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || r.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalIn = receipts.filter((r) => r.type === "in").reduce((a, b) => a + (b.amount || 0), 0);
  const totalOut = receipts.filter((r) => r.type === "out").reduce((a, b) => a + (b.amount || 0), 0);
  const netFlow = totalIn - totalOut;

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
              <Receipt className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                Payment Vouchers & Receipts
              </h1>
              <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400">
                Record buyer collections, supplier remittances, and auto-settle invoice balances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openAddModal("out")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium rounded-xl border border-stone-200 dark:border-stone-700 transition"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Payment Out (Vendor)</span>
            </button>
            <button
              onClick={() => openAddModal("in")}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-medium rounded-xl shadow-xs transition"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Payment In (Customer)</span>
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
          <div className="bg-white dark:bg-[#1a1a1c] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Collections (Inflow)</span>
              <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-400 rounded-lg">
                <ArrowDownLeft className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold font-mono tabular-nums text-[#047857] dark:text-emerald-400 mt-2">
              {formatINR(totalIn)}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              Received from customer receipts
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1a1c] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Payouts (Outflow)</span>
              <span className="p-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-semibold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-2">
              {formatINR(totalOut)}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              Disbursed to suppliers and vendors
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1a1c] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
            <div className="flex items-center justify-between text-stone-400 text-xs font-semibold uppercase tracking-wider">
              <span>Net Cash Inflow</span>
              <span className="p-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg">
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <p
              className={`text-2xl font-semibold font-mono tabular-nums mt-2 ${
                netFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"
              }`}
            >
              {formatINR(netFlow)}
            </p>
            <p className="text-[11px] text-stone-400 mt-1">
              Net balance across bank & cash
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#1a1a1c] p-3 rounded-xl border border-stone-200/80 dark:border-stone-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by party name, voucher number or invoice reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#fafaf9] dark:bg-[#141415] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#047857]"
            />
          </div>

          <div className="flex bg-stone-100 dark:bg-stone-800/60 p-1 rounded-xl text-xs font-medium border border-stone-200/60 dark:border-stone-800">
            {(["all", "in", "out"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 rounded-xl capitalize transition-all ${
                  typeFilter === t
                    ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs border border-stone-200 dark:border-stone-700/60 font-medium"
                    : "text-stone-600 dark:text-stone-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {t === "all" ? "All Vouchers" : t === "in" ? "Payments In" : "Payments Out"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3 px-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-stone-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Receipt className="w-8 h-8" />
              </div>
              <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">
                No payment vouchers found
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                {search || typeFilter !== "all"
                  ? "No vouchers match your search criteria. Try modifying your filters."
                  : "Record customer collections or supplier payment vouchers to reconcile balances."}
              </p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  onClick={() => openAddModal("in")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Record Payment In
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#fafaf9] dark:bg-[#141415]/60 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Voucher No</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Party</th>
                    <th className="py-3.5 px-4">Against Invoice</th>
                    <th className="py-3.5 px-4">Mode & Ref</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                        {r.receiptNo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-stone-400 font-mono tabular-nums">{r.date}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                            r.type === "in"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                              : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60"
                          }`}
                        >
                          {r.type === "in" ? "Payment In" : "Payment Out"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-stone-900 dark:text-stone-100">
                        {r.partyName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-stone-400">
                        {r.againstInvoice || "On Account"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-stone-400">
                        <div className="font-semibold">{r.paymentMode}</div>
                        {r.referenceNo && (
                          <div className="font-mono text-[10px] text-stone-400 dark:text-slate-500">Ref: {r.referenceNo}</div>
                        )}
                      </td>
                      <td
                        className={`py-3.5 px-4 font-mono font-black tabular-nums ${
                          r.type === "in"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {r.type === "in" ? `+${formatINR(r.amount)}` : `-${formatINR(r.amount)}`}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewReceipt(r)}
                            title="View Receipt Slip"
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            title="Delete Voucher"
                            className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-400 hover:text-rose-600 rounded-xl transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl w-full max-w-lg p-6 shadow-xl border border-stone-200/80 dark:border-stone-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-base font-medium text-stone-900 dark:text-stone-100">
                {type === "in" ? "Record Payment Received (Inflow)" : "Record Payment Made (Outflow)"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-stone-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Voucher Number
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {type === "in" ? "Received From (Customer Name) *" : "Paid To (Supplier Name) *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter or select party name"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    list="partyList"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                  <datalist id="partyList">
                    {clients.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Card">Debit / Credit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction / Cheque Ref No
                  </label>
                  <input
                    type="text"
                    placeholder="UTR / UPI Ref / Cheque No"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Against Invoice No (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-001"
                    value={againstInvoice}
                    onChange={(e) => setAgainstInvoice(e.target.value)}
                    list="invoiceList"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                  <datalist id="invoiceList">
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.data?.invoice_number} />
                    ))}
                  </datalist>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Note / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Advance for Q4 retainer"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#047857]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md transition ${
                    type === "in"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20"
                  }`}
                >
                  Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Voucher Preview Modal */}
      {previewReceipt && profile && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <h3 className="text-sm font-medium text-stone-900 dark:text-stone-100">
                Payment Voucher Slip
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Slip
                </button>
                <button
                  onClick={() => setPreviewReceipt(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-stone-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              id="print-area"
              className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 text-xs space-y-4 font-sans"
            >
              <div className="text-center pb-3 border-b border-slate-200">
                <h2 className="text-base font-black uppercase text-slate-900">
                  {profile.tradeName || profile.businessName}
                </h2>
                <p className="text-[10px] text-slate-500">{profile.address} | GSTIN: {profile.gstin || "URP"}</p>
                <span className="inline-block px-3 py-0.5 mt-2 bg-slate-100 font-bold uppercase tracking-wider text-[10px] rounded-full">
                  {previewReceipt.type === "in" ? "Official Money Receipt" : "Payment Disbursement Voucher"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-stone-400 font-semibold block">Voucher No:</span>
                  <span className="font-mono font-bold">{previewReceipt.receiptNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-400 font-semibold block">Date:</span>
                  <span className="font-mono">{previewReceipt.date}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <p>
                  <span className="text-slate-500">Party:</span>{" "}
                  <span className="font-bold text-slate-900">{previewReceipt.partyName}</span>
                </p>
                <p>
                  <span className="text-slate-500">Amount:</span>{" "}
                  <span className="font-mono font-black text-sm text-slate-900 tabular-nums">
                    {formatINR(previewReceipt.amount)}
                  </span>
                </p>
                <p className="text-[11px] text-slate-600">
                  <span className="text-slate-500">In Words:</span> {numberToWords(previewReceipt.amount)}
                </p>
                <p className="text-[11px] text-slate-600">
                  <span className="text-slate-500">Payment Mode:</span> {previewReceipt.paymentMode}
                  {previewReceipt.referenceNo && ` (Ref: ${previewReceipt.referenceNo})`}
                </p>
                {previewReceipt.againstInvoice && (
                  <p className="text-[11px] text-slate-600">
                    <span className="text-slate-500">Settled Invoice:</span> {previewReceipt.againstInvoice}
                  </p>
                )}
              </div>

              <div className="pt-4 flex justify-between items-end border-t border-slate-200 text-[10px]">
                <span className="text-stone-400 italic">Generated by GSTLens</span>
                <div className="text-right space-y-6">
                  <p className="text-slate-600">For {profile.businessName}</p>
                  <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                    Authorised Signatory
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Portal Mount for Single-Sheet Slip Printing */}
          {typeof document !== "undefined" && createPortal(
            <div id="print-root">
              <div className="bg-white text-slate-900 p-6 rounded-none border border-slate-300 text-xs space-y-4 font-sans max-w-lg mx-auto">
                <div className="text-center pb-3 border-b border-slate-200">
                  <h2 className="text-base font-black uppercase text-slate-900">
                    {profile.tradeName || profile.businessName}
                  </h2>
                  <p className="text-[10px] text-slate-500">{profile.address} | GSTIN: {profile.gstin || "URP"}</p>
                  <span className="inline-block px-3 py-0.5 mt-2 bg-slate-100 font-bold uppercase tracking-wider text-[10px] rounded-full">
                    {previewReceipt.type === "in" ? "Official Money Receipt" : "Payment Disbursement Voucher"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400 font-semibold block">Voucher No:</span>
                    <span className="font-mono font-bold">{previewReceipt.receiptNo}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-stone-400 font-semibold block">Date:</span>
                    <span className="font-mono">{previewReceipt.date}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <p>
                    <span className="text-slate-500">Party:</span>{" "}
                    <span className="font-bold text-slate-900">{previewReceipt.partyName}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Amount:</span>{" "}
                    <span className="font-mono font-black text-sm text-slate-900 tabular-nums">
                      {formatINR(previewReceipt.amount)}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <span className="text-slate-500">In Words:</span> {numberToWords(previewReceipt.amount)}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    <span className="text-slate-500">Payment Mode:</span> {previewReceipt.paymentMode}
                    {previewReceipt.referenceNo && ` (Ref: ${previewReceipt.referenceNo})`}
                  </p>
                  {previewReceipt.againstInvoice && (
                    <p className="text-[11px] text-slate-600">
                      <span className="text-slate-500">Settled Invoice:</span> {previewReceipt.againstInvoice}
                    </p>
                  )}
                </div>

                <div className="pt-4 flex justify-between items-end border-t border-slate-200 text-[10px]">
                  <span className="text-stone-400 italic">Generated by GSTLens</span>
                  <div className="text-right space-y-6">
                    <p className="text-slate-600">For {profile.businessName}</p>
                    <p className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                      Authorised Signatory
                    </p>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
}
