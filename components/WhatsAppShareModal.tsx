"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  Phone,
  UserCheck,
  AlertCircle,
  Smartphone,
  Send,
  Image as ImageIcon,
} from "lucide-react";
import toast from "react-hot-toast";

export interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  invoiceDate: string;
  client: {
    name?: string;
    phone?: string;
    gstin?: string;
  };
  seller: {
    name: string;
    phone?: string;
    gstin?: string;
    upiId?: string;
  };
  grandTotal: number;
  messageText: string;
  billUrl: string;
  compactImageBlob?: Blob | null;
  compactImageDataUrl?: string | null;
  compactImageFile?: File | null;
}

export default function WhatsAppShareModal({
  isOpen,
  onClose,
  invoiceNumber,
  invoiceDate,
  client,
  seller,
  grandTotal,
  messageText,
  billUrl,
  compactImageBlob,
  compactImageDataUrl,
  compactImageFile,
}: WhatsAppShareModalProps) {
  const initialPhone = (client.phone || "").replace(/[^0-9]/g, "");
  const [phone, setPhone] = useState<string>(initialPhone);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [canNativeShareFiles, setCanNativeShareFiles] = useState<boolean>(false);

  useEffect(() => {
    setPhone((client.phone || "").replace(/[^0-9]/g, ""));
  }, [client.phone, isOpen]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.canShare && compactImageFile) {
      try {
        setCanNativeShareFiles(navigator.canShare({ files: [compactImageFile] }));
      } catch {
        setCanNativeShareFiles(false);
      }
    }
  }, [compactImageFile]);

  if (!isOpen) return null;

  const hasCustomerPhone = !!initialPhone && initialPhone.length >= 10;
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const isPhoneValid = cleanPhone.length >= 10;

  // Copy Bill Image to Clipboard
  const handleCopyImage = async () => {
    if (!compactImageBlob) {
      toast.error("Generating bill image, please wait a moment...");
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": compactImageBlob,
          }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
        toast.success("Bill image copied! You can paste (Ctrl+V) directly in WhatsApp.");
      } else {
        toast.error("Clipboard image copy not supported in this browser. Please use Download.");
      }
    } catch (err) {
      toast.error("Could not copy image. Use Download button instead.");
    }
  };

  // Download Bill Image
  const handleDownloadImage = () => {
    if (!compactImageDataUrl) return;
    const a = document.createElement("a");
    a.href = compactImageDataUrl;
    a.download = `Invoice-${invoiceNumber || "Bill"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Bill image downloaded!");
  };

  // Copy Online Bill Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(billUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
    toast.success("Bill link copied to clipboard!");
  };

  // Copy Message Text
  const handleCopyText = () => {
    navigator.clipboard.writeText(messageText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
    toast.success("WhatsApp message copied!");
  };

  // Native Mobile Web Share (Image + URL attached together)
  const handleNativeShare = async () => {
    if (!navigator.share || !compactImageFile) return;
    try {
      await navigator.share({
        title: `Tax Invoice ${invoiceNumber}`,
        text: messageText,
        files: [compactImageFile],
      });
      onClose();
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Share cancelled or not supported.");
      }
    }
  };

  // Open WhatsApp directly to a specific phone number
  const handleSendToTargetPhone = async () => {
    if (!isPhoneValid) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    // Try to auto-copy the compact image to clipboard so user can instantly Ctrl+V
    if (compactImageBlob && typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": compactImageBlob,
          }),
        ]);
        toast.success("Bill image copied! Press Ctrl+V in WhatsApp to attach.", { duration: 4000 });
      } catch {}
    }

    const encoded = encodeURIComponent(messageText);
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;
    window.open(url, "_blank");
    onClose();
  };

  // Open WhatsApp generally (user selects contact/group inside WhatsApp)
  const handleSendGeneral = async () => {
    if (compactImageBlob && typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": compactImageBlob,
          }),
        ]);
        toast.success("Bill image copied! Press Ctrl+V in WhatsApp to attach.", { duration: 4000 });
      } catch {}
    }

    const encoded = encodeURIComponent(messageText);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/60 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Share Invoice on WhatsApp
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {invoiceNumber} • ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* SECTION 1: Recipient Phone ("Sent to whom") */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Send to Whom (WhatsApp Number):</span>
              </label>
              {hasCustomerPhone ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                  <UserCheck className="w-3 h-3" />
                  Saved on Client
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-3 h-3" />
                  No Phone on Client
                </span>
              )}
            </div>

            {!hasCustomerPhone && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Customer <strong>{client.name || "Customer"}</strong> does not have a saved phone number.
                Enter their mobile number below, or choose any contact directly in WhatsApp.
              </p>
            )}

            <div className="flex items-center gap-2">
              <div className="flex items-center flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-2 select-none">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full bg-transparent text-xs font-mono font-medium text-slate-900 dark:text-slate-100 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Compact Bill Image Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Compact Bill Image:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="Copy image to clipboard to paste in WhatsApp"
                >
                  {copiedImage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedImage ? "Copied!" : "Copy Image"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  title="Download image"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            {/* Thumbnail Preview Card */}
            {compactImageDataUrl ? (
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 flex items-center gap-3">
                <img
                  src={compactImageDataUrl}
                  alt="Compact Bill Preview"
                  className="w-20 h-24 object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-white shadow-xs shrink-0"
                />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    High-Res Compact E-Bill (Retina PNG)
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Includes seller particulars, item list, totals &amp; UPI QR code.
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                    💡 Auto-copied to clipboard! Press <strong>Ctrl+V</strong> inside WhatsApp chat.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400">
                Generating compact e-bill image...
              </div>
            )}
          </div>

          {/* SECTION 3: URL to Full Bill */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                <span>URL to Full Bill &amp; PDF:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>

            <div className="flex items-center bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs">
              <span className="font-mono text-slate-600 dark:text-slate-400 truncate select-all">
                {billUrl}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Customer can view, verify statutory GST breakdown, and download full A4 PDF anytime without logging in.
            </p>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          {/* Mobile Native Share (if supported) */}
          {canNativeShareFiles && (
            <button
              onClick={handleNativeShare}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Share Image + Bill Link via Mobile App</span>
            </button>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Primary Option: Send to entered phone */}
            <button
              onClick={handleSendToTargetPhone}
              disabled={!isPhoneValid}
              type="button"
              className={`flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer ${
                isPhoneValid
                  ? "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
              <span>
                {isPhoneValid
                  ? `Send to +91 ${cleanPhone}`
                  : "Enter phone number to send directly"}
              </span>
            </button>

            {/* Secondary Option: Choose Contact in WhatsApp */}
            <button
              onClick={handleSendGeneral}
              type="button"
              className="flex-1 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Choose Contact in WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
