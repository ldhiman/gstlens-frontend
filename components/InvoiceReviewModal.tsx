"use client";

import { useState } from "react";
import {
  X,
  AlertCircle,
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

  console.log("Reviewing invoice:", invoice);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - slides up on mobile, centered on desktop */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl sm:mx-4 shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Review Invoice
                </h2>
              </div>
              <p className="text-sm text-gray-500 ml-10">
                Verify the extracted details before saving
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

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Warning Banner */}
          {invoice.warning && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Attention Required
                </p>
                <p className="text-xs text-red-700 mt-1">{invoice.warning}</p>
              </div>
            </div>
          )}

          {/* Invoice Details Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 space-y-3">
            <SectionHeader icon={FileText} title="Invoice Details" />
            <Field label="Invoice Number" value={invoice.invoice_number} />
            <Field
              label="Invoice Date"
              value={invoice.invoice_date}
              icon={Calendar}
            />
            <Field label="Invoice Type" value={invoice.invoice_type} />
            <Field label="Place of Supply" value={invoice.pos} />
          </div>

          {/* Seller Information */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <SectionHeader icon={Building2} title="Seller Information" />
            <Field label="GSTIN" value={invoice.seller_gstin} mono />
            <Field
              label="Legal Name"
              value={invoice.seller_gstin_info?.legal_name}
            />
            <Field
              label="Trade Name"
              value={invoice.seller_gstin_info?.trade_name}
            />
          </div>

          {/* Buyer Information - conditional */}
          {invoice.buyer_gstin !== null && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <SectionHeader icon={User} title="Buyer Information" />
              <Field label="GSTIN" value={invoice.buyer_gstin} mono />
              <Field
                label="Legal Name"
                value={invoice.buyer_gstin_info?.legal_name}
              />
              <Field
                label="Trade Name"
                value={invoice.buyer_gstin_info?.trade_name}
              />
            </div>
          )}

          {/* Tax & Amount Details */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 space-y-3">
            <SectionHeader icon={DollarSign} title="Tax & Amount Details" />
            <Field
              label="Taxable Value"
              value={invoice.taxable_value}
              currency
            />
            <Field label="CGST" value={invoice.cgst} currency />
            <Field label="SGST" value={invoice.sgst} currency />
            <Field label="IGST" value={invoice.igst} currency />
            <div className="pt-2 border-t border-emerald-200">
              <Field
                label="Invoice Total"
                value={invoice.invoice_total}
                currency
                bold
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 rounded-xl py-3 px-4 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              disabled={!invoice.invoice_date || saving}
              onClick={async () => {
                setSaving(true);
                await onConfirm();
              }}
              className="flex-[2] flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3 px-4 font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none active:scale-95"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm & Save
                </>
              )}
            </button>
          </div>

          {!isNew && (
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 border-2 border-red-200 text-red-600 rounded-xl py-3 px-4 font-medium hover:bg-red-50 hover:border-red-300 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Delete Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-gray-600" />
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
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
  const displayValue = value ?? "-";
  const formattedValue =
    currency && value ? `₹${parseFloat(value).toFixed(2)}` : displayValue;

  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-sm text-gray-600 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span
        className={`text-sm text-right ${
          bold
            ? "font-bold text-gray-900 text-base"
            : "font-medium text-gray-900"
        } ${mono ? "font-mono" : ""} ${!value ? "text-gray-400" : ""}`}
      >
        {formattedValue}
      </span>
    </div>
  );
}

// Add this to your global CSS for the slide-up animation
const styles = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

@media (min-width: 640px) {
  .animate-slide-up {
    animation: none;
  }
}
`;
