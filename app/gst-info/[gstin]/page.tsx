type Props = {
  params: { gstin: string };
};

import {
  Building2,
  CheckCircle,
  XCircle,
  MapPin,
  FileText,
  Award,
  Shield,
  Calendar,
  Hash,
  ArrowLeft,
} from "lucide-react";
import { fetchGSTInfo } from "@/lib/api";

/* ---------- Server Fetch ---------- */
async function fetchGSTInfoSSR(gstin: string) {
  const res = await fetchGSTInfo(gstin);
  if (!res?.data) return null;
  return res.data;
}

/* ---------- Page ---------- */
export default async function GSTInfoResultPage({ params }: Props) {
  const gstin = (await params).gstin.toUpperCase();
  const data = await fetchGSTInfoSSR(gstin);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 px-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <XCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            GSTIN Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The GST number you entered could not be found in the system. Please
            verify and try again.
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 mx-auto">
            <ArrowLeft className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/30">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            GSTIN Verified
          </h1>
          <p className="text-gray-600">
            Registration details retrieved successfully
          </p>
        </div>

        {/* Status Hero Card */}
        <div
          className={`rounded-3xl shadow-2xl border overflow-hidden mb-6 bg-gradient-to-br from-emerald-500 to-teal-600`}
        >
          <div className="p-6 md:p-8 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8" />

                <div>
                  <p className="text-sm opacity-90 mb-1">Registration Status</p>
                  <p className="text-2xl font-bold">{data.status}</p>
                </div>
              </div>
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold">
                Verified
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mt-6">
              <p className="text-xs opacity-75 mb-2">
                GST Identification Number
              </p>
              <p className="text-2xl font-mono font-bold tracking-wide">
                {data.gstin}
              </p>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center gap-2 text-white">
              <Building2 className="w-5 h-5" />
              <h2 className="font-semibold text-base">Business Information</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <DetailRow
              icon={<Building2 className="w-5 h-5" />}
              label="Legal Name"
              value={data.legal_name}
              primary
            />
            <DetailRow
              icon={<Award className="w-5 h-5" />}
              label="Trade Name"
              value={data.trade_name}
            />
            <DetailRow
              icon={<FileText className="w-5 h-5" />}
              label="Constitution"
              value={data.constitution}
            />
          </div>
        </div>

        {/* Registration Details */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
            <div className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5" />
              <h2 className="font-semibold text-base">Registration Details</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <DetailRow
              icon={<MapPin className="w-5 h-5" />}
              label="State"
              value={data.state}
            />
            <DetailRow
              icon={<Hash className="w-5 h-5" />}
              label="State Code"
              value={data.state_code}
            />
            <DetailRow
              icon={<FileText className="w-5 h-5" />}
              label="PAN Number"
              value={data.pan_number}
              mono
            />
            {/* {data.registration_date && (
              <DetailRow
                icon={<Calendar className="w-5 h-5" />}
                label="Registration Date"
                value={data.registration_date}
              />
            )} */}
          </div>
        </div>

        {/* Address (if available) */}
        {/* {data.address && (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
              <div className="flex items-center gap-2 text-white">
                <MapPin className="w-5 h-5" />
                <h2 className="font-semibold text-base">
                  Principal Place of Business
                </h2>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 leading-relaxed">{data.address}</p>
            </div>
          </div>
        )} */}

        {/* Footer */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80">
            <Shield className="w-4 h-4 text-emerald-600" />
            <p className="text-xs text-gray-600 font-medium">
              Data verified from GST Network
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          <a
            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 active:scale-98 transition-all flex items-center gap-2"
            href="/gst-info"
          >
            <ArrowLeft className="w-5 h-5" />
            Search Another GSTIN
          </a>
        </div>
      </div>
    </div>
  );
}

/* ---------- Components ---------- */

function DetailRow({ icon, label, value, primary, mono }: any) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          primary
            ? "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
          {label}
        </p>
        <p
          className={`text-sm font-semibold text-gray-900 ${
            mono ? "font-mono" : ""
          }`}
        >
          {value || "-"}
        </p>
      </div>
    </div>
  );
}
