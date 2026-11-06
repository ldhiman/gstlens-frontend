import Link from "next/link";
import {
  Receipt,
  ShieldCheck,
  ArrowLeft,
  Lock,
  Eye,
  Server,
  FileCheck2,
  Database,
  UserCheck,
  Mail,
  AlertCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = {
  title: "Privacy Policy | GSTLens",
  description: "Privacy policy and data protection practices of GSTLens under the Digital Personal Data Protection Act, 2023.",
};

export default function PrivacyPage() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>DPDP Act 2023 & IT Act Compliant</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Last Updated: October 2026 • Commitment to Indian Data Privacy & Zero Password Storage
            </p>
          </div>

          {/* Key Privacy Highlights Card */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
              <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <p className="font-bold text-xs text-slate-900 dark:text-white">Zero Portal Password</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                We never request, handle, or store your GSTN portal login password.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 space-y-1">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <p className="font-bold text-xs text-slate-900 dark:text-white">Offline-First IndexedDB</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your invoices, clients, and inventory reside locally in your own browser storage.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 space-y-1">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <p className="font-bold text-xs text-slate-900 dark:text-white">Never Sold or Monitored</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                We never monetize, sell, or rent your private financial books to third parties.
              </p>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
            <p className="font-bold text-slate-900 dark:text-white mb-2">Table of Contents</p>
            <div className="grid sm:grid-cols-2 gap-1.5 text-indigo-600 dark:text-indigo-400">
              <a href="#collection" className="hover:underline">1. Information We Collect</a>
              <a href="#usage" className="hover:underline">2. How We Use Your Information</a>
              <a href="#ai-ocr" className="hover:underline">3. AI OCR & Image Processing</a>
              <a href="#security" className="hover:underline">4. Data Storage & Encryption Standards</a>
              <a href="#sharing" className="hover:underline">5. Third-Party Service Providers</a>
              <a href="#user-rights" className="hover:underline">6. Your Rights Under DPDP Act 2023</a>
              <a href="#retention" className="hover:underline">7. Data Retention & Erasure</a>
              <a href="#grievance" className="hover:underline">8. Grievance Redressal & Contact</a>
            </div>
          </div>

          {/* Section 1 */}
          <section id="collection" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">1</span>
              Information We Collect
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              To deliver statutory GST billing, AI bill scanning, and tax return automation, we collect only the minimum required information:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li><strong>Account Credentials:</strong> Basic identity data provided via Google OAuth, including your display name, email address, profile picture URL, and Firebase unique user identifier (UID).</li>
              <li><strong>Business Profile Data:</strong> Legal business trade name, Goods and Services Tax Identification Number (GSTIN), Permanent Account Number (PAN), registered office address, state jurisdiction code, bank account details (IFSC and account number for invoice remittance notes), and UPI Virtual Payment Address (VPA).</li>
              <li><strong>Billing & Ledger Records:</strong> Customer details, product catalogs, HSN/SAC codes, invoice numbers, tax slabs (CGST, SGST, IGST), and transaction amounts.</li>
              <li><strong>Scanned Document Files:</strong> Purchase bills and invoices uploaded for AI OCR data extraction.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section id="usage" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">2</span>
              How We Use Your Information
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We process your data strictly to fulfill the following operational purposes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li>Generating GST Rule 46 compliant PDF Tax Invoices, Delivery Challans, and 80mm POS slips.</li>
              <li>Generating schema-validated GSTR-1 and GSTR-3B offline tool JSON files for direct submission to the government tax portal.</li>
              <li>Executing automated Section 16(2) Input Tax Credit (ITC) reconciliation and duplicate bill detection.</li>
              <li>Tracking account credit balances and authenticating user sessions.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="ai-ocr" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">3</span>
              AI OCR & Document Processing
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              When you upload physical receipts or invoice images for scanning, files are securely processed using enterprise Google Gemini Vision AI.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-white">Strict AI Data Confidentiality Guarantee:</p>
              <p>Your uploaded invoices and financial scans are processed in-memory. They are <strong>NEVER used to train public foundation artificial intelligence models</strong>, nor shared with non-essential third parties.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section id="security" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">4</span>
              Data Storage & Encryption Standards
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We employ bank-grade security protocols adhering to the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li><strong>In-Transit Security:</strong> All API and database communications are encrypted using modern Transport Layer Security (TLS 1.3).</li>
              <li><strong>Rest Encryption:</strong> Cloud data is secured with AES-256 encryption.</li>
              <li><strong>Local Sandboxing:</strong> Invoices stored in your browser IndexedDB are restricted to the origin domain and never accessible by external web applications.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="sharing" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">5</span>
              Third-Party Service Providers
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We engage only trusted infrastructure partners bound by rigorous confidentiality agreements:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li><strong>Firebase (Google LLC):</strong> User authentication and cloud document database.</li>
              <li><strong>Razorpay:</strong> RBI-authorized payment gateway for subscription credit packages (Card, UPI, Netbanking). GSTLens does not store credit card or CVV details.</li>
              <li><strong>Google Cloud:</strong> AI OCR inference engine.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="user-rights" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">6</span>
              Your Rights Under DPDP Act 2023
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Under India&apos;s Digital Personal Data Protection Act, 2023, you retain sovereign rights over your business and personal information:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li><strong>Right to Access:</strong> You can review all invoices, customer ledgers, and transactions anytime via the interface.</li>
              <li><strong>Right to Data Portability:</strong> You can export full JSON backups or CSV tax workpapers with a single click.</li>
              <li><strong>Right to Correction & Erasure:</strong> You can update incorrect GSTIN profiles or permanently erase your IndexedDB local database from the Settings screen.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="retention" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">7</span>
              Data Retention & Erasure
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              We retain account data for the duration of your active subscription or account existence. If you decide to close your account, you can initiate complete account and data deletion by sending a request to our Data Protection Officer.
            </p>
          </section>

          {/* Section 8: Grievance Officer */}
          <section id="grievance" className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center text-xs">8</span>
              Grievance Redressal & Contact Officer
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              In accordance with the Information Technology Act, 2000 and DPDP Act 2023 rules, the details of our Grievance Officer are:
            </p>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">Grievance Redressal Officer</p>
              <p className="text-slate-600 dark:text-slate-400">GSTLens Legal & Privacy Compliance Cell</p>
              <p className="text-slate-600 dark:text-slate-400">Email: <a href="mailto:privacy@gstlens.in" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">privacy@gstlens.in</a></p>
              <p className="text-slate-500 text-[11px] mt-1">Response time: Within 48 business hours as mandated by statutory regulations.</p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} GSTLens. All rights reserved.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/terms" className="hover:text-indigo-600">Terms of Service</Link>
            <Link href="/login" className="hover:text-indigo-600">Login</Link>
            <Link href="/" className="hover:text-indigo-600">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
