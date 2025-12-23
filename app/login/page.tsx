"use client";

import {
  Receipt,
  Zap,
  FileCheck,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Clock,
  Lock,
} from "lucide-react";
import LoginButton from "@/components/LoginButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none"></div>

      {/* Gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float-delayed"></div>
      </div>

      <div className="relative w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Value proposition */}
        <div className="hidden lg:block space-y-8 px-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300 font-medium">
                AI-Powered GST Platform
              </span>
            </div>

            <h2 className="text-5xl font-bold text-white leading-tight">
              File GST Returns in
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Under 60 Seconds
              </span>
            </h2>

            <p className="text-lg text-slate-300">
              Skip the spreadsheets. Just snap photos of your invoices and let
              AI handle everything—from extraction to GSTR filing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              value="10,000+"
              label="Returns Filed"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              value="95%"
              label="Time Saved"
            />
          </div>

          <div className="space-y-4 pt-4">
            <FeatureHighlight
              icon={<Zap className="w-5 h-5" />}
              title="Instant Processing"
              desc="Upload invoices via photo, PDF, or Excel. AI extracts all data in seconds."
            />
            <FeatureHighlight
              icon={<FileCheck className="w-5 h-5" />}
              title="Auto-Generate Returns"
              desc="Download GSTR-1 and GSTR-3B JSON files ready for portal upload."
            />
            <FeatureHighlight
              icon={<Lock className="w-5 h-5" />}
              title="Bank-Grade Security"
              desc="Your data is encrypted end-to-end. We never access your GST credentials."
            />
          </div>
        </div>

        {/* Right side - Login card */}
        <div className="relative">
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-slate-200">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                  <Receipt className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Welcome to GSTLens
              </h1>
              <p className="text-slate-600">
                Sign in to start filing GST returns effortlessly
              </p>
            </div>

            {/* Mobile-only features */}
            <div className="lg:hidden space-y-3 mb-8">
              <MobileFeature
                icon={<Zap className="w-4 h-4" />}
                text="AI-powered invoice extraction"
              />
              <MobileFeature
                icon={<FileCheck className="w-4 h-4" />}
                text="Instant GSTR-1 & GSTR-3B generation"
              />
              <MobileFeature
                icon={<ShieldCheck className="w-4 h-4" />}
                text="Secure Google login only"
              />
            </div>

            {/* Login Button */}
            <LoginButton />

            {/* Trust badges */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>AI-Powered</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-slate-500 mt-6">
              By continuing, you agree to our{" "}
              <a
                href="#"
                className="text-purple-600 hover:underline font-medium"
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-purple-600 hover:underline font-medium"
              >
                Privacy Policy
              </a>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-400 mt-6">
            © 2025 GSTLens • Built for Indian businesses
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 20s ease-in-out infinite;
          animation-delay: -10s;
        }
        .bg-grid-white\/\[0\.02\] {
          background-image: linear-gradient(
              to right,
              rgb(255 255 255 / 0.02) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgb(255 255 255 / 0.02) 1px,
              transparent 1px
            );
          background-size: 64px 64px;
        }
      `}</style>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
      <div className="text-purple-400 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

function FeatureHighlight({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-semibold text-white text-sm mb-1">{title}</h4>
        <p className="text-sm text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function MobileFeature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
      <div className="text-purple-600">{icon}</div>
      <span className="text-sm text-slate-700">{text}</span>
    </div>
  );
}
