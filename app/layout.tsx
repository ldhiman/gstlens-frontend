import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "@/context/AuthContext";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GSTLens",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

/* ---------------- Root Layout ---------------- */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="GSTLens" />
        <meta name="theme-color" content="#4f46e5" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("gstlens_theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(!t&&d)){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-150`}
      >
        <AuthProvider>
          {children}
          <InstallPwaPrompt />
        </AuthProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
