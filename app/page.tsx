import Link from "next/link";
import {
  Receipt,
  Camera,
  Zap,
  Download,
  Smartphone,
  FileCheck,
  ShieldCheck,
  CheckCircle,
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
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

/* ---------------- GST Urgency Logic ---------------- */

function getCurrentGSTUrgencyMessage() {
  const today = new Date();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // GST return is always for previous month
  const gstMonthIndex = today.getMonth() - 1;
  const gstYear =
    gstMonthIndex < 0 ? today.getFullYear() - 1 : today.getFullYear();
  const gstMonthName = monthNames[(gstMonthIndex + 12) % 12];

  // Due on 20th of current month
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
  if (daysLeft < 0) urgency = "Overdue! File immediately";
  else if (daysLeft === 0) urgency = "Due Today!";
  else if (daysLeft <= 3)
    urgency = `Urgent! Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  else if (daysLeft <= 7) urgency = `Only ${daysLeft} days left`;
  else urgency = "File early to avoid late fees";

  return `${gstMonthName} ${gstYear} GSTR-3B — ${urgency}`;
}

/* ---------------- Page ---------------- */

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sticky Header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" /> GSTN Ready
                </span>
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Features
            </a>
            <a href="#how" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              How It Works
            </a>
            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Pricing
            </a>
            <a href="#compliance" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              CA Compliance
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition flex items-center gap-1.5"
            >
              Start Free <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            {getCurrentGSTUrgencyMessage()}
          </div>
        </div>

        <div className="text-center max-w-4xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Snap GST Bills. Generate Portal Returns in{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
              Seconds
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AI-powered invoice OCR and return automation for Indian MSMEs, Chartered Accountants, and tax consultants. 
            Download 100% portal-ready <strong>GSTR-1</strong> & <strong>GSTR-3B</strong> JSON and Excel workpapers instantly.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 active:scale-98 transition flex items-center justify-center gap-2 text-sm"
            >
              Get Started with 10 Free Credits <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-500" /> Try Interactive Demo
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> No GST Portal Password Required
            </span>
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-500" /> Flawless Mobile & Desktop
            </span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> CA-Ready Excel Workpapers
            </span>
          </div>
        </div>

        {/* Live Interactive Sandbox Preview Card */}
        <div className="relative max-w-4xl mx-auto rounded-3xl p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 shadow-2xl shadow-indigo-500/10">
          <div className="bg-white dark:bg-slate-900 rounded-[22px] p-6 sm:p-8 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  AI
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Real-time AI Tax Extraction Engine
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Extracts B2B/B2C, GSTIN, HSN, Taxable Value, CGST, SGST & IGST
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
                <CheckCircle className="w-3.5 h-3.5" /> 99.4% Tax Accuracy
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {/* Synthetic Preview Invoice */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-xs space-y-3 font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-800 dark:text-slate-200">INV-2026-901</span>
                  <span className="text-slate-500">24-10-2026</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Seller GSTIN</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">07AAACU4747P1ZR</span>
                  <span className="block text-[11px] text-slate-600 dark:text-slate-300">ROSMERTA SAFETY SYSTEMS LTD</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Buyer GSTIN & POS</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">29ABCDE1234F1Z5 • 07-Delhi</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold">
                  <span>Total Amount</span>
                  <span className="text-emerald-600 dark:text-emerald-400">₹11,800.00</span>
                </div>
              </div>

              {/* Extraction Output */}
              <div className="space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Taxable Value</span>
                    <span className="font-bold tabular-nums font-mono">₹10,000.00</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">IGST (Inter-State 18%)</span>
                    <span className="font-bold tabular-nums font-mono text-indigo-600 dark:text-indigo-400">₹1,800.00</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">GSTR-1 Bucket</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Table 4: B2B Invoices</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs">
                    <span className="font-semibold text-purple-800 dark:text-purple-300">GSTR-3B Bucket</span>
                    <span className="font-bold text-purple-800 dark:text-purple-300">Table 3.1(a) Outward Tax</span>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <Link
                    href="/dashboard"
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1"
                  >
                    Open Dashboard to upload real bills <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Engineered for Indian Taxation
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
            Everything Required for Effortless GST Returns
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
            Eliminate manual invoice data entry and portal schema errors. Designed for MSMEs, tax consultants, and accountants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Camera className="w-6 h-6" />}
            title="Instant Mobile Capture"
            description="Snap physical paper receipts with your camera. Pre-processed and optimized even in low light."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Sub-Second AI Extraction"
            description="Powered by Gemini Flash 2.5 to detect GSTIN, date, POS, item description, and tax slabs."
            highlight
          />
          <FeatureCard
            icon={<Download className="w-6 h-6" />}
            title="GST Portal JSON Engine"
            description="Generate official GSTR-1 and GSTR-3B offline JSON files 100% compliant with GSTN offline tool."
          />
          <FeatureCard
            icon={<FileSpreadsheet className="w-6 h-6" />}
            title="CA Multi-Sheet Excel Export"
            description="Download formatted Excel registers with B2B, B2CS, rate-wise schedules, and ITC summaries."
          />
          <FeatureCard
            icon={<IndianRupee className="w-6 h-6" />}
            title="ITC Maximization & Section 17(5)"
            description="Track eligible input tax credit and catch blocked credits before filing returns."
          />
          <FeatureCard
            icon={<ShieldCheck className="w-6 h-6" />}
            title="DRC-01B Risk Prevention"
            description="Automated reconciliation between GSTR-1 outward liability and GSTR-3B tax paid to avoid notices."
          />
        </div>
      </section>

      {/* 3 Step Workflow */}
      <section id="how" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-100/60 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Simple 3-Step Flow
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2 mb-14">
            How GSTLens Streamlines Your Monthly Filing
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              icon={<Smartphone className="w-8 h-8" />}
              title="Upload Invoices"
              description="Drop PDF bills or snap photos on your phone. Direct bulk file selection supported."
            />
            <StepCard
              number="2"
              icon={<Zap className="w-8 h-8" />}
              title="AI Extracts & Validates"
              description="GSTIN validity, place of supply, and tax rates are verified automatically against GST rules."
            />
            <StepCard
              number="3"
              icon={<FileCheck className="w-8 h-8" />}
              title="Download & File"
              description="Download portal-ready GSTR-1 / 3B JSON files and upload directly to gst.gov.in."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-2">
            Pay Only For Invoices You Process
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm">
            Start free with 10 credits • No subscription required to get started
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <CreditPack credits="50" price="100" per="₹2.00" label="Starter" />
          <CreditPack
            credits="150"
            price="250"
            per="₹1.67"
            highlight
            badge="MOST POPULAR"
            label="Professional"
          />
          <CreditPack
            credits="350"
            price="500"
            per="₹1.43"
            badge="BEST VALUE"
            label="Enterprise CA"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm">GSTLens</p>
              <p className="text-[11px]">Intelligent GST Invoice & Return Filing for India</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition">
              Dashboard
            </Link>
            <Link href="/gstr-1" className="hover:text-slate-900 dark:hover:text-white transition">
              GSTR-1
            </Link>
            <Link href="/gstr-3b" className="hover:text-slate-900 dark:hover:text-white transition">
              GSTR-3B
            </Link>
            <Link href="/credits" className="hover:text-slate-900 dark:hover:text-white transition">
              Credits
            </Link>
            <Link href="/profile" className="hover:text-slate-900 dark:hover:text-white transition">
              Profile
            </Link>
          </div>

          <p>© 2026 GSTLens. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function FeatureCard({
  icon,
  title,
  description,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border transition-all duration-300 hover:shadow-lg ${
        highlight
          ? "border-indigo-500/80 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30"
          : "border-slate-200/80 dark:border-slate-800"
      }`}
    >
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 relative">
      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center absolute -top-3.5 left-6 shadow-sm">
        {number}
      </div>
      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 mt-2">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
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
      className={`relative bg-white dark:bg-slate-900 rounded-3xl p-7 border transition-all duration-300 ${
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

        <Link
          href="/credits"
          className={`block w-full py-3 rounded-xl font-bold text-xs text-center transition ${
            highlight
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25"
              : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
          }`}
        >
          Buy Pack
        </Link>
      </div>
    </div>
  );
}
