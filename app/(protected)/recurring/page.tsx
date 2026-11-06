"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Plus,
  Play,
  Trash2,
  Calendar,
  Building2,
  Layers,
  X,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  RecurringTemplate,
  getAllRecurring,
  saveRecurring,
  deleteRecurring,
  getAllClients,
  getAllProducts,
  Client,
  Product,
  saveInvoiceDraft,
  getNextDocumentNumber,
  getBusinessProfile,
  BusinessProfile,
} from "@/lib/storage";
import {
  DOCUMENT_TYPES,
  DocumentType,
  LineItem,
  computeInvoiceTotals,
  formatINR,
  getLocalToday,
} from "@/lib/gstBillingEngine";
import toast from "react-hot-toast";

export default function RecurringPage() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form
  const [clientName, setClientName] = useState<string>("");
  const [frequency, setFrequency] = useState<RecurringTemplate["frequency"]>("monthly");
  const [interval, setIntervalVal] = useState<number>(1);
  const [nextDate, setNextDate] = useState<string>(getLocalToday());
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "it-1",
      name: "Monthly Retainer Services",
      quantity: 1,
      unit: "Month",
      rate: 15000,
      taxPercent: 18,
    },
  ]);

  const loadData = async () => {
    try {
      const [recs, cls, prods, prof] = await Promise.all([
        getAllRecurring(),
        getAllClients(),
        getAllProducts(),
        getBusinessProfile(),
      ]);
      setTemplates(recs);
      setClients(cls);
      setProducts(prods);
      setProfile(prof);
    } catch (err: any) {
      toast.error("Failed to load recurring templates: " + err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error("Client name is required");
      return;
    }

    const payload: RecurringTemplate = {
      id: `rec-${Date.now()}`,
      clientName: clientName.trim(),
      frequency,
      interval: Number(interval) || 1,
      invoiceType: "tax-invoice",
      items,
      nextDate,
      active: true,
      created_at: Date.now(),
    };

    try {
      await saveRecurring(payload);
      toast.success("Recurring schedule created");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    }
  };

  const handleGenerateNow = async (template: RecurringTemplate) => {
    try {
      const nextNum = await getNextDocumentNumber("INV");
      const matchedClient = clients.find(
        (c) => c.name.toLowerCase() === template.clientName.toLowerCase()
      );

      const totals = computeInvoiceTotals(template.items, false, { hasTax: true, applyRoundOff: true });

      const invoicePayload = {
        invoice_number: nextNum,
        invoice_date: getLocalToday(),
        invoice_type: "tax-invoice",
        seller: {
          name: profile?.tradeName || profile?.businessName,
          gstin: profile?.gstin,
          address: profile?.address,
        },
        buyer: {
          name: template.clientName,
          gstin: matchedClient?.gstin,
          address: matchedClient?.address,
        },
        items: template.items,
        totals,
        created_at: Date.now(),
      };

      await saveInvoiceDraft(invoicePayload, "confirmed");
      toast.success(`Generated recurring invoice ${nextNum} for ${template.clientName}!`);
    } catch (err: any) {
      toast.error("Generation failed: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring template?")) return;
    try {
      await deleteRecurring(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Schedule deleted");
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 pb-16">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600" />
              Recurring Invoices & Subscriptions
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Automate repeat retainer billing, software licenses, and maintenance contracts.
            </p>
          </div>

          <button
            onClick={() => {
              setClientName("");
              setFrequency("monthly");
              setIntervalVal(1);
              setNextDate(getLocalToday());
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
          >
            <Plus className="w-4 h-4" />
            New Recurring Schedule
          </button>
        </div>

        {/* Schedule List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl) => {
            const totals = computeInvoiceTotals(tpl.items, false, { hasTax: true });
            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {tpl.frequency}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm mt-1">
                        {tpl.clientName}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Next issue date: <span className="font-semibold text-slate-900 dark:text-white">{tpl.nextDate}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-slate-400" />
                      {tpl.items.length} line item{tpl.items.length > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Billing Amount</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatINR(totals.grandTotal)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleGenerateNow(tpl)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-xl text-xs font-semibold transition"
                  >
                    <Play className="w-3 h-3" />
                    Generate Now
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Recurring Billing Plan
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer / Client *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Select client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  list="client-list"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
                <datalist id="client-list">
                  {clients.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Next Run Date
                  </label>
                  <input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Retainer Amount (₹ per period)
                </label>
                <input
                  type="number"
                  step="any"
                  value={items[0]?.rate || 0}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setItems([{ ...items[0], rate: r }]);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow"
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
