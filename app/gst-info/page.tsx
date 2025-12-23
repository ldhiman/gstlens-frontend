"use client";

import { useState } from "react";
import {
  Search,
  Building2,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function GSTInfoHomePage() {
  const [gstin, setGstin] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const router = useRouter();
  const validateGSTIN = (value: string) => {
    if (value.length === 0) {
      setIsValid(null);
      return;
    }
    setIsValid(value.length === 15);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gstin.length === 15) {
      router.push(`/gst-info/${gstin.toUpperCase()}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setGstin(value);
    validateGSTIN(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/30">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            GSTIN Lookup
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Verify GST registration details instantly
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
            <div className="flex items-center gap-2 text-white">
              <Search className="w-5 h-5" />
              <h2 className="font-semibold text-base">Search by GSTIN</h2>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            {/* Input Field */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">
                GST Identification Number
              </label>
              <div className="relative">
                <input
                  value={gstin}
                  onChange={handleInputChange}
                  placeholder="22AAAAA0000A1Z5"
                  className={`w-full bg-gray-50 border-2 rounded-2xl px-5 py-4 pr-12 text-gray-900 font-mono text-lg uppercase focus:outline-none focus:ring-2 transition-all ${
                    isValid === true
                      ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                      : isValid === false
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  }`}
                  required
                  minLength={15}
                  maxLength={15}
                />

                {/* Validation Icon */}
                {isValid === true && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600" />
                )}
                {isValid === false && gstin.length > 0 && (
                  <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-red-500" />
                )}
              </div>

              {/* Character Counter */}
              <div className="flex items-center justify-between mt-2 px-1">
                <p
                  className={`text-xs ${
                    isValid === false && gstin.length > 0
                      ? "text-red-600"
                      : "text-gray-500"
                  }`}
                >
                  {isValid === false && gstin.length > 0
                    ? "GSTIN must be exactly 15 characters"
                    : "Enter 15-character GSTIN"}
                </p>
                <p className="text-xs text-gray-400 font-mono">
                  {gstin.length}/15
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Get GST Information
            </button>
          </form>

          {/* Info Section */}
          <div className="px-6 md:px-8 pb-6 md:pb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    What you'll get
                  </h3>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Business name and legal details</li>
                    <li>• Registration status and type</li>
                    <li>• Principal place of business</li>
                    <li>• Date of registration</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GSTIN Format Guide */}
        <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/80">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">?</span>
            </div>
            GSTIN Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <FormatBox label="State Code" example="22" description="2 digits" />
            <FormatBox
              label="PAN Number"
              example="AAAAA0000A"
              description="10 characters"
            />
            <FormatBox
              label="Entity & Check"
              example="1Z5"
              description="3 characters"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FormatBox({ label, example, description }: any) {
  return (
    <div className="bg-white rounded-xl p-3 border border-gray-100">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      <p className="font-mono text-emerald-600 font-bold text-sm mb-1">
        {example}
      </p>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}
