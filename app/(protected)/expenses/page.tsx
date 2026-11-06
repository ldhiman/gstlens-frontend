"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  Search,
  Trash2,
  Calendar,
  Building2,
  Tag,
  DollarSign,
  X,
  PieChart,
  TrendingDown,
  ShieldCheck,
  Receipt,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  Expense,
  getAllExpenses,
  saveExpense,
  deleteExpense,
} from "@/lib/storage";
import {
  GST_RATES,
  formatINR,
  getLocalToday,
} from "@/lib/gstBillingEngine";
import toast from "react-hot-toast";

const EXPENSE_CATEGORIES = [
  { name: "Office Rent", itrHead: "business" },
  { name: "Utilities & Electricity", itrHead: "business" },
  { name: "Internet & Telecom", itrHead: "business" },
  { name: "Software & Cloud Tools", itrHead: "business" },
  { name: "Travel & Conveyance", itrHead: "business" },
  { name: "Office Supplies", itrHead: "business" },
  { name: "Salary & Wages", itrHead: "salary" },
  { name: "Professional & Legal Fees", itrHead: "business" },
  { name: "Marketing & Advertising", itrHead: "business" },
  { name: "Shipping & Courier", itrHead: "business" },
  { name: "Repairs & Maintenance", itrHead: "business" },
  { name: "Bank Charges & Fees", itrHead: "business" },
  { name: "Asset Purchase (Hardware)", itrHead: "depreciation" },
  { name: "Personal / Drawings", itrHead: "notDeductible" },
  { name: "Other Business Expense", itrHead: "business" },
] as const;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form
  const [date, setDate] = useState<string>(getLocalToday());
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("Office Rent");
  const [amount, setAmount] = useState<number>(0);
  const [gstAmount, setGstAmount] = useState<number>(0);
  const [interstate, setInterstate] = useState<boolean>(false);
  const [vendorName, setVendorName] = useState<string>("");
  const [vendorGstin, setVendorGstin] = useState<string>("");
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("Bank Transfer");
  const [note, setNote] = useState<string>("");

  const loadData = async () => {
    try {
      const data = await getAllExpenses();
      setExpenses(data.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
    } catch (err: any) {
      toast.error("Failed to load expenses: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (amount <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }

    const catObj = EXPENSE_CATEGORIES.find((c) => c.name === category);
    const itrHead = catObj ? catObj.itrHead : "business";

    const payload: Expense = {
      id: `exp-${Date.now()}`,
      date,
      description: description.trim(),
      category,
      itrHead,
      amount: Number(amount) || 0,
      gstAmount: Number(gstAmount) || 0,
      interstate,
      vendorName: vendorName.trim() || undefined,
      vendorGstin: vendorGstin.trim().toUpperCase() || undefined,
      invoiceNo: invoiceNo.trim() || undefined,
      paymentMode,
      note: note.trim() || undefined,
      created_at: Date.now(),
    };

    try {
      await saveExpense(payload);
      toast.success("Expense recorded successfully");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense record?")) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      toast.success("Expense deleted");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  const filtered = expenses.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch =
      e.description.toLowerCase().includes(q) ||
      (e.vendorName || "").toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
    const matchesCat = categoryFilter === "all" || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalGstPaid = expenses.reduce((acc, e) => acc + (e.gstAmount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
              <Wallet className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Expense Tracker & Vouchers
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                Track operational overheads, Section 37 ITR deductions, and input tax credit on services.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setDate(getLocalToday());
              setDescription("");
              setCategory("Office Rent");
              setAmount(0);
              setGstAmount(0);
              setVendorName("");
              setVendorGstin("");
              setInvoiceNo("");
              setPaymentMode("Bank Transfer");
              setNote("");
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Business Expenses</span>
              <span className="p-1.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
                <TrendingDown className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-2">
              {formatINR(totalExpense)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{expenses.length} expense vouchers booked</p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>GST Paid (Claimable ITC on Services)</span>
              <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
              {formatINR(totalGstPaid)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Claimable in GSTR-3B Table 4(A)(5)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800/90 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses by description or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
          >
            <option value="all">All Expense Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Expense Table */}
        <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-3 px-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Wallet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No expenses found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {search || categoryFilter !== "all"
                  ? "No expenses match your search or filter. Try clearing the filter."
                  : "Track rent, electricity, software tools, and claim eligible GST input credits."}
              </p>
              <button
                onClick={() => {
                  setDate(getLocalToday());
                  setDescription("");
                  setCategory("Office Rent");
                  setAmount(0);
                  setGstAmount(0);
                  setVendorName("");
                  setVendorGstin("");
                  setInvoiceNo("");
                  setPaymentMode("Bank Transfer");
                  setNote("");
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                Record First Expense
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200/80 dark:border-slate-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Category / ITR Head</th>
                    <th className="py-3.5 px-4">Vendor</th>
                    <th className="py-3.5 px-4">Mode</th>
                    <th className="py-3.5 px-4">GST Paid</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filtered.map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono tabular-nums">{e.date}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        <div>{e.description}</div>
                        {e.note && <div className="text-[10px] text-slate-400 font-normal">{e.note}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-medium">
                        {e.vendorName || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {e.paymentMode}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
                        {e.gstAmount > 0 ? formatINR(e.gstAmount) : "—"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black tabular-nums text-slate-900 dark:text-white">
                        {formatINR(e.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-xl transition"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Business Expense
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Expense Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS Cloud Hosting or Office Fiber Broadband"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category (ITR Head)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    GST Portion Included (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={gstAmount}
                    onChange={(e) => setGstAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="UPI / QR">UPI / QR</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor / Payee Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Airtel or Landlord"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                    value={vendorGstin}
                    onChange={(e) => setVendorGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
