"use client";

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
} from "lucide-react";
import LoginButton from "@/components/LoginButton";
import { useAuth } from "@/context/AuthContext";

export default function WelcomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Fixed Header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">GSTLens</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() =>
                document
                  .getElementById("pricing")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="text-gray-700 hover:text-indigo-600 font-medium transition"
            >
              Pricing
            </button>
            <button
              onClick={() =>
                document
                  .getElementById("how")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="text-gray-700 hover:text-indigo-600 font-medium transition"
            >
              How it Works
            </button>
          </nav>

          <div className="flex items-center gap-4">
            {user && (
              <a href="/dashboard">
                <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition">
                  Dashboard
                </button>
              </a>
            )}
            <LoginButton />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-5xl mx-auto">
          {/* Urgency Banner */}
          <div className="inline-flex items-center gap-3 bg-orange-100 text-orange-800 px-6 py-3 rounded-full text-sm font-semibold mb-8 animate-pulse">
            <Sparkles className="w-5 h-5" />
            December GSTR-3B due by 20th January 2026 – File early & save on
            late fees!
          </div>

          <div className="flex justify-center mb-10">
            <div className="w-28 h-28 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
              <Receipt className="w-14 h-14 text-white" />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Simplify GST Filing <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Forever
            </span>
          </h1>

          <p className="mt-8 text-xl md:text-2xl text-gray-700 max-w-3xl mx-auto">
            Snap invoice photos → AI extracts data instantly → Download
            ready-to-upload <strong>GSTR-1</strong> and <strong>GSTR-3B</strong>{" "}
            JSON files in seconds.
          </p>

          <p className="mt-6 text-lg text-gray-600">
            Secure • No GST portal credentials needed • Works perfectly on
            mobile
          </p>

          <div className="mt-12">
            <LoginButton />
          </div>

          {user && (
            <a
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline"
            >
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </a>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-white/50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          <FeatureCard
            icon={<Camera className="w-10 h-10" />}
            title="Camera Upload"
            description="Take photos of invoices directly in the app – even offline."
          />
          <FeatureCard
            icon={<Zap className="w-10 h-10" />}
            title="AI-Powered Extraction"
            description="Automatically reads GSTIN, amounts, taxes, HSN – with 99% accuracy."
          />
          <FeatureCard
            icon={<Download className="w-10 h-10" />}
            title="Instant Returns"
            description="Generate official GSTR-1 & GSTR-3B JSON files with one tap."
          />
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-16">
            3 Steps to GST Compliance
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <StepCard
              number="1"
              icon={<Smartphone className="w-12 h-12" />}
              title="Upload Invoices"
              description="Snap photos or upload PDFs/images from your phone."
            />
            <StepCard
              number="2"
              icon={<Zap className="w-12 h-12" />}
              title="AI Extracts Data"
              description="All details – GSTIN, taxable value, CGST/SGST/IGST – filled automatically."
            />
            <StepCard
              number="3"
              icon={<FileCheck className="w-12 h-12" />}
              title="Download & File"
              description="Get perfect JSON files ready for GST portal upload."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="px-6 py-20 bg-gradient-to-br from-indigo-100/50 to-purple-100/50"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-extrabold text-center text-gray-900 mb-6">
            Transparent & Affordable Pricing
          </h2>
          <p className="text-center text-xl text-gray-700 mb-16">
            Pay only for invoices you process – no hidden fees
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <PricingCard
              title="Free Trial"
              price="₹0"
              subtitle="Try before you buy"
              features={[
                "10 free invoice credits",
                "Unlimited previews & edits",
                "Manual data entry",
                "GSTIN verification",
              ]}
              buttonText="Start Free Trial"
            />

            <PricingCard
              title="Credit Pack"
              price="₹100"
              subtitle="Most popular • Best value"
              highlight
              features={[
                "50 invoice credits",
                "Just ₹2 per invoice",
                "Full GSTR-1 & GSTR-3B generation",
                "Priority AI processing",
              ]}
              buttonText="Buy Credits"
            />

            <PricingCard
              title="Pro Monthly"
              price="Coming Soon"
              subtitle="Unlimited + Sync"
              disabled
              features={[
                "Unlimited invoices",
                "Cloud sync across devices",
                "Bulk upload",
                "Dedicated support",
              ]}
              buttonText="Join Waitlist"
            />
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border">
            <ShieldCheck className="w-16 h-16 mx-auto text-indigo-600 mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Your Data is 100% Secure
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              End-to-end encryption • No long-term storage of invoices • Google
              authentication only • Fully compliant with Indian data protection
              laws
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
          Ready to save hours on GST filing?
        </h2>
        <p className="text-xl mb-10 opacity-90">
          Join thousands of businesses filing faster and error-free
        </p>
        <LoginButton />
      </section>
    </div>
  );
}

/* Components */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-10 shadow-2xl border border-white/50 text-center hover:-translate-y-2 transition-all duration-300">
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center text-indigo-600 mb-8">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-lg text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({ number, icon, title, description }: any) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6 shadow-xl">
        {number}
      </div>
      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center text-indigo-600 mb-8">
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
      <p className="text-lg text-gray-600 max-w-sm mx-auto">{description}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  subtitle,
  features,
  highlight = false,
  disabled = false,
  buttonText,
}: any) {
  return (
    <div
      className={`rounded-3xl p-10 shadow-2xl border transition-all hover:shadow-3xl ${
        highlight
          ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white scale-105 -translate-y-6"
          : "bg-white"
      } ${disabled ? "opacity-70" : ""}`}
    >
      {highlight && (
        <div className="text-sm font-bold mb-2 text-indigo-100">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p
        className={`text-lg mb-6 ${highlight ? "opacity-90" : "text-gray-600"}`}
      >
        {subtitle}
      </p>
      <div className="text-5xl font-extrabold mb-8">{price}</div>

      <ul className="space-y-4 mb-10">
        {features.map((f: string) => (
          <li key={f} className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <span className="text-lg">{f}</span>
          </li>
        ))}
      </ul>

      <button
        disabled={disabled}
        className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
          highlight
            ? "bg-white text-indigo-700 hover:bg-gray-100"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {buttonText}
      </button>
    </div>
  );
}
