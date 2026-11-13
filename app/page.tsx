"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  Camera,
  Download,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Printer,
  QrCode,
  Package,
  Wallet,
  Users,
  Calendar,
  ArrowRight,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { activateSandboxMode, seedSandboxData } from "@/lib/sandboxData";

function getCurrentGSTUrgencyMessage() {
  const today = new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const gstMonthIndex = today.getMonth() - 1;
  const gstYear = gstMonthIndex < 0 ? today.getFullYear() - 1 : today.getFullYear();
  const gstMonthName = monthNames[(gstMonthIndex + 12) % 12];

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
  if (daysLeft < 0) urgency = "Overdue. File immediately to minimize Section 50 interest";
  else if (daysLeft === 0) urgency = "Due today. Generate portal JSON";
  else if (daysLeft <= 3) urgency = `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`;
  else if (daysLeft <= 7) urgency = `${daysLeft} days remaining`;
  else urgency = "Due on the 20th under Section 39";

  return `${gstMonthName} ${gstYear} GSTR-3B filing — ${urgency}`;
}

export default function WelcomePage() {
  const [activeTemplate, setActiveTemplate] = useState<"modern" | "classic" | "minimal" | "pos">("modern");
  const [invoiceVolume, setInvoiceVolume] = useState<number>(150);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const handleLaunchSandbox = async () => {
    activateSandboxMode();
    await seedSandboxData().catch(() => {});
    window.location.href = "/dashboard";
  };

  const manualHours = Math.round((invoiceVolume * 12) / 60);
  const automatedHours = Math.round((invoiceVolume * 0.8) / 60);
  const hoursSaved = Math.max(1, manualHours - automatedHours);
  const moneySaved = hoursSaved * 450;

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 transition-colors selection:bg-emerald-100 dark:selection:bg-emerald-950/60">
      
      {/* ---------------- Sticky Navigation ---------------- */}
      <header className="fixed inset-x-0 top-0 z-50 bg-[#fafaf9]/90 dark:bg-[#141415]/90 backdrop-blur-md border-b border-black/[0.08] dark:border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-700 text-white rounded-lg flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                GST<span className="text-emerald-700 dark:text-emerald-400">Lens</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-black/[0.06] dark:border-white/[0.06]">
                Rule 46 statutory
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5 text-xs text-stone-600 dark:text-stone-400 font-normal">
            <Link href="/free-invoice-generator" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Free invoice
            </Link>
            <Link href="/gst-calculator" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              GST calculator
            </Link>
            <Link href="/hsn-code" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              HSN directory
            </Link>
            <a href="#features" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 px-2 py-1 font-normal transition-colors"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={handleLaunchSandbox}
              className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs transition cursor-pointer"
            >
              Try live sandbox
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Hero Section ---------------- */}
      <section className="pt-24 pb-14 px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Statutory Filing Reminder Tag */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-normal bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-black/[0.08] dark:border-white/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>{getCurrentGSTUrgencyMessage()}</span>
          </div>
        </div>

        {/* Hero Headings */}
        <div className="text-center max-w-3xl mx-auto mb-9">
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Statutory GST billing, OCR bill capture, and portal returns
          </h1>

          <p className="mt-3.5 text-sm sm:text-base text-stone-600 dark:text-stone-400 max-w-2xl mx-auto leading-relaxed">
            Create Rule 46 compliant invoices with dynamic UPI QR codes, digitize paper bills locally with OCR, and export portal-ready GSTR-1 and GSTR-3B offline tool JSON without sharing portal passwords.
          </p>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleLaunchSandbox}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <span>Try live sandbox (zero signup)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <Link
              href="/invoices"
              className="px-4 py-2.5 bg-white dark:bg-[#1a1917] hover:bg-stone-100 dark:hover:bg-[#23211e] text-stone-800 dark:text-stone-200 border border-black/[0.08] dark:border-white/[0.08] font-medium rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <span>Create invoice</span>
            </Link>

            <Link
              href="/dashboard"
              className="px-3.5 py-2.5 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-normal rounded-lg text-xs transition"
            >
              Open dashboard
            </Link>
          </div>

          {/* Statutory Guarantees */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-5 text-xs text-stone-500 dark:text-stone-400 font-normal">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              Zero GST portal password required
            </span>
            <span className="flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-stone-400" />
              NPCI Bharat UPI dynamic QR
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-400" />
              Offline IndexedDB local storage
            </span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              GSTR-1 &amp; GSTR-3B offline tool JSON
            </span>
          </div>
        </div>

        {/* ---------------- The Hero Moment: Interactive Rule 46 Invoice Studio ---------------- */}
        <div className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161513] shadow-sm overflow-hidden">
          {/* Studio Header & Template Toggles */}
          <div className="px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Rule 46 document canvas
              </p>
              <h3 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                Statutory tax invoice preview
              </h3>
            </div>

            {/* Template Selector */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-lg text-xs font-normal">
              {(["modern", "classic", "minimal", "pos"] as const).map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setActiveTemplate(tpl)}
                  className={`px-2.5 py-1 rounded-md capitalize transition cursor-pointer ${
                    activeTemplate === tpl
                      ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium shadow-xs"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
                >
                  {tpl === "pos" ? "80mm POS" : tpl}
                </button>
              ))}
            </div>
          </div>

          {/* Live Invoice Canvas */}
          <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Invoice Body */}
            <div className="lg:col-span-8 bg-[#fafaf9] dark:bg-[#1c1a18] rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-5 text-xs space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div>
                  <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100">
                    Sharma Enterprises
                  </h4>
                  <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                    GSTIN: 27AABCU9603R1ZM • State: Maharashtra (27)
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    B-402, Trade Tower, Bandra Kurla Complex, Mumbai 400051
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                    Tax invoice
                  </span>
                  <p className="text-xs font-mono font-medium text-stone-800 dark:text-stone-200 mt-1">
                    #INV/2026-27/0042
                  </p>
                  <p className="text-[11px] text-stone-400 font-mono">Date: 28-Oct-2026</p>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 text-[11px] py-1">
                <div>
                  <span className="text-[10px] text-stone-400 block font-normal">
                    Billed to (buyer)
                  </span>
                  <p className="font-medium text-stone-800 dark:text-stone-200 mt-0.5">Apex Techworks Pvt Ltd</p>
                  <p className="text-stone-500 font-mono">GSTIN: 07AAAAA0000A1Z5</p>
                  <p className="text-stone-500">Connaught Place, New Delhi (07)</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-400 block font-normal">
                    Place of supply (POS)
                  </span>
                  <p className="font-medium text-stone-800 dark:text-stone-200 mt-0.5">07 - Delhi (Inter-state)</p>
                  <p className="text-stone-500">Applicable tax: IGST @ 18%</p>
                </div>
              </div>

              {/* Item Table */}
              <div className="border border-black/[0.06] dark:border-white/[0.06] rounded-md overflow-hidden text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 dark:bg-stone-900/80 text-stone-600 dark:text-stone-400 font-medium">
                    <tr>
                      <th className="p-2">Item description</th>
                      <th className="p-2 text-center">HSN/SAC</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate</th>
                      <th className="p-2 text-right">Taxable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.05] dark:divide-white/[0.05] font-mono">
                    <tr>
                      <td className="p-2 font-sans font-normal text-stone-800 dark:text-stone-200">
                        Cloud architecture &amp; GST integration
                      </td>
                      <td className="p-2 text-center text-stone-500">998313</td>
                      <td className="p-2 text-right">1 Unit</td>
                      <td className="p-2 text-right">₹50,000.00</td>
                      <td className="p-2 text-right font-medium">₹50,000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="text-[11px] text-stone-500">
                  <span className="font-normal">Amount in words: </span>
                  <span className="text-stone-700 dark:text-stone-300">Fifty-nine thousand rupees only</span>
                </div>

                <div className="space-y-1 text-right text-[11px] w-full sm:w-auto font-mono">
                  <div className="flex justify-between sm:justify-end gap-6 text-stone-500">
                    <span>Taxable base:</span>
                    <span>₹50,000.00</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-stone-700 dark:text-stone-300">
                    <span>IGST (18%):</span>
                    <span>₹9,000.00</span>
                  </div>
                  <div className="flex justify-between sm:justify-end gap-6 text-xs font-semibold text-stone-900 dark:text-stone-100 pt-1 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="font-sans font-medium">Total payable:</span>
                    <span className="tabular-nums">₹59,000.00</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: NPCI QR & Statutory Verification */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-[#fafaf9] dark:bg-[#1c1a18] rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-4 text-center space-y-2.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-black/[0.06] dark:border-white/[0.06]">
                  <QrCode className="w-3 h-3" /> NPCI Bharat QR format
                </span>
                <p className="text-xs font-medium text-stone-900 dark:text-stone-100">
                  Scan to settle invoice with UPI
                </p>
                <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg border border-black/[0.08] flex items-center justify-center">
                  <div className="w-full h-full bg-stone-900 rounded flex items-center justify-center text-white text-[9px] font-mono p-1 text-center">
                    upi://pay?pa=sharma@upi&amp;am=59000
                  </div>
                </div>
                <p className="text-[10px] text-stone-400">
                  Works with GPay, PhonePe, Paytm, and BHIM
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-[#1f1d1a] border border-black/[0.06] dark:border-white/[0.06] text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-stone-800 dark:text-stone-200 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>Statutory compliance checks</span>
                </div>
                <ul className="text-[11px] text-stone-500 dark:text-stone-400 space-y-0.5">
                  <li>• Section 170 nearest rupee round-off applied</li>
                  <li>• Rule 46(b) sequential invoice numbering</li>
                  <li>• Section 16(2) input tax credit verified</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ---------------- 8 Statutory Documents Section ---------------- */}
      <section className="py-14 px-4 sm:px-6 max-w-5xl mx-auto border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-9">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            Statutory voucher coverage
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100">
            Eight official tax documents in one ledger
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Generate every government-mandated commercial note and voucher in standard statutory format.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatutoryBadge title="Tax invoice" desc="Rule 46 B2B and B2C with HSN breakdown" />
          <StatutoryBadge title="Proforma invoice" desc="Pre-payment quotes with GST estimate" />
          <StatutoryBadge title="Credit note" desc="Section 34(1) sales return adjustments" />
          <StatutoryBadge title="Debit note" desc="Section 34(3) supplemental tax claims" />
          <StatutoryBadge title="Bill of supply" desc="Composition scheme &amp; exempt goods" />
          <StatutoryBadge title="Delivery challan" desc="Rule 55 goods transit without sale" />
          <StatutoryBadge title="Quotations" desc="Pre-sales quotation to invoice conversion" />
          <StatutoryBadge title="Purchase order" desc="Vendor procurement purchase orders" />
        </div>
      </section>

      {/* ---------------- Features Grid ---------------- */}
      <section id="features" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            Engineered for Indian accounts
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100">
            Ledger, billing, and tax return toolchain
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Everything an Indian enterprise or accountant needs for monthly accounting and tax audits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FeatureCard
            icon={<Receipt className="w-5 h-5 text-stone-600 dark:text-stone-400" />}
            title="GST Rule 46 billing"
            description="Automatic intra-state (CGST+SGST) vs inter-state (IGST) split, Section 170 rupee rounding, reverse charge (RCM), and line item trade discounts."
            link="/invoices"
          />

          <FeatureCard
            icon={<Camera className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />}
            title="Local bill OCR capture"
            description="Capture paper bills with your device camera or drop multi-page PDFs. Neural OCR extracts seller GSTINs, invoice dates, HSNs, and tax values."
            link="/dashboard"
          />

          <FeatureCard
            icon={<Download className="w-5 h-5 text-stone-600 dark:text-stone-400" />}
            title="GSTR-1, 2B &amp; 3B returns"
            description="Export official government offline tool JSON files and reconcile GSTR-2B input tax credits directly against recorded purchase registers."
            link="/gstr-1"
          />

          <FeatureCard
            icon={<Printer className="w-5 h-5 text-stone-600 dark:text-stone-400" />}
            title="80mm thermal POS receipts"
            description="High-speed retail counter billing with barcode scanning, custom shop headers, and instant thermal receipt printing."
            link="/invoices/new"
          />

          <FeatureCard
            icon={<Package className="w-5 h-5 text-stone-600 dark:text-stone-400" />}
            title="Stock &amp; inventory ledger"
            description="Real-time stock ledger. Automatic stock deduction on invoice generation, replenishment on purchase entry, and min-quantity alerts."
            link="/inventory"
          />

          <FeatureCard
            icon={<Users className="w-5 h-5 text-stone-600 dark:text-stone-400" />}
            title="Parties &amp; client ledgers"
            description="Directory of customers and suppliers. Live running balance ledgers, GSTIN verification, PAN derivation, and credit terms."
            link="/clients"
          />

          <FeatureCard
            icon={<Wallet className="w-5 h-5 text-stone-600 dark:text-stone-400" />}
            title="Payment vouchers &amp; receipts"
            description="Record payments via cash, bank transfer, UPI, or cheque. Auto-settle unpaid invoices and generate printable vouchers."
            link="/receipts"
          />

          <FeatureCard
            icon={<FileSpreadsheet className="w-5 h-5 text-stone-600 dark:text-stone-400" />}
            title="Operating expenses"
            description="Categorize operating costs by Income Tax heads (Salaries, Rent, Utilities, Freight) under Section 37 business deductions."
            link="/expenses"
          />

          <FeatureCard
            icon={<Calendar className="w-5 h-5 text-stone-600 dark:text-stone-400" />}
            title="Recurring invoices"
            description="Automate monthly, quarterly, or yearly retainer client billing with 1-click generation and ledger recording."
            link="/recurring"
          />
        </div>
      </section>

      {/* ---------------- Time & Cost Savings Estimator ---------------- */}
      <section className="py-14 px-4 sm:px-6 max-w-4xl mx-auto border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="bg-white dark:bg-[#161513] rounded-xl p-5 sm:p-7 border border-black/[0.08] dark:border-white/[0.08] shadow-xs space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2 text-xs">
              <span className="font-medium text-stone-800 dark:text-stone-200">
                Monthly invoices processed (sales + purchases)
              </span>
              <span className="font-mono font-medium text-sm text-emerald-700 dark:text-emerald-400 tabular-nums">
                {invoiceVolume} bills / month
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={invoiceVolume}
              onChange={(e) => setInvoiceVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-700"
            />
            <div className="flex justify-between text-[11px] text-stone-400 mt-1.5 font-mono">
              <span>20 bills</span>
              <span>250 bills</span>
              <span>500 bills</span>
              <span>1,000 bills</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-[#fafaf9] dark:bg-[#1a1917] border border-black/[0.06] dark:border-white/[0.06] text-center">
              <span className="text-[11px] text-stone-500 block">Filing time saved</span>
              <p className="text-xl font-mono font-semibold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
                {hoursSaved} hrs
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">per month</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#fafaf9] dark:bg-[#1a1917] border border-black/[0.06] dark:border-white/[0.06] text-center">
              <span className="text-[11px] text-stone-500 block">Estimated accounting cost saved</span>
              <p className="text-xl font-mono font-semibold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                ₹{moneySaved.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">at ₹450/hr accounting rate</p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#fafaf9] dark:bg-[#1a1917] border border-black/[0.06] dark:border-white/[0.06] text-center">
              <span className="text-[11px] text-stone-500 block">Rule 88C variance</span>
              <p className="text-xl font-mono font-semibold text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
                0%
              </p>
              <p className="text-[10px] text-stone-400 mt-0.5">DRC-01B notice prevention</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Transparent Pricing ---------------- */}
      <section id="pricing" className="py-14 px-4 sm:px-6 max-w-4xl mx-auto border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-center max-w-2xl mx-auto mb-9">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            Transparent OCR pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100">
            Pay-as-you-go credit packs
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            All offline invoicing, POS receipts, and inventory tracking are included. Credits only apply to AI OCR scans.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <CreditPack credits="50" price="100" per="₹2.00" label="Starter" />
          <CreditPack
            credits="150"
            price="250"
            per="₹1.67"
            highlight
            badge="Popular"
            label="Growing business"
          />
          <CreditPack
            credits="350"
            price="500"
            per="₹1.43"
            label="Accountant & practice"
          />
        </div>
      </section>

      {/* ---------------- Frequently Asked Questions ---------------- */}
      <section id="faq" className="py-14 px-4 sm:px-6 max-w-3xl mx-auto border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="text-center mb-8">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
            Questions &amp; answers
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 dark:text-stone-100">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-2">
          <FaqItem
            index={0}
            isOpen={faqOpen === 0}
            onClick={() => setFaqOpen(faqOpen === 0 ? null : 0)}
            question="Does GSTLens require my official GST portal password?"
            answer="No. GSTLens operates under a zero password mandate. We never ask for or store your government GST portal credentials, DSC private keys, or Aadhaar OTPs. You generate standardized government offline tool JSON files that you upload directly on gst.gov.in."
          />
          <FaqItem
            index={1}
            isOpen={faqOpen === 1}
            onClick={() => setFaqOpen(faqOpen === 1 ? null : 1)}
            question="Can I use GSTLens without an internet connection?"
            answer="Yes. GSTLens is built with an offline-first architecture using browser-local IndexedDB. You can create invoices, manage clients, deduct stock in POS mode, and view ledgers even during network outages. Data synchronizes smoothly once connected."
          />
          <FaqItem
            index={2}
            isOpen={faqOpen === 2}
            onClick={() => setFaqOpen(faqOpen === 2 ? null : 2)}
            question="How does the AI OCR bill scanning work?"
            answer="You can snap a photo with your mobile camera or upload PDF invoices. The neural OCR extracts seller GSTIN, invoice number, date, HSN codes, and CGST/SGST/IGST tax rates with statutory validation checks."
          />
          <FaqItem
            index={3}
            isOpen={faqOpen === 3}
            onClick={() => setFaqOpen(faqOpen === 3 ? null : 3)}
            question="How are dynamic NPCI UPI QR codes generated?"
            answer="GSTLens embeds a standard NPCI Bharat QR string on every invoice. When a customer scans it using GPay, PhonePe, Paytm, or BHIM, the payee VPA, business name, invoice number, and exact payable amount are auto-filled for instant error-free settlement."
          />
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#12110f] py-10 px-4 sm:px-6 text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6 pb-8 border-b border-black/[0.06] dark:border-white/[0.06]">
          
          <div className="col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-700 text-white rounded-md flex items-center justify-center font-medium">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-stone-900 dark:text-stone-100 text-sm">
                GST<span className="text-emerald-700 dark:text-emerald-400">Lens</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm leading-normal">
              Statutory GST billing, OCR bill digitization, and offline return generation for Indian businesses.
            </p>
            <p className="text-[11px] text-stone-400">
              Compliant with CGST Rules 2017 and Section 170.
            </p>
          </div>

          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100 mb-2">Ledger</p>
            <ul className="space-y-1.5">
              <li><Link href="/invoices" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">Tax invoices</Link></li>
              <li><Link href="/purchases" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">Purchase bills</Link></li>
              <li><Link href="/gstr-1" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">GSTR-1 outward</Link></li>
              <li><Link href="/gstr-2b" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">GSTR-2B reconcile</Link></li>
              <li><Link href="/gstr-3b" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">GSTR-3B summary</Link></li>
              <li><Link href="/inventory" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">Inventory</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100 mb-2">Utilities</p>
            <ul className="space-y-1.5">
              <li><Link href="/free-invoice-generator" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">Free invoice generator</Link></li>
              <li><Link href="/gst-calculator" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">GST calculator</Link></li>
              <li><Link href="/hsn-code" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">HSN code directory</Link></li>
              <li><Link href="/gst-info" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">GSTIN search</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-stone-900 dark:text-stone-100 mb-2">Legal</p>
            <ul className="space-y-1.5">
              <li><Link href="/terms" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">Terms of service</Link></li>
              <li><Link href="/privacy" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">Privacy policy</Link></li>
              <li><Link href="/login" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">Sign in</Link></li>
              <li><Link href="/credits" className="hover:text-stone-900 dark:hover:text-stone-100 transition-colors">Credits</Link></li>
            </ul>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-stone-400">
          <p>© {new Date().getFullYear()} GSTLens. All rights reserved.</p>
          <p>Private software utility. Not operated by GSTN or CBIC.</p>
        </div>
      </footer>

    </div>
  );
}

/* ---------------- Helper Subcomponents ---------------- */

function StatutoryBadge({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-3 rounded-lg bg-white dark:bg-[#161513] border border-black/[0.06] dark:border-white/[0.06] text-left">
      <div className="flex items-center gap-1.5 text-stone-800 dark:text-stone-200 font-medium text-xs">
        <FileText className="w-3.5 h-3.5 text-stone-400" />
        <span>{title}</span>
      </div>
      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-normal">{desc}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
}) {
  const content = (
    <div className="h-full bg-white dark:bg-[#161513] rounded-lg p-4 sm:p-5 border border-black/[0.06] dark:border-white/[0.06] flex flex-col justify-between hover:border-black/[0.12] dark:hover:border-white/[0.12] transition-colors">
      <div>
        <div className="w-8 h-8 rounded-md bg-stone-100 dark:bg-stone-900 flex items-center justify-center mb-3">
          {icon}
        </div>
        <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 mb-1">{title}</h3>
        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">{description}</p>
      </div>

      {link && (
        <div className="mt-3 pt-2.5 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center text-[11px] font-medium text-emerald-700 dark:text-emerald-400 gap-1">
          <span>View</span>
          <ArrowRight className="w-3 h-3" />
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
      className={`relative bg-white dark:bg-[#161513] rounded-lg p-5 border flex flex-col justify-between ${
        highlight
          ? "border-emerald-700/60 dark:border-emerald-500/60 shadow-xs"
          : "border-black/[0.08] dark:border-white/[0.08]"
      }`}
    >
      {badge && (
        <div className="absolute -top-2.5 left-4 bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-medium">
          {badge}
        </div>
      )}

      <div className="text-center pt-1">
        <span className="text-xs font-normal text-stone-500 dark:text-stone-400">{label}</span>
        <div className="text-2xl font-mono font-medium text-stone-900 dark:text-stone-100 mt-1 tabular-nums">
          {credits} <span className="text-xs font-normal text-stone-400">scans</span>
        </div>
        <div className="text-xl font-mono font-semibold text-stone-900 dark:text-stone-100 mt-0.5 tabular-nums">
          ₹{price}
        </div>
        <p className="text-[11px] text-stone-400 mt-0.5 mb-4">{per} per invoice</p>
      </div>

      <Link
        href="/credits"
        className={`block w-full py-2 rounded-md font-medium text-xs text-center transition ${
          highlight
            ? "bg-emerald-700 hover:bg-emerald-800 text-white"
            : "bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200"
        }`}
      >
        Select pack
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
    <div className="bg-white dark:bg-[#161513] rounded-lg border border-black/[0.06] dark:border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={onClick}
        className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-medium text-stone-900 dark:text-stone-100 cursor-pointer"
      >
        <span>{question}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 text-stone-400 shrink-0 transition-transform ${
            isOpen ? "rotate-90 text-emerald-700 dark:text-emerald-400" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-3.5 pb-3.5 text-xs text-stone-500 dark:text-stone-400 border-t border-black/[0.04] dark:border-white/[0.04] pt-2.5 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
