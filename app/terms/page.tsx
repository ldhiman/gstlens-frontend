import Link from "next/link";
import {
  Receipt,
  ShieldCheck,
  ArrowLeft,
  Scale,
  FileText,
  AlertTriangle,
  CreditCard,
  Lock,
  Building,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "Terms of Service | GSTLens",
  description: "Terms of Service and legal agreements governing the use of GSTLens software and services.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-all">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              GST<span className="text-indigo-600 dark:text-indigo-400">Lens</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-sm space-y-8">
          
          {/* Title Header */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-3">
              <Scale className="w-3.5 h-3.5" />
              <span>Legal & Statutory Terms</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Last Updated: October 2026 • Effective for all users, businesses, and registered accounts
            </p>
          </div>

          {/* Statutory Highlight Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Statutory Government Notice</p>
              <p className="leading-relaxed">
                GSTLens is an independent software tool developed for billing, accounting, and tax compliance automation. GSTLens is <strong>NOT</strong> affiliated with, operated by, or endorsed by the Goods and Services Tax Network (GSTN), Central Board of Indirect Taxes and Customs (CBIC), or the Government of India. Official tax filings must be finalized through the official GST Common Portal (<strong>gst.gov.in</strong>).
              </p>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
            <p className="font-bold text-slate-900 dark:text-white mb-2">Summary of Sections</p>
            <div className="grid sm:grid-cols-2 gap-1.5 text-indigo-600 dark:text-indigo-400">
              <a href="#acceptance" className="hover:underline">1. Acceptance & Eligibility</a>
              <a href="#services" className="hover:underline">2. Description of Services & AI OCR</a>
              <a href="#compliance" className="hover:underline">3. User Responsibility & Statutory Compliance</a>
              <a href="#credits" className="hover:underline">4. Billing, Subscriptions & Credit Packs</a>
              <a href="#credentials" className="hover:underline">5. Zero Portal Password Policy</a>
              <a href="#offline" className="hover:underline">6. Offline Storage & Local Encryption</a>
              <a href="#liability" className="hover:underline">7. Limitation of Liability & Disclaimers</a>
              <a href="#governing" className="hover:underline">8. Governing Law & Dispute Resolution</a>
            </div>
          </div>

          {/* Section 1 */}
          <section id="acceptance" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">1</span>
              Acceptance & Eligibility
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              By accessing, browsing, installing, or creating an account on GSTLens (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) and our Privacy Policy. If you are entering into this agreement on behalf of a partnership, private limited company, LLP, or other legal entity, you represent and warrant that you possess the full legal authority to bind such entity.
            </p>
          </section>

          {/* Section 2 */}
          <section id="services" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">2</span>
              Description of Services & AI Features
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              GSTLens provides business software tools including:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li>Statutory GST Rule 46 Tax Invoices, Proforma Invoices, Credit Notes, Debit Notes, Delivery Challans, and Bills of Supply.</li>
              <li>Artificial Intelligence optical character recognition (AI OCR) powered by Google GenAI for invoice and purchase bill digitization.</li>
              <li>Generation of standardized GSTR-1 and GSTR-3B offline tool JSON files for direct upload to the GST Common Portal.</li>
              <li>Automated Input Tax Credit (ITC) reconciliation under Section 16(2) of the Central Goods and Services Tax Act, 2017.</li>
              <li>Dynamic NPCI Bharat UPI QR payment code generation for instant invoice settlements.</li>
              <li>80mm POS thermal receipt printing and retail counter workflows.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="compliance" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">3</span>
              User Responsibility & Statutory Compliance
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              You acknowledge that tax compliance is an individualized legal duty. You are strictly responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li>Verifying that GSTINs, PANs, HSN/SAC codes, and tax rates (0%, 5%, 12%, 18%, 28%) applied to line items conform to current notification schedules issued by the GST Council.</li>
              <li>Reviewing extracted data from AI OCR scans prior to finalizing purchase ledgers or filing statutory returns.</li>
              <li>Ensuring that consecutive invoice numbering follows statutory Rule 46(b) requirements within each Financial Year (1st April to 31st March).</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="credits" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">4</span>
              Billing, Subscriptions & Credit Packs
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Certain features on GSTLens, including AI OCR bill extractions and advanced cloud integrations, consume digital credits or require active paid subscriptions.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li><strong>Payment Processing:</strong> Payments are securely processed through RBI-authorized payment aggregators (e.g., Razorpay) in Indian Rupees (INR).</li>
              <li><strong>Refunds:</strong> Purchased credit packages are non-refundable once activated or consumed, except in instances of verified technical billing duplicates.</li>
              <li><strong>Pricing Changes:</strong> We reserve the right to revise pricing or credit pack tiers upon 14 days of prior electronic notice.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="credentials" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">5</span>
              Zero GST Portal Password Policy
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              GSTLens operates with a strict <strong>Zero Password Mandate</strong>. We will never ask for, record, or transmit your official GST Portal password, Digital Signature Certificate (DSC) private keys, or Aadhaar OTPs. Official returns are uploaded by you using offline tool JSON files directly through the government portal.
            </p>
          </section>

          {/* Section 6 */}
          <section id="offline" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">6</span>
              Offline Storage & Local Encryption
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              GSTLens utilizes client-side IndexedDB databases to ensure high performance and offline resilience. Users are strongly encouraged to periodically download complete JSON backups via the <strong>Settings &gt; Data Backup</strong> module. GSTLens is not responsible for data loss arising from browser cache purging or hardware failure on the user&apos;s device.
            </p>
          </section>

          {/* Section 7 */}
          <section id="liability" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">7</span>
              Limitation of Liability & Disclaimers
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              To the fullest extent permitted under applicable Indian law, GSTLens and its officers, directors, and employees shall not be liable for any indirect, incidental, punitive, or consequential damages, including:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li>Late filing fees or penalties levied under Section 47 of the CGST Act, or interest assessed under Section 50.</li>
              <li>Tax demands or DRC-01 notices resulting from inaccurate user data entries.</li>
              <li>Temporary downtime or network disruptions of third-party services, including Google Cloud, Firebase, or Razorpay.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="governing" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">8</span>
              Governing Law & Dispute Resolution
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              These Terms shall be governed by, interpreted, and construed in accordance with the laws of the Republic of India. Any legal dispute, controversy, or claim arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts located in New Delhi, India.
            </p>
          </section>

          {/* Contact Box */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Have Questions Regarding Our Terms?</p>
              <p className="text-[11px] text-slate-500">Our compliance and legal team is available to assist your business.</p>
            </div>
            <a
              href="mailto:support@gstlens.in"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
            >
              Contact Legal Team
            </a>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} GSTLens. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
            <Link href="/login" className="hover:text-indigo-600">Login</Link>
            <Link href="/" className="hover:text-indigo-600">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
