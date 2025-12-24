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

function getCurrentGSTUrgencyMessage() {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  // GSTR-3B is for the previous month
  // If today is 1st to 20th, filing for previous month, due this month 20th
  // If 21st onwards, filing for previous month, due was 20th this month (possibly overdue)
  let gstMonthIndex = currentMonth - 1;
  let gstYear = currentYear;
  if (gstMonthIndex < 0) {
    gstMonthIndex = 11;
    gstYear -= 1;
  }

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

  const gstMonthName = monthNames[gstMonthIndex];

  // Due date is always 20th of the month following the GST month
  let dueMonthIndex = currentMonth; // month after GST month
  let dueYear = currentYear;
  if (dueMonthIndex >= 12) {
    dueMonthIndex = 0;
    dueYear += 1;
  }
  const dueMonthName = monthNames[dueMonthIndex];

  const dueDate = new Date(dueYear, dueMonthIndex, 20, 23, 59, 59); // end of day
  const timeDiff = dueDate.getTime() - today.getTime();
  const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  let urgencyText = "";
  if (daysUntilDue <= 0) {
    urgencyText = "Overdue!";
  } else if (daysUntilDue <= 3) {
    urgencyText = `Urgent! Only ${daysUntilDue} day${
      daysUntilDue === 1 ? "" : "s"
    } left`;
  } else if (daysUntilDue <= 7) {
    urgencyText = `Only ${daysUntilDue} days left`;
  } else {
    urgencyText = `Due by 20 ${dueMonthName} ${dueYear}`;
  }

  return `${gstMonthName} ${gstYear} GSTR-3B ${urgencyText} – File early to avoid late fees!`;
}

export default function WelcomePage() {
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
            <a
              href="#pricing"
              className="text-gray-700 hover:text-indigo-600 font-medium transition"
            >
              Pricing
            </a>
            <a
              href="#how"
              className="text-gray-700 hover:text-indigo-600 font-medium transition"
            >
              How it Works
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a href="/dashboard">
              <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition">
                Dashboard
              </button>
            </a>
            <a href="/login">
              <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl transition">
                Login
              </button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-3 bg-orange-100 text-orange-800 px-6 py-3 rounded-full text-sm font-semibold mb-8 animate-pulse">
            <Sparkles className="w-5 h-5" />
            {getCurrentGSTUrgencyMessage()}
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

          <a
            href="/dashboard"
            className="mt-12 inline-block px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition"
          >
            Get Started
          </a>

          <a
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline"
          >
            Go to Dashboard <ArrowRight className="w-5 h-5" />
          </a>
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
            Simple & Flexible Pricing
          </h2>
          <p className="text-center text-xl text-gray-700 mb-16">
            Choose monthly subscription or one-time credit packs – whatever
            suits your business
          </p>

          {/* Pro Subscription Card */}
          <div className="grid grid-cols-1 gap-10 mb-12">
            <div className="rounded-3xl p-10 shadow-2xl border bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
              <h3 className="text-3xl font-bold mb-4">Pro Plan</h3>
              <div className="text-5xl font-extrabold mb-6">
                ₹499<span className="text-2xl font-normal">/month</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-white" />
                  <span className="text-lg">100 free credits every month</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-white" />
                  <span className="text-lg">Unlimited cloud backup & sync</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-white" />
                  <span className="text-lg">Access on all your devices</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-white" />
                  <span className="text-lg">Priority support</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5 text-white" />
                  <span className="text-lg">Cancel anytime</span>
                </li>
              </ul>
              <a href="/dashboard" className="block w-full">
                <button className="w-full py-4 rounded-2xl font-bold text-lg bg-white text-indigo-700 hover:bg-gray-100 transition">
                  Subscribe to Pro
                </button>
              </a>
            </div>

            {/* Credit Packs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <CreditPackCard
                credits="50"
                price="₹100"
                perInvoice="₹2.00"
                buttonText="Buy Now"
              />
              <CreditPackCard
                credits="150"
                price="₹250"
                perInvoice="₹1.67"
                highlight
                badge="MOST POPULAR"
                buttonText="Buy Now"
              />
              <CreditPackCard
                credits="350"
                price="₹500"
                perInvoice="₹1.43"
                badge="Best Value – Save 28%"
                buttonText="Buy Now"
              />
            </div>
          </div>

          <p className="text-center text-sm text-gray-500">
            All prices inclusive of GST • Credits never expire • No recurring
            payment for credit packs
          </p>
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
              End-to-end encryption • Invoices deleted after processing • Google
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
        <a
          href="/dashboard"
          className="inline-block px-8 py-4 bg-white text-indigo-700 font-bold rounded-2xl shadow-lg hover:bg-gray-100 transition"
        >
          Get Started Now
        </a>
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

function CreditPackCard({
  credits,
  price,
  perInvoice,
  highlight = false,
  badge,
  buttonText,
}: any) {
  return (
    <div
      className={`rounded-3xl p-8 shadow-2xl border bg-white relative overflow-hidden ${
        highlight ? "ring-4 ring-indigo-500 scale-105" : ""
      }`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-1 rounded-full text-sm font-bold">
          {badge}
        </div>
      )}
      <div className="text-center">
        <div className="text-4xl font-extrabold text-gray-900 mb-2">
          {credits}
        </div>
        <p className="text-gray-600 mb-4">Credits</p>
        <div className="text-4xl font-extrabold text-indigo-600 mb-2">
          {price}
        </div>
        <p className="text-lg text-gray-700 mb-8">{perInvoice} per invoice</p>
        <a href="/dashboard" className="block w-full">
          <button
            className={`w-full py-3 rounded-2xl font-bold transition ${
              highlight
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {buttonText}
          </button>
        </a>
        <a href="/login" className="block w-full">
          <button
            className={`w-full py-3 rounded-2xl font-bold transition ${
              highlight
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            Login
          </button>
        </a>
      </div>
    </div>
  );
}
