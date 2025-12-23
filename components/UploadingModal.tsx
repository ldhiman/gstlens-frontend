"use client";

import { FileText, Sparkles } from "lucide-react";

export default function UploadingModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white rounded-3xl px-6 py-8 shadow-2xl flex flex-col items-center max-w-sm w-full animate-scale-in">
        {/* Animated Icon Container */}
        <div className="relative mb-6">
          {/* Pulsing Background Rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-blue-500/20 rounded-full animate-ping" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-indigo-500/30 rounded-full animate-pulse" />
          </div>

          {/* Main Icon */}
          <div className="relative w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <FileText className="w-8 h-8 text-white animate-bounce" />
          </div>

          {/* Sparkle Effect */}
          <div className="absolute -top-1 -right-1">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* Progress Spinner */}
        <div className="relative w-12 h-12 mb-6">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Text Content */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Processing Invoice
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Extracting & verifying GST details...
          </p>
          <p className="text-sm text-gray-500 text-center">
            Please don’t close the app
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-2 mt-6">
          <div
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}

// Add this to your global CSS for the scale-in animation
const styles = `
@keyframes scale-in {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}
`;
