import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "@/context/AuthContext";

/* ---------------- Fonts ---------------- */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ---------------- SEO Metadata ---------------- */

export const metadata: Metadata = {
  title: {
    default: "GSTLens – Smart GST Invoice & Return Filing",
    template: "%s | GSTLens",
  },
  description:
    "GSTLens helps you upload invoice photos, auto-extract GST data, and generate GST portal-ready GSTR-1 and GSTR-3B JSON files in minutes. Secure, fast, and accurate.",

  keywords: [
    "GST filing",
    "GSTR-1 JSON",
    "GSTR-3B JSON",
    "GST invoice scanner",
    "GST software India",
    "invoice OCR GST",
    "GST return automation",
    "GST invoice upload",
  ],

  authors: [{ name: "GSTLens Team" }],
  creator: "GSTLens",
  publisher: "GSTLens",

  metadataBase: new URL("https://gstlens.in"), // 🔁 change when live

  openGraph: {
    title: "GSTLens – File GST Returns in Minutes",
    description:
      "Upload invoice images → auto-extract GST data → download ready-to-upload GSTR-1 & GSTR-3B JSON files.",
    url: "https://gstlens.in",
    siteName: "GSTLens",
    images: [
      {
        url: "/og-image.png", // 🔁 add this image later
        width: 1200,
        height: 630,
        alt: "GSTLens – Smart GST Filing",
      },
    ],
    locale: "en_IN",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "GSTLens – Smart GST Filing",
    description:
      "Auto-extract GST invoices and generate GSTR-1 & GSTR-3B JSON instantly.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "Finance",
};

/* ---------------- Root Layout ---------------- */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-black min-h-screen`}
      >
        <AuthProvider>{children}</AuthProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
