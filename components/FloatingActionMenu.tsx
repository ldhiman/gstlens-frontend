"use client";

import { useState, useRef } from "react";

type Props = {
  onUpload: (file: File) => void;
};

export default function FloatingActionMenu({ onUpload }: Props) {
  const [open, setOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
      setOpen(false);
      e.target.value = "";
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Menu */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 space-y-3">
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="block w-48 bg-white shadow-lg rounded-lg px-4 py-3 text-left"
          >
            📄 Upload Image / PDF
          </button>

          <button
            onClick={() => captureInputRef.current?.click()}
            className="block w-48 bg-white shadow-lg rounded-lg px-4 py-3 text-left"
          >
            📷 Capture Image
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-black text-white text-2xl shadow-lg"
      >
        +
      </button>

      {/* Hidden Inputs */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
