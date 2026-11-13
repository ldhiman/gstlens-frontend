"use client";

import { useState, useRef } from "react";
import {
  X,
  Building2,
  User,
  FileText,
  DollarSign,
  Lock,
  Loader2,
  Info,
  Calendar,
} from "lucide-react";

import { fetchGSTInfo } from "@/lib/api";
import { formatINR } from "@/lib/currency";
import { getFP } from "@/lib/storage";

type Props = {
  invoice: any;
  onSave: (updated: any) => void;
  onClose: () => void;
};

export default function EditInvoiceModal({ invoice, onSave, onClose }: Props) {
  const [form, setForm] = useState({ ...invoice });
  const [loadingGST, setLoadingGST] = useState(false);
  const [isDateValid, setIsDateValid] = useState(true);

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
        const res = await fetchGSTInfo(value);
        const fetchedData = res.data;

        if (key === "seller_gstin") {
          updated.seller_gstin_info = fetchedData;
        } else {
          updated.buyer_gstin_info = fetchedData;
        }

        // Auto invoice type
        updated.invoice_type = updated.buyer_gstin ? "B2B" : "B2C";

        // Auto POS resolution based on Statutory GST Rules (Section 10 IGST Act):
        if (!updated.pos || updated.pos.length < 2) {
          if (updated.buyer_gstin && updated.buyer_gstin.length >= 2) {
            updated.pos = updated.buyer_gstin.slice(0, 2);
          } else if (updated.seller_gstin && updated.seller_gstin.length >= 2) {
            updated.pos = updated.seller_gstin.slice(0, 2);
          }
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-[#161513] text-stone-900 dark:text-stone-100 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl border-t sm:border border-stone-200/80 dark:border-white/[0.08] max-h-[92vh] sm:max-h-[88vh] flex flex-col z-10 overflow-hidden animate-slide-up">
        {/* Mobile Swipe Handle */}
        <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3.5 border-b border-stone-200/70 dark:border-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl flex items-center justify-center text-[#047857] dark:text-emerald-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Edit invoice
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Taxpayer details and totals recalculate automatically
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {loadingGST && (
          <div className="flex-shrink-0 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200/70 dark:border-emerald-900/50 px-5 py-2">
            <div className="flex items-center gap-2 text-[#047857] dark:text-emerald-300 text-xs font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching verified GST details from portal...</span>
            </div>
          </div>
        )}

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
          {/* Seller Section */}
          <Section icon={Building2} title="Seller information">
            <Input
              label="Seller GSTIN"
              value={form.seller_gstin || ""}
              onChange={(v: string) => handleGSTINChange("seller_gstin", v)}
              placeholder="15-digit GSTIN (e.g. 07AAAAA0000A1Z5)"
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
          <Section icon={User} title="Buyer information">
            <Input
              label="Buyer GSTIN"
              value={form.buyer_gstin || ""}
              onChange={(v: string) => handleGSTINChange("buyer_gstin", v)}
              placeholder="Leave empty for B2C Consumer"
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

          {/* Invoice Details Section */}
          <Section icon={FileText} title="Invoice metadata">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Invoice Number"
                value={form.invoice_number}
                onChange={(v: any) => setForm({ ...form, invoice_number: v })}
                placeholder="INV-001"
              />
              <StrictDateInput
                value={form.invoice_date || ""}
                onChange={(val, valid) => {
                  setForm({ ...form, invoice_date: val, fp: getFP(val) });
                  setIsDateValid(valid);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <LockedField label="Invoice Type" value={form.invoice_type} />
              <LockedField label="Place of Supply" value={form.pos ? `State Code ${form.pos}` : "—"} />
            </div>
          </Section>

          {/* Tax Section */}
          <Section icon={DollarSign} title="Taxable & GST amounts">
            <NumberInput
              label="Taxable Value (₹)"
              value={form.taxable_value}
              onChange={(v: number) => updateNumber("taxable_value", v)}
            />
            <div className="grid grid-cols-3 gap-2.5">
              <NumberInput
                label="CGST (₹)"
                value={form.cgst}
                onChange={(v: number) => updateNumber("cgst", v)}
              />
              <NumberInput
                label="SGST (₹)"
                value={form.sgst}
                onChange={(v: number) => updateNumber("sgst", v)}
              />
              <NumberInput
                label="IGST (₹)"
                value={form.igst}
                onChange={(v: number) => updateNumber("igst", v)}
              />
            </div>
            <LockedField
              label="Invoice Total (₹)"
              value={formatINR(form.invoice_total)}
              highlight
            />
          </Section>

          {/* Info Box */}
          <div className="bg-stone-100/70 dark:bg-[#1a1a1c] border border-stone-200/80 dark:border-stone-800 rounded-xl p-3 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#047857] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-700 dark:text-stone-300 space-y-0.5">
              <p className="font-semibold text-stone-900 dark:text-stone-100">Automatic statutory checks active</p>
              <p className="text-stone-500 dark:text-stone-400">
                Invoice type, place of supply (POS), and net invoice total are auto-computed according to statutory GST rules.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-stone-200/70 dark:border-white/[0.06] bg-stone-50/70 dark:bg-[#141415]/90">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 px-4 font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-all active:scale-98 min-h-[40px] text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              disabled={!isDateValid}
              className={`flex-[2] rounded-xl py-2.5 px-4 font-semibold transition-all min-h-[40px] text-xs text-white ${
                isDateValid
                  ? "bg-[#047857] hover:bg-[#065f46] shadow-sm active:scale-98 cursor-pointer"
                  : "bg-stone-300 dark:bg-stone-800 text-stone-500 dark:text-stone-600 opacity-50 cursor-not-allowed"
              }`}
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI Helper Components ---------------- */

function Section({ icon: Icon, title, children }: any) {
  return (
    <div className="bg-stone-50 dark:bg-[#1a1a1c] rounded-xl p-3.5 space-y-2.5 border border-stone-200/70 dark:border-stone-800/80">
      <div className="flex items-center gap-1.5 pb-1 border-b border-stone-200/50 dark:border-stone-800">
        <Icon className="w-3.5 h-3.5 text-[#047857] dark:text-emerald-400" />
        <h3 className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
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
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        autoCapitalize={mono ? "characters" : undefined}
        className={`w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl px-3 py-2 text-xs focus:border-[#047857] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all ${
          mono ? "font-mono uppercase tracking-wider" : ""
        }`}
      />
    </div>
  );
}

function NumberInput({ label, value, onChange }: any) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block truncate">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 text-xs font-mono">
          ₹
        </span>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl pl-6 pr-2.5 py-2 text-xs font-mono tabular-nums focus:border-[#047857] dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none transition-all"
        />
      </div>
    </div>
  );
}

function LockedField({ label, value, highlight = false }: any) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl px-3 py-2 ${
        highlight
          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60"
          : "bg-stone-100/70 dark:bg-stone-900/70 border border-stone-200/50 dark:border-stone-800/50"
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Lock className="w-3 h-3 text-stone-400 dark:text-stone-500 shrink-0" />
        <span className="text-[11px] font-medium text-stone-600 dark:text-stone-400 truncate">
          {label}
        </span>
      </div>
      <span
        className={`text-xs font-semibold truncate ml-2 ${
          highlight
            ? "text-[#047857] dark:text-emerald-400 font-mono font-bold"
            : "text-stone-900 dark:text-stone-100"
        }`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function StrictDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string, isValid: boolean) => void;
}) {
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  const validateDDMMYYYY = (str: string) => {
    if (!str || typeof str !== "string") return false;
    const parts = str.trim().split("-");
    if (parts.length !== 3) return false;
    const [d, m, y] = parts;
    if (d.length !== 2 || m.length !== 2 || y.length !== 4) return false;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    const year = parseInt(y, 10);
    return day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1990 && year <= 2099;
  };

  const isValid = validateDDMMYYYY(value);

  const handleTextChange = (raw: string) => {
    let cleaned = raw.replace(/[^\d-]/g, "");
    if (!cleaned.includes("-") && cleaned.length >= 2) {
      if (cleaned.length <= 4) {
        cleaned = `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
      } else {
        cleaned = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 8)}`;
      }
    }
    const valid = validateDDMMYYYY(cleaned);
    onChange(cleaned, valid);
  };

  const handleCalendarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = e.target.value;
    if (!isoDate) return;
    const [yyyy, mm, dd] = isoDate.split("-");
    const formatted = `${dd}-${mm}-${yyyy}`;
    onChange(formatted, true);
  };

  const getISOValue = () => {
    if (!isValid) return "";
    const [d, m, y] = value.split("-");
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 block">
          Invoice date
        </label>
        {value && (
          <span
            className={`text-[10px] font-bold ${
              isValid
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-500 dark:text-rose-400"
            }`}
          >
            {isValid ? "✓ Strict DD-MM-YYYY" : "Format: DD-MM-YYYY"}
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          value={value || ""}
          placeholder="DD-MM-YYYY (e.g. 24-10-2026)"
          maxLength={10}
          onChange={(e) => handleTextChange(e.target.value)}
          className={`w-full bg-white dark:bg-stone-900 border text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl pl-3 pr-9 py-2 text-xs font-mono tracking-wider focus:ring-2 outline-none transition-all ${
            isValid
              ? "border-stone-200 dark:border-stone-700 focus:border-[#047857] focus:ring-emerald-500/15"
              : value
              ? "border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-500/15"
              : "border-stone-200 dark:border-stone-700 focus:border-[#047857] focus:ring-emerald-500/15"
          }`}
        />

        {/* Native Calendar Picker Button */}
        <button
          type="button"
          onClick={() => (hiddenDateRef.current as any)?.showPicker?.() || hiddenDateRef.current?.click()}
          className="absolute right-2 p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-[#047857] dark:hover:text-emerald-400 transition"
          title="Pick date from calendar"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>

        {/* Hidden native date input to trigger browser calendar */}
        <input
          ref={hiddenDateRef}
          type="date"
          value={getISOValue()}
          onChange={handleCalendarPick}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {isValid && (
        <p className="text-[10px] text-stone-500 dark:text-stone-400 font-mono flex items-center gap-1 mt-0.5">
          <span>Return period (fp):</span>
          <span className="font-bold text-[#047857] dark:text-emerald-400">
            {getFP(value)}
          </span>
        </p>
      )}
    </div>
  );
}
