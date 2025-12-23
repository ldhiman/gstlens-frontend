"use client";

import { useState } from "react";
import {
  X,
  Building2,
  User,
  FileText,
  DollarSign,
  Lock,
  Loader2,
  Info,
} from "lucide-react";

import { fetchGSTInfo } from "@/lib/api";

type Props = {
  invoice: any;
  onSave: (updated: any) => void;
  onClose: () => void;
};

export default function EditInvoiceModal({ invoice, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...invoice });
  const [loadingGST, setLoadingGST] = useState(false);

  /* ---------------- GSTIN CHANGE HANDLER ---------------- */

  async function handleGSTINChange(
    key: "seller_gstin" | "buyer_gstin",
    value: string
  ) {
    const updated = { ...form, [key]: value || null };
    setForm(updated);

    if (value && value.length === 15) {
      try {
        setLoadingGST(true);
        // Simulated API call

        const res = await fetchGSTInfo(value);
        console.log("Fetched GST Info:", res);
        // await new Promise((resolve) => setTimeout(resolve, 1000));

        const fetchedData = res.data;

        if (key === "seller_gstin") {
          updated.seller_gstin_info = fetchedData;
        } else {
          updated.buyer_gstin_info = fetchedData;
        }

        // Auto invoice type
        updated.invoice_type = updated.buyer_gstin ? "B2B" : "B2C";

        // Auto POS from seller GSTIN
        if (updated.seller_gstin) {
          updated.pos = updated.seller_gstin.slice(0, 2);
        }

        setForm({ ...updated });
      } finally {
        setLoadingGST(false);
      }
    }
  }

  /* ---------------- NUMBER UPDATE ---------------- */

  function updateNumber(key: string, value: number) {
    const updated = { ...form, [key]: value };

    const cgst = Number(updated.cgst) || 0;
    const sgst = Number(updated.sgst) || 0;
    const igst = Number(updated.igst) || 0;
    const taxable = Number(updated.taxable_value) || 0;

    updated.invoice_total = Number((taxable + cgst + sgst + igst).toFixed(2));

    setForm(updated);
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl sm:mx-4 shadow-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Edit Invoice
                </h2>
              </div>
              <p className="text-sm text-gray-500 ml-10">
                GST details are fetched automatically
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors -mr-1"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {loadingGST && (
          <div className="flex-shrink-0 bg-blue-50 border-b border-blue-100 px-5 py-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">
                Fetching GST details...
              </span>
            </div>
          </div>
        )}

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Seller Section */}
          <Section icon={Building2} title="Seller Information" color="blue">
            <Input
              label="Seller GSTIN"
              value={form.seller_gstin || ""}
              onChange={(v: string) => handleGSTINChange("seller_gstin", v)}
              placeholder="15-digit GSTIN"
              maxLength={15}
              mono
            />
            <LockedField
              label="Legal Name"
              value={form.seller_gstin_info?.legal_name}
            />
            <LockedField
              label="Trade Name"
              value={form.seller_gstin_info?.trade_name}
            />
          </Section>

          {/* Buyer Section */}
          <Section icon={User} title="Buyer Information" color="purple">
            <Input
              label="Buyer GSTIN"
              value={form.buyer_gstin || ""}
              onChange={(v: string) => handleGSTINChange("buyer_gstin", v)}
              placeholder="Optional - Leave empty for B2C"
              maxLength={15}
              mono
            />
            {form.buyer_gstin_info && (
              <>
                <LockedField
                  label="Legal Name"
                  value={form.buyer_gstin_info.legal_name}
                />
                <LockedField
                  label="Trade Name"
                  value={form.buyer_gstin_info.trade_name}
                />
              </>
            )}
          </Section>

          {/* Invoice Section */}
          <Section icon={FileText} title="Invoice Details" color="indigo">
            <Input
              label="Invoice Number"
              value={form.invoice_number}
              onChange={(v: any) => setForm({ ...form, invoice_number: v })}
              placeholder="INV-001"
            />
            <Input
              label="Invoice Date"
              value={form.invoice_date}
              onChange={(v: any) => setForm({ ...form, invoice_date: v })}
              placeholder="dd.mm.yyyy"
            />
            <LockedField label="Invoice Type" value={form.invoice_type} />
            <LockedField label="Place of Supply" value={form.pos} />
          </Section>

          {/* Tax Section */}
          <Section icon={DollarSign} title="Tax & Amount" color="emerald">
            <NumberInput
              label="Taxable Value"
              value={form.taxable_value}
              onChange={(v: number) => updateNumber("taxable_value", v)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <NumberInput
                label="CGST"
                value={form.cgst}
                onChange={(v: number) => updateNumber("cgst", v)}
              />
              <NumberInput
                label="SGST"
                value={form.sgst}
                onChange={(v: number) => updateNumber("sgst", v)}
              />
              <NumberInput
                label="IGST"
                value={form.igst}
                onChange={(v: number) => updateNumber("igst", v)}
              />
            </div>
            <LockedField
              label="Invoice Total"
              value={`₹${form.invoice_total}`}
              highlight
            />
          </Section>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-medium mb-1">Auto-calculations enabled</p>
              <p className="text-blue-700">
                Invoice type, POS, and total are calculated automatically based
                on your inputs.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-white border-2 border-gray-200 text-gray-700 rounded-xl py-3 px-4 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3 px-4 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI Components ---------------- */

function Section({ icon: Icon, title, children, color }: any) {
  const colorClasses = {
    blue: "from-blue-50 to-cyan-50",
    purple: "from-purple-50 to-pink-50",
    indigo: "from-indigo-50 to-blue-50",
    emerald: "from-emerald-50 to-green-50",
  };

  return (
    <div
      className={`bg-gradient-to-br ${
        colorClasses[color as keyof typeof colorClasses]
      } rounded-xl p-4 space-y-3 border border-${color}-100`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gray-700" />
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  mono = false,
}: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600 block">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className={`w-full border-2 border-gray-200 text-black rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}

function NumberInput({ label, value, onChange }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600 block">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          ₹
        </span>
        <input
          type="number"
          step="0.01"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full border-2 border-gray-200 text-black rounded-lg pl-7 pr-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
        />
      </div>
    </div>
  );
}

function LockedField({ label, value, highlight = false }: any) {
  return (
    <div
      className={`flex items-center justify-between ${
        highlight ? "bg-white/60 border-2 border-emerald-200" : "bg-white/40"
      } rounded-lg px-3 py-2.5`}
    >
      <div className="flex items-center gap-2">
        <Lock className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <span
        className={`text-sm font-semibold ${
          highlight ? "text-emerald-700 text-base" : "text-gray-900"
        }`}
      >
        {value ?? "-"}
      </span>
    </div>
  );
}
