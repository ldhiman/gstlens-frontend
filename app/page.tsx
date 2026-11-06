"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  Camera,
  Zap,
  Download,
  Smartphone,
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Star,
  Users,
  Clock,
  IndianRupee,
  ChevronRight,
  FileSpreadsheet,
  Building2,
  FileText,
  Printer,
  QrCode,
  RefreshCw,
  Sliders,
  BarChart3,
  Layers,
  Lock,
  Package,
  Wallet,
  Send,
  Calendar,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Tag,
  Check,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ---------------- GST Urgency Logic ---------------- */

function getCurrentGSTUrgencyMessage() {
  const today = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // GST return is for previous month
  const gstMonthIndex = today.getMonth() - 1;
  const gstYear = gstMonthIndex < 0 ? today.getFullYear() - 1 : today.getFullYear();
  const gstMonthName = monthNames[(gstMonthIndex + 12) % 12];

  // Due on 20th of current month for GSTR-3B
  const dueDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    20,
    23,
    59,
    59
  );

  const diffMs = dueDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let urgency: string;
  if (daysLeft < 0) urgency = "Overdue! File immediately to minimize Section 50 interest";
  else if (daysLeft === 0) urgency = "Due Today! Generate portal JSON now";
  else if (daysLeft <= 3) urgency = `Urgent! Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  else if (daysLeft <= 7) urgency = `Only ${daysLeft} days left`;
  else urgency = "File early to avoid late fees under Sec 47";

  return `${gstMonthName} ${gstYear} GSTR-3B Filing — ${urgency}`;
}

export default function WelcomePage() {
  const [activeTemplate, setActiveTemplate] = useState<"modern" | "classic" | "minimal" | "pos">("modern");
  const [invoiceVolume, setInvoiceVolume] = useState<number>(150);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Time and money savings calculation
  const manualHours = Math.round((invoiceVolume * 12) / 60);
  const automatedHours = Math.round((invoiceVolume * 0.8) / 60);
  const hoursSaved = Math.max(1, manualHours - automatedHours);
  const moneySaved = hoursSaved * 450; // standard accountant hourly cost in INR

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* ---------------- Sticky Navigation ---------------- */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> GSTN Compliant
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Statutory Billing
            </a>
            <a href="#ocr-returns" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              AI OCR & GSTR JSON
            </a>
            <a href="#pos-offline" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              80mm Thermal POS
            </a>
            <a href="#calculator" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              ROI Calculator
            </a>
            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Pricing
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs transition"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition flex items-center gap-1.5"
            >
              Open App <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------- Hero Section ---------------- */}
      <section className="pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Dynamic Statutory Urgency Banner */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span>{getCurrentGSTUrgencyMessage()}</span>
          </div>
        </div>

        {/* Hero Headings */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            India&apos;s Complete GST Billing,{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
              AI OCR & Return OS
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Create statutory <strong>GST Rule 46 Tax Invoices</strong> with dynamic NPCI UPI QR codes, digitize vendor bills via <strong>Gemini Vision AI OCR</strong>, and generate 100% portal-ready <strong>GSTR-1 & GSTR-3B offline tool JSON</strong> without ever exposing your GST portal password.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/invoices"
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2 text-sm"
            >
              <span>Create GST Invoice Now</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Explore Dashboard</span>
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Zero GST Portal Password Needed
            </span>
            <span className="flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-indigo-500" /> NPCI UPI Dynamic QR Codes
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-purple-500" /> 100% Offline IndexedDB Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> GSTR-1 & 3B Official JSON
            </span>
          </div>
        </div>

        {/* ---------------- Interactive Hero Preview Studio ---------------- */}
        <div className="max-w-5xl mx-auto rounded-3xl p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 shadow-2xl shadow-indigo-500/10">
          <div className="bg-white dark:bg-slate-900 rounded-[22px] p-5 sm:p-8 transition-colors">
            
            {/* Studio Header & Template Toggles */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Interactive Print Designer
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                  Statutory Rule 46 Document Engine
                </h3>
              </div>

              {/* Template Pills */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTemplate("modern")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTemplate === "modern"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Modern
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplate("classic")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTemplate === "classic"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Classic
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplate("minimal")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTemplate === "minimal"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Minimalist
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplate("pos")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTemplate === "pos"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  80mm POS
                </button>
              </div>
            </div>

            {/* Live Invoice Canvas Mock */}
            <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left invoice card */}
              <div className="lg:col-span-8 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 font-sans text-xs space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      SHARMA ENTERPRISES
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      GSTIN: 27AABCU9603R1ZM • State: Maharashtra (27)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      B-402, Trade Tower, Bandra Kurla Complex, Mumbai - 400051
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      TAX INVOICE
                    </span>
                    <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                      #INV/2026-27/0042
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">Date: 28-Oct-2026</p>
                  </div>
                </div>

                {/* Billed To */}
                <div className="grid grid-cols-2 gap-4 text-[11px] py-1">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                      Billed To (Buyer)
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Apex Techworks Pvt Ltd</p>
                    <p className="text-slate-500 font-mono">GSTIN: 07AAAAA0000A1Z5</p>
                    <p className="text-slate-500">Connaught Place, New Delhi (07)</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                      Place of Supply (POS)
                    </span>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">07 - Delhi (Inter-State)</p>
                    <p className="text-slate-500">Applicable Tax: IGST @ 18%</p>
                  </div>
                </div>

                {/* Line Item Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5 text-center">HSN/SAC</th>
                        <th className="p-2.5 text-right">Qty</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Taxable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                      <tr>
                        <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-slate-200">
                          Cloud Enterprise Architecture & GST Integration
                        </td>
                        <td className="p-2.5 text-center text-slate-500">998313</td>
                        <td className="p-2.5 text-right">1 Unit</td>
                        <td className="p-2.5 text-right">₹50,000.00</td>
                        <td className="p-2.5 text-right font-bold">₹50,000.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Calculation Footer */}
                <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-[11px] text-slate-500 max-w-xs">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Amount in Words:</p>
                    <p className="italic">Fifty-Nine Thousand Rupees Only</p>
                  </div>

                  <div className="space-y-1 text-right text-[11px] w-full sm:w-auto font-mono">
                    <div className="flex justify-between sm:justify-end gap-6 text-slate-600 dark:text-slate-400">
                      <span>Subtotal (Taxable):</span>
                      <span>₹50,000.00</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-indigo-600 dark:text-indigo-400 font-bold">
                      <span>IGST (18%):</span>
                      <span>₹9,000.00</span>
                    </div>
                    <div className="flex justify-between sm:justify-end gap-6 text-sm font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span className="font-sans">Total Payable:</span>
                      <span>₹59,000.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Bharat UPI QR & Statutory Stamp */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                    <QrCode className="w-3.5 h-3.5" /> NPCI Bharat QR Spec
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Scan & Pay with Any UPI App
                  </h4>
                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl shadow-xs border border-slate-200 flex flex-col items-center justify-center">
                    {/* Simulated SVG QR */}
                    <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-900 rounded flex items-center justify-center text-white text-[10px] font-mono p-2 text-center">
                      upi://pay?pa=sharma@upi&am=59000
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    GPay, PhonePe, Paytm, BHIM & Bank UPI Compatible
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Statutory Audit Guarantee</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <li>• Section 170 nearest rupee round-off applied</li>
                    <li>• Rule 46(b) sequential invoice numbering</li>
                    <li>• Section 16(2) input tax credit validated</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 8 Statutory Documents Section ---------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            All Statutory Vouchers Included
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1.5">
            8 Indian Tax Documents in One Unified Engine
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Generate every government-mandated invoice, note, and challan without needing multiple software subscriptions.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatutoryBadge title="Tax Invoice" desc="Rule 46 B2B & B2C with HSN breakdown" />
          <StatutoryBadge title="Proforma Invoice" desc="Pre-payment quotes with GST estimate" />
          <StatutoryBadge title="Credit Note" desc="Section 34(1) returns & rate adjustments" />
          <StatutoryBadge title="Debit Note" desc="Section 34(3) supplemental tax claims" />
          <StatutoryBadge title="Bill of Supply" desc="Composition dealers & exempt goods" />
          <StatutoryBadge title="Delivery Challan" desc="Rule 55 goods transit without sale" />
          <StatutoryBadge title="Estimate / Quote" desc="Pre-sales quotation to invoice conversion" />
          <StatutoryBadge title="Purchase Order" desc="Standard procurement orders for vendors" />
        </div>
      </section>

      {/* ---------------- Features & Ecosystem Grid ---------------- */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Engineered for Modern Indian Trade
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
            The Complete Enterprise Suite for MSMEs & CAs
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Everything your business needs: from retail counter point-of-sale to annual audit workpapers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <FeatureCard
            icon={<Receipt className="w-6 h-6" />}
            title="GST Rule 46 Billing"
            description="Automatic intra-state (CGST+SGST) vs inter-state (IGST) split, Section 170 rupee rounding, reverse charge (RCM), and line discounts."
            link="/invoices"
          />

          <FeatureCard
            icon={<Camera className="w-6 h-6" />}
            title="Gemini AI Bill Scanner"
            description="Snap paper bills with your phone camera or drop multi-page PDFs. AI automatically extracts GSTINs, invoice dates, HSNs, and tax values."
            highlight
            link="/dashboard"
          />

          <FeatureCard
            icon={<Download className="w-6 h-6" />}
            title="GSTR-1, 2B & 3B Statutory Returns"
            description="Download official government offline tool JSON files and reconcile GSTR-2B input tax credits directly against recorded purchase bills."
            link="/gstr-1"
          />

          <FeatureCard
            icon={<Printer className="w-6 h-6" />}
            title="80mm Thermal POS Slip"
            description="High-speed retail counter billing with barcode scanning, custom shop headers, and instant thermal receipt printing."
            link="/invoices/new"
          />

          <FeatureCard
            icon={<Package className="w-6 h-6" />}
            title="Inventory & Low Stock Alerts"
            description="Real-time stock ledger. Automatic stock deduction on invoice generation, replenishment on purchase entry, and min-quantity alerts."
            link="/inventory"
          />

          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Parties & Live Client Ledgers"
            description="Centralized directory of customers and suppliers. Live running balance ledgers, GSTIN verification, PAN mapping, and credit terms."
            link="/clients"
          />

          <FeatureCard
            icon={<Wallet className="w-6 h-6" />}
            title="Payment Receipts & Vouchers"
            description="Record payments via Cash, Bank, UPI, or Cheque. Auto-settle unpaid tax invoices and generate printable payment vouchers."
            link="/receipts"
          />

          <FeatureCard
            icon={<FileSpreadsheet className="w-6 h-6" />}
            title="Expenses & ITR Head Allocation"
            description="Categorize operating costs by Income Tax heads (Salaries, Rent, Utilities, Depreciation) under Section 37 deductions."
            link="/expenses"
          />

          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Recurring Retainer Invoices"
            description="Automate monthly, quarterly, or yearly retainer client billing with 1-click generation and email dispatch."
            link="/recurring"
          />

        </div>
      </section>

      {/* ---------------- AI OCR & Return Architecture Deep-Dive ---------------- */}
      <section id="ocr-returns" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Zap className="w-3.5 h-3.5" />
              <span>Sub-Second Extraction</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Turn Crinkled Paper Bills into Portal Returns in Seconds
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Accountants and MSME business owners spend up to 14 hours every month typing purchase bills into spreadsheets. GSTLens eliminates manual labor with Gemini 2.5 Flash multimodal AI.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white block">Automated Place of Supply (POS) Detection</strong>
                  <span className="text-slate-500">Extracts 2-digit state codes to determine whether IGST or CGST+SGST applies.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white block">Section 16(2) Duplicate Detection</strong>
                  <span className="text-slate-500">Prevents claiming Input Tax Credit (ITC) twice for the same supplier invoice number in a single FY.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <strong className="text-slate-900 dark:text-white block">Official GSTR-1 Schema JSON</strong>
                  <span className="text-slate-500">Outputs Section 4A B2B, Section 7 B2CS, and Section 12 HSN summaries.</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
              >
                <span>Upload a Sample Bill Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Code & Extraction Mock */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white font-sans text-sm">AI OCR Extraction Output</span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-bold">
                Status: VALIDATED (99.4%)
              </span>
            </div>

            <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-[11px] overflow-x-auto space-y-1">
              <p><span className="text-slate-500">// Extracted Canonical Invoice Schema</span></p>
              <p>&#123;</p>
              <p>&nbsp;&nbsp;<span className="text-purple-400">&quot;invoice_number&quot;</span>: <span className="text-amber-300">&quot;DL-2026/889&quot;</span>,</p>
              <p>&nbsp;&nbsp;<span className="text-purple-400">&quot;supplier_gstin&quot;</span>: <span className="text-amber-300">&quot;07AABCS1429B1Z2&quot;</span>,</p>
              <p>&nbsp;&nbsp;<span className="text-purple-400">&quot;invoice_type&quot;</span>: <span className="text-amber-300">&quot;B2B&quot;</span>,</p>
              <p>&nbsp;&nbsp;<span className="text-purple-400">&quot;taxable_value&quot;</span>: <span className="text-cyan-300">84200.00</span>,</p>
              <p>&nbsp;&nbsp;<span className="text-purple-400">&quot;cgst&quot;</span>: <span className="text-cyan-300">7578.00</span>,</p>
              <p>&nbsp;&nbsp;<span className="text-purple-400">&quot;sgst&quot;</span>: <span className="text-cyan-300">7578.00</span>,</p>
              <p>&nbsp;&nbsp;<span className="text-purple-400">&quot;itc_eligibility&quot;</span>: <span className="text-amber-300">&quot;INPUTS_SECTION_16&quot;</span></p>
              <p>&#125;</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
              <p className="font-sans font-bold text-slate-800 dark:text-slate-200">GSTR-3B Table 4 Result:</p>
              <p className="font-sans mt-0.5">₹15,156.00 eligible ITC credited to Outward Liability ledger.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ---------------- ROI & Time Savings Calculator ---------------- */}
      <section id="calculator" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Interactive Calculator
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1.5">
            How Much Time & Money Does GSTLens Save You?
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Slide the volume of monthly invoices your business or CA firm processes to calculate direct savings.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-8">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                Monthly Invoices Processed (Sales + Purchases):
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                {invoiceVolume} bills / mo
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={invoiceVolume}
              onChange={(e) => setInvoiceVolume(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
              <span>20 bills</span>
              <span>250 bills</span>
              <span>500 bills</span>
              <span>1,000 bills</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 text-center">
              <span className="text-[11px] text-slate-500 uppercase font-bold block">Filing Time Saved</span>
              <p className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {hoursSaved} hrs
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Every single month</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-center">
              <span className="text-[11px] text-slate-500 uppercase font-bold block">Estimated Cost Saved</span>
              <p className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{moneySaved.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">In manual accounting fees</p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 text-center">
              <span className="text-[11px] text-slate-500 uppercase font-bold block">Penalty Risk</span>
              <p className="text-3xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
                0%
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">DRC-01B notice prevention</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Transparent Pricing ---------------- */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-200/80 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Pay-As-You-Go Credits
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
            Simple, Transparent Pricing with No Hidden Fees
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm">
            Top up credits as your business scales. All offline billing, POS receipts, and inventory tracking are included.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <CreditPack credits="50" price="100" per="₹2.00" label="Starter MSME" />
          <CreditPack
            credits="150"
            price="250"
            per="₹1.67"
            highlight
            badge="MOST POPULAR"
            label="Growing Business"
          />
          <CreditPack
            credits="350"
            price="500"
            per="₹1.43"
            badge="BEST VALUE FOR CAs"
            label="CA & Tax Practice"
          />
        </div>
      </section>

      {/* ---------------- Frequently Asked Questions ---------------- */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-100/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            <FaqItem
              index={0}
              isOpen={faqOpen === 0}
              onClick={() => setFaqOpen(faqOpen === 0 ? null : 0)}
              question="Does GSTLens require my official GST Portal password?"
              answer="Never. GSTLens operates under a strict Zero Password Mandate. We never ask for or store your government GST portal credentials, DSC private keys, or Aadhaar OTPs. We generate standardized government offline tool JSON files that you upload directly to gst.gov.in."
            />
            <FaqItem
              index={1}
              isOpen={faqOpen === 1}
              onClick={() => setFaqOpen(faqOpen === 1 ? null : 1)}
              question="Can I use GSTLens without an internet connection?"
              answer="Yes! GSTLens is built with an offline-first architecture using browser-local IndexedDB. You can create invoices, manage clients, deduct stock in POS mode, and view ledgers even during network outages. Data synchronizes smoothly once connected."
            />
            <FaqItem
              index={2}
              isOpen={faqOpen === 2}
              onClick={() => setFaqOpen(faqOpen === 2 ? null : 2)}
              question="How does the AI OCR bill scanning work?"
              answer="You can snap a photo with your mobile camera or upload PDF invoices. Our Gemini Vision AI automatically parses the seller GSTIN, invoice number, date, HSN codes, and CGST/SGST/IGST tax rates with 99.4% statutory accuracy."
            />
            <FaqItem
              index={3}
              isOpen={faqOpen === 3}
              onClick={() => setFaqOpen(faqOpen === 3 ? null : 3)}
              question="How are dynamic NPCI UPI QR codes generated?"
              answer="GSTLens embeds a standard NPCI Bharat QR string on every invoice. When a customer scans it using GPay, PhonePe, Paytm, or BHIM, the payee VPA, business name, invoice number, and exact payable amount are auto-filled for instant error-free settlement."
            />
          </div>
        </div>
      </section>

      {/* ---------------- High Impact CTA Banner ---------------- */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-indigo-600 via-indigo-700 to-emerald-600 text-white text-center shadow-2xl shadow-indigo-500/20 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Trusted by 15,000+ Indian Businesses & CAs</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-3xl mx-auto">
            Ready to Automate Your GST Invoicing & Monthly Filing?
          </h2>

          <p className="text-indigo-100 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Eliminate Excel data entry errors, generate professional UPI invoices, and upload audit-proof GSTR-1/3B returns in under 60 seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-700 font-extrabold rounded-2xl shadow-lg hover:bg-slate-50 transition active:scale-98 text-sm"
            >
              Get Started Now
            </Link>
            <Link
              href="/invoices"
              className="w-full sm:w-auto px-7 py-4 bg-indigo-800/60 hover:bg-indigo-800 text-white font-bold rounded-2xl border border-white/20 transition text-sm flex items-center justify-center gap-2"
            >
              <span>Create First Invoice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Comprehensive Footer ---------------- */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 pb-10 border-b border-slate-100 dark:border-slate-800">
          
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-900 dark:text-white text-base">
                GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              India&apos;s modern statutory GST billing, AI bill digitization, and return automation platform. Compliant with CGST Rules 2017 and Section 170.
            </p>
            <p className="text-[11px] text-slate-400">
              Proudly engineered for Indian MSMEs, Traders & Tax Practitioners 🇮🇳
            </p>
          </div>

          <div>
            <p className="font-bold text-slate-900 dark:text-white mb-3">Statutory Suite</p>
            <ul className="space-y-2">
              <li><Link href="/invoices" className="hover:text-indigo-600 transition">Tax Invoices (Rule 46)</Link></li>
              <li><Link href="/purchases" className="hover:text-indigo-600 transition">Purchase Register & ITC</Link></li>
              <li><Link href="/gstr-1" className="hover:text-indigo-600 transition">GSTR-1 Outward</Link></li>
              <li><Link href="/gstr-2b" className="hover:text-indigo-600 transition">GSTR-2B Reconcile</Link></li>
              <li><Link href="/gstr-3b" className="hover:text-indigo-600 transition">GSTR-3B Summary</Link></li>
              <li><Link href="/inventory" className="hover:text-indigo-600 transition">Inventory & Stock</Link></li>
              <li><Link href="/clients" className="hover:text-indigo-600 transition">Party Ledgers</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-slate-900 dark:text-white mb-3">Management</p>
            <ul className="space-y-2">
              <li><Link href="/expenses" className="hover:text-indigo-600 transition">Expenses (ITR Sec 37)</Link></li>
              <li><Link href="/receipts" className="hover:text-indigo-600 transition">Payment Vouchers</Link></li>
              <li><Link href="/recurring" className="hover:text-indigo-600 transition">Retainer Schedules</Link></li>
              <li><Link href="/reports" className="hover:text-indigo-600 transition">P&amp;L Statements</Link></li>
              <li><Link href="/settings" className="hover:text-indigo-600 transition">Backup & Settings</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-bold text-slate-900 dark:text-white mb-3">Legal & Security</p>
            <ul className="space-y-2">
              <li><Link href="/terms" className="hover:text-indigo-600 transition">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-indigo-600 transition">Privacy Policy (DPDP)</Link></li>
              <li><Link href="/login" className="hover:text-indigo-600 transition">Secure Login</Link></li>
              <li><Link href="/credits" className="hover:text-indigo-600 transition">Credit Pricing</Link></li>
              <li><a href="mailto:support@gstlens.in" className="hover:text-indigo-600 transition">Support &amp; Help</a></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p>© {new Date().getFullYear()} GSTLens. All statutory rights reserved.</p>
          <p className="text-slate-400">
            GSTLens is a private software solution and is not affiliated with or operated by GSTN or CBIC.
          </p>
        </div>
      </footer>

    </div>
  );
}

/* ---------------- Helper Subcomponents ---------------- */

function StatutoryBadge({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left hover:border-indigo-400 dark:hover:border-indigo-600 transition">
      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
        <FileText className="w-3.5 h-3.5" />
        <span>{title}</span>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  highlight = false,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
  link?: string;
}) {
  const content = (
    <div
      className={`h-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border transition-all duration-300 hover:shadow-lg flex flex-col justify-between ${
        highlight
          ? "border-indigo-500/80 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30"
          : "border-slate-200/80 dark:border-slate-800"
      }`}
    >
      <div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
          {icon}
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>

      {link && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 gap-1">
          <span>Explore Feature</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }
  return content;
}

function CreditPack({
  credits,
  price,
  per,
  highlight = false,
  badge,
  label,
}: {
  credits: string;
  price: string;
  per: string;
  highlight?: boolean;
  badge?: string;
  label: string;
}) {
  return (
    <div
      className={`relative bg-white dark:bg-slate-900 rounded-3xl p-7 border transition-all duration-300 flex flex-col justify-between ${
        highlight
          ? "border-indigo-600 shadow-xl shadow-indigo-500/10 scale-102"
          : "border-slate-200/80 dark:border-slate-800 shadow-xs"
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-wider shadow-sm">
          {badge}
        </div>
      )}

      <div className="text-center">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="text-4xl font-black text-slate-900 dark:text-white mt-2 mb-1 tabular-nums font-mono">
          {credits} <span className="text-xs font-normal text-slate-500">Credits</span>
        </div>
        <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-1 tabular-nums font-mono">
          ₹{price}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{per} per invoice</p>
      </div>

      <Link
        href="/credits"
        className={`block w-full py-3 rounded-xl font-bold text-xs text-center transition ${
          highlight
            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25"
            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
        }`}
      >
        Buy Credit Pack
      </Link>
    </div>
  );
}

function FaqItem({
  question,
  answer,
  isOpen,
  onClick,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden transition">
      <button
        type="button"
        onClick={onClick}
        className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white"
      >
        <span>{question}</span>
        <ChevronRight
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
            isOpen ? "rotate-90 text-indigo-600" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
