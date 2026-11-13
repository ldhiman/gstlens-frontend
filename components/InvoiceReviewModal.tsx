"use client";

import { useState } from "react";
import {
  X,
  AlertCircle,
  AlertTriangle,
  Edit3,
  Check,
  Trash2,
  Calendar,
  FileText,
  Building2,
  User,
  DollarSign,
} from "lucide-react";

type Props = {
  invoice: any;
  isNew?: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function InvoiceReviewModal({
  invoice,
  isNew = true,
  onConfirm,
  onDelete,
  onEdit,
  onClose,
}: Props) {
  if (!invoice) return null;
  const [saving, setSaving] = useState(false);

  const handleWhatsApp = () => {
    const invNum = invoice.invoice_number || invoice.name || "Invoice";
    const amount = invoice.invoice_total || invoice.amount || 0;
    const party = invoice.buyer_name || invoice.buyer_gstin || "Customer";
    const seller = invoice.seller_name || invoice.seller_gstin || "Our Business";
    const text = encodeURIComponent(
      `🧾 *TAX INVOICE: ${invNum}*\n\n` +
      `Dear ${party},\n` +
      `Invoice details from *${seller}*:\n\n` +
      `• *Invoice No:* ${invNum}\n` +
      `• *Date:* ${invoice.invoice_date || invoice.date || "Today"}\n` +
      `• *Total Amount:* ₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}\n\n` +
      `Please review and settle payment.\n` +
      `⚡ Generated via GSTLens`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal - slides up on mobile, centered on desktop */}
      <div className="relative bg-white dark:bg-[#161513] text-stone-900 dark:text-stone-100 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl border-t sm:border border-stone-200/80 dark:border-white/[0.08] max-h-[90vh] sm:max-h-[85vh] flex flex-col z-10 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3.5 border-b border-stone-200/70 dark:border-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl flex items-center justify-center text-[#047857] dark:text-emerald-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Review invoice
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Verify the extracted details before saving
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

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5">
          {/* Statutory Duplicate Warning Banner (Section 16(2)) */}
          {invoice.duplicate_warning && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                  Duplicate invoice detected (Section 16(2))
                </p>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                  {invoice.duplicate_warning}
                </p>
              </div>
            </div>
          )}

          {/* Warning Banner */}
          {invoice.warning && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Attention required
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">{invoice.warning}</p>
              </div>
            </div>
          )}

          {/* Invoice Details Section */}
          <div className="bg-stone-50 dark:bg-[#1a1a1c] border border-stone-200/70 dark:border-stone-800/80 rounded-xl p-3.5 space-y-2">
            <SectionHeader icon={FileText} title="Invoice details" />
            <Field label="Invoice number" value={invoice.invoice_number} mono />
            <Field
              label="Invoice date"
              value={invoice.invoice_date}
              icon={Calendar}
            />
            <Field label="Invoice type" value={invoice.invoice_type} />
            <Field label="Place of supply" value={invoice.pos ? `State code ${invoice.pos}` : "—"} />
          </div>

          {/* Seller Information */}
          <div className="bg-stone-50 dark:bg-[#1a1a1c] border border-stone-200/70 dark:border-stone-800/80 rounded-xl p-3.5 space-y-2">
            <SectionHeader icon={Building2} title="Seller information" />
            <Field label="GSTIN" value={invoice.seller_gstin} mono />
            <Field
              label="Legal name"
              value={invoice.seller_gstin_info?.legal_name}
            />
            <Field
              label="Trade name"
              value={invoice.seller_gstin_info?.trade_name}
            />
          </div>

          {/* Buyer Information - conditional */}
          {invoice.buyer_gstin !== null && (
            <div className="bg-stone-50 dark:bg-[#1a1a1c] border border-stone-200/70 dark:border-stone-800/80 rounded-xl p-3.5 space-y-2">
              <SectionHeader icon={User} title="Buyer information" />
              <Field label="GSTIN" value={invoice.buyer_gstin} mono />
              <Field
                label="Legal name"
                value={invoice.buyer_gstin_info?.legal_name}
              />
              <Field
                label="Trade name"
                value={invoice.buyer_gstin_info?.trade_name}
              />
            </div>
          )}

          {/* Tax & Amount Details */}
          <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl p-3.5 space-y-2">
            <SectionHeader icon={DollarSign} title="Tax & amount details" />
            <Field
              label="Taxable value"
              value={invoice.taxable_value}
              currency
            />
            <Field label="CGST" value={invoice.cgst} currency />
            <Field label="SGST" value={invoice.sgst} currency />
            <Field label="IGST" value={invoice.igst} currency />
            <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-800/40">
              <Field
                label="Invoice total"
                value={invoice.invoice_total}
                currency
                bold
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-stone-200/70 dark:border-white/[0.06] bg-stone-50/70 dark:bg-[#141415]/90 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleWhatsApp}
              type="button"
              className="px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
              title="Share invoice on WhatsApp"
            >
              <span>💬 WhatsApp</span>
            </button>
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl py-2.5 px-3 font-semibold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition-all active:scale-95 cursor-pointer min-h-[40px]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              disabled={!invoice.invoice_date || saving}
              onClick={async () => {
                setSaving(true);
                await onConfirm();
              }}
              className="flex-[2] flex items-center justify-center gap-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl py-2.5 px-4 font-semibold text-xs transition-all shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer min-h-[40px]"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm & save
                </>
              )}
            </button>
          </div>

          {!isNew && (
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl py-2 px-4 font-medium text-xs hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-1.5 pb-1 border-b border-stone-200/50 dark:border-stone-800">
      <Icon className="w-3.5 h-3.5 text-[#047857] dark:text-emerald-400" />
      <h3 className="text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
  mono = false,
  currency = false,
  bold = false,
}: any) {
  const rawValue =
    typeof value === "object" && value !== null ? value.value ?? "-" : value;
  const displayValue = rawValue ?? "-";
  const formattedValue =
    currency && rawValue ? `₹${parseFloat(rawValue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : displayValue;

  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-stone-400" />}
        {label}
      </span>
      <span
        className={`text-xs text-right ${
          bold
            ? "font-bold text-[#047857] dark:text-emerald-400 text-sm font-mono tabular-nums"
            : "font-medium text-stone-900 dark:text-stone-100"
        } ${mono || currency ? "font-mono tabular-nums" : ""} ${!value ? "text-stone-400" : ""}`}
      >
        {formattedValue}
      </span>
    </div>
  );
}
