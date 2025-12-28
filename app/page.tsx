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
  Star,
  Users,
  Clock,
  IndianRupee,
  ChevronRight,
} from "lucide-react";

/* ---------------- GST Urgency Logic ---------------- */

function getCurrentGSTUrgencyMessage() {
  const today = new Date();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // GST return is always for previous month
  const gstMonthIndex = today.getMonth() - 1;
  const gstYear =
    gstMonthIndex < 0 ? today.getFullYear() - 1 : today.getFullYear();
  const gstMonthName = monthNames[(gstMonthIndex + 12) % 12];

  // Due on 20th of current month
  const dueDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    20,
    23,
    59,
    59
  );

  const diffMs = dueDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let urgency: string;
  if (daysLeft < 0) urgency = "Overdue!";
  else if (daysLeft === 0) urgency = "Due Today!";
  else if (daysLeft <= 3)
    urgency = `Urgent! Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;
  else if (daysLeft <= 7) urgency = `Only ${daysLeft} days left`;
  else urgency = "File early to avoid late fees";

  return `${gstMonthName} ${gstYear} GSTR-3B — ${urgency}`;
}

/* ---------------- Page ---------------- */

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">GSTLens</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-gray-600 hover:text-indigo-600 font-medium transition"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-gray-600 hover:text-indigo-600 font-medium transition"
            >
              How it Works
            </a>
            <a
              href="#pricing"
              className="text-gray-600 hover:text-indigo-600 font-medium transition"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-gray-600 hover:text-indigo-600 font-medium transition"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition flex items-center gap-2"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-3 bg-orange-100 text-orange-800 px-6 py-3 rounded-full text-sm font-semibold mb-8 animate-pulse">
            <Sparkles className="w-5 h-5" />
            {getCurrentGSTUrgencyMessage()}
          </div>

          <div className="grid gap-16 items-center">
            <div className="order-1">
              <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
                Eliminate Manual GST Filing
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Forever
                </span>
              </h1>

              <p className="mt-8 text-xl text-gray-600 max-w-2xl">
                Snap invoice photos or upload PDFs → AI extracts all GST details
                instantly → Download ready-to-upload <strong>GSTR-1</strong> &{" "}
                <strong>GSTR-3B</strong> JSON files in seconds.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-6">
                <a
                  href="/login"
                  className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition flex items-center gap-3"
                >
                  Start Free Trial (10 Credits Free){" "}
                  <ChevronRight className="w-5 h-5" />
                </a>

                <div className="flex items-center gap-6 text-gray-600">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    No GST login required
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    Works on mobile
                  </div>
                </div>
              </div>

              <div className="mt-12 flex items-center gap-8">
                <div className="flex -space-x-6">
                  {[...Array(5)].map((_, i) => {
                    const seed = Math.floor(Math.random() * 100);

                    const avatarUrl = `https://randomuser.me/api/portraits/thumb/${
                      i % 2 === 0 ? "men" : "women"
                    }/${seed}.jpg`;

                    return (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-full border-4 border-white shadow overflow-hidden"
                      >
                        <img
                          src={avatarUrl}
                          alt={`User avatar ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
                <div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Trusted by 10,000+ Indian businesses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-6">
            Everything You Need for Effortless GST Compliance
          </h2>
          <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto">
            Accurate, fast, and secure — trusted by thousands of businesses
            across India.
          </p>

          <div className="grid md:grid-cols-3 gap-10">
            <FeatureCard
              icon={<Camera className="w-12 h-12" />}
              title="Instant Camera Capture"
              description="Snap photos of invoices directly in the app — even offline."
            />
            <FeatureCard
              icon={<Zap className="w-12 h-12" />}
              title="99% Accurate AI Extraction"
              description="Automatically detects GSTIN, taxable value, CGST, SGST, IGST with near-perfect accuracy."
              highlight
            />
            <FeatureCard
              icon={<Download className="w-12 h-12" />}
              title="One-Click Returns"
              description="Download ready-to-upload GSTR-1 and GSTR-3B JSON files instantly."
            />
            <FeatureCard
              icon={<Clock className="w-12 h-12" />}
              title="Save 20+ Hours/Month"
              description="No more manual entry or Excel headaches."
            />
            <FeatureCard
              icon={<IndianRupee className="w-12 h-12" />}
              title="Maximize ITC Claims"
              description="Never miss eligible input tax credits again."
            />
            <FeatureCard
              icon={<Users className="w-12 h-12" />}
              title="Multi-Device Sync"
              description="Access your data from phone, tablet, or desktop."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-16">
            File GST Returns in 3 Simple Steps
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            <StepCard
              number="1"
              icon={<Smartphone className="w-16 h-16" />}
              title="Upload Invoices"
              description="Take photos or upload PDF invoices from your device."
            />
            <StepCard
              number="2"
              icon={<Zap className="w-16 h-16" />}
              title="AI Extracts Data"
              description="GST details are automatically detected and organized."
            />
            <StepCard
              number="3"
              icon={<FileCheck className="w-16 h-16" />}
              title="Download & File"
              description="Get perfect GSTR-1 & GSTR-3B JSON files ready to upload on the GST portal."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="px-6 py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-center mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-xl text-gray-700 mb-16">
            Start free • Pay only for what you use • No hidden fees
          </p>

          {/* Pro Plan */}
          <div className="rounded-3xl p-10 shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white mb-16">
            <div className="text-center">
              <h3 className="text-3xl font-bold mb-4">Pro Subscription</h3>
              <div className="text-5xl font-extrabold mb-6">
                ₹499<span className="text-2xl font-normal">/month</span>
              </div>

              <ul className="space-y-5 mb-12 max-w-md mx-auto text-left">
                {[
                  "100 free credits every month",
                  "Unlimited cloud sync & history",
                  "Access on all devices",
                  "Priority email support",
                  "Cancel anytime",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-4">
                    <CheckCircle className="w-7 h-7 flex-shrink-0" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href="/credits"
                className="block w-full max-w-sm mx-auto py-4 rounded-2xl text-center font-bold text-lg bg-white text-indigo-700 hover:bg-gray-100 transition"
              >
                Subscribe to Pro
              </a>
            </div>
          </div>

          {/* Credit Packs */}
          <h3 className="text-3xl font-bold text-center mb-10">
            Or Buy One-Time Credit Packs
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <CreditPack credits="50" price="100" per="₹2.00" />
            <CreditPack
              credits="150"
              price="250"
              per="₹1.67"
              highlight
              badge="MOST POPULAR"
            />
            <CreditPack
              credits="350"
              price="500"
              per="₹1.43"
              badge="BEST VALUE"
            />
          </div>

          <p className="text-center text-sm text-gray-600 mt-10">
            Credits never expire • No subscription required • GST included in
            price
          </p>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <ShieldCheck className="w-20 h-20 mx-auto text-indigo-600 mb-8" />
          <h3 className="text-3xl lg:text-4xl font-bold mb-6">
            Your Data is 100% Secure
          </h3>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            End-to-end encryption • We never ask for your GST portal credentials
            • Fully compliant with Indian data laws • Images deleted after
            processing (optional permanent storage)
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 text-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl lg:text-6xl font-extrabold mb-8">
            Ready to Save Hours on GST Filing Every Month?
          </h2>
          <p className="text-xl mb-12 opacity-90">
            Join thousands of businesses simplifying compliance with AI.
          </p>
          <a
            href="/login"
            className="inline-block px-10 py-5 bg-white text-indigo-700 font-bold text-xl rounded-2xl shadow-2xl hover:bg-gray-100 transition"
          >
            Start Free Trial Now
          </a>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Components ---------------- */

function FeatureCard({
  icon,
  title,
  description,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-3xl p-10 shadow-lg text-center transition-all duration-300 hover:shadow-2xl hover:-translate-y-3 ${
        highlight ? "ring-4 ring-indigo-400 ring-offset-4" : ""
      }`}
    >
      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center text-indigo-600 mb-8">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-lg text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-8">
        {number}
      </div>
      <div className="w-28 h-28 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center text-indigo-600 mb-8">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-lg text-gray-600 max-w-sm mx-auto">{description}</p>
    </div>
  );
}

function CreditPack({
  credits,
  price,
  per,
  highlight = false,
  badge,
}: {
  credits: string;
  price: string;
  per: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative bg-white rounded-3xl p-8 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:-translate-y-2 ${
        highlight ? "ring-4 ring-indigo-500 scale-105" : ""
      }`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
          {badge}
        </div>
      )}

      <div className="text-center">
        <div className="text-5xl font-extrabold mb-2">{credits}</div>
        <p className="text-gray-600 mb-6">Credits</p>
        <div className="text-4xl font-extrabold text-indigo-600 mb-2">
          ₹{price}
        </div>
        <p className="text-xl text-gray-700 mb-10">{per} per invoice</p>

        <a href="/credits">
          <button className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition">
            Buy Now
          </button>
        </a>
      </div>
    </div>
  );
}
