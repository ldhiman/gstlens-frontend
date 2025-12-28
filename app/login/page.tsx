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
  ArrowRight,
} from "lucide-react";
import LoginButton from "@/components/LoginButton";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle animated grid */}
      <div className="absolute inset-0 bg-grid-white/[0.03] bg-[size:50px_50px] pointer-events-none"></div>

      {/* Floating gradient orbs with smoother animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse-slow-delayed"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      <div className="relative w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center z-10">
        {/* Left: Value Proposition (Desktop only) */}
        <div className="hidden lg:flex flex-col justify-center space-y-10 text-left px-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-purple-500/10 border border-purple-500/30 rounded-full">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="text-purple-300 font-medium">
                AI-Powered GST Compliance
              </span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              File GST Returns
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400">
                in Under 60 Seconds
              </span>
            </h1>

            <p className="text-xl text-slate-300 max-w-lg">
              No more manual data entry. Snap invoice photos or upload PDFs —
              our AI extracts everything and generates ready-to-upload GSTR-1 &
              GSTR-3B files instantly.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <TrendingUp className="w-8 h-8 text-purple-400 mb-3" />
              <div className="text-3xl font-bold text-white">15,000+</div>
              <div className="text-slate-400">Returns Filed This Month</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <Clock className="w-8 h-8 text-indigo-400 mb-3" />
              <div className="text-3xl font-bold text-white">97%</div>
              <div className="text-slate-400">Average Time Saved</div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-5">
            <FeatureItem
              icon={<Zap />}
              title="Lightning-Fast AI Extraction"
              desc="99% accurate GSTIN, tax & totals detection in seconds"
            />
            <FeatureItem
              icon={<FileCheck />}
              title="One-Click Returns"
              desc="Download perfect GSTR-1 & GSTR-3B JSON files instantly"
            />
            <FeatureItem
              icon={<ShieldCheck />}
              title="Zero Credentials Needed"
              desc="We never ask for your GST portal login — 100% secure"
            />
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-slate-200/50">
            {/* Logo */}
            <div className="flex justify-center mb-10">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>
                <div className="relative w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl">
                  <Receipt className="w-10 h-10 text-white" />
                </div>
              </div>
            </div>

            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Welcome Back to GSTLens
              </h2>
              <p className="text-slate-600">
                Sign in with Google to access your dashboard
              </p>
            </div>

            {/* Mobile features */}
            <div className="lg:hidden space-y-4 mb-10">
              <MobileFeature
                icon={<Zap />}
                text="Instant AI invoice processing"
              />
              <MobileFeature
                icon={<FileCheck />}
                text="Auto-generated GSTR-1 & GSTR-3B"
              />
              <MobileFeature
                icon={<ShieldCheck />}
                text="Secure — No GST credentials required"
              />
            </div>

            {/* Login Button */}
            <LoginButton />

            {/* If already logged in */}
            {user && (
              <a
                href="/dashboard"
                className="mt-6 block w-full text-center py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Go to Dashboard <ArrowRight className="inline w-5 h-5 ml-2" />
              </a>
            )}

            {/* Trust indicators */}
            <div className="mt-10 pt-8 border-t border-slate-200">
              <div className="flex justify-center gap-8 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-600" />
                  <span>End-to-End Encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>No GST Login Needed</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-slate-500 mt-8">
              By signing in, you agree to our{" "}
              <a
                href="#"
                className="text-purple-600 hover:underline font-medium"
              >
                Terms of Service
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

          <p className="text-center text-sm text-slate-400 mt-8">
            © {new Date().getFullYear()} GSTLens. All rights reserved.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.15);
          }
        }
        @keyframes pulse-slow-delayed {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.15);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 15s ease-in-out infinite;
        }
        .animate-pulse-slow-delayed {
          animation: pulse-slow-delayed 18s ease-in-out infinite;
          animation-delay: -8s;
        }
        .bg-grid-white\\/\\[0\\.03\\] {
          background-image: linear-gradient(
              to right,
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px
            ),
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px
            );
        }
      `}</style>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-5 group">
      <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 flex-shrink-0 group-hover:bg-purple-500/20 transition">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-slate-400 text-sm">{desc}</p>
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
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
      <div className="text-purple-600">{icon}</div>
      <span className="text-slate-800 font-medium">{text}</span>
    </div>
  );
}
