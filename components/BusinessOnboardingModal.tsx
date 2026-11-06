"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Users,
  Truck,
  Package,
  Settings,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Plus,
  Trash2,
  QrCode,
  FileText,
} from "lucide-react";
import {
  BusinessProfile,
  Client,
  Product,
  InvoiceNumberSettings,
  PrintSettings,
  getBusinessProfile,
  saveBusinessProfile,
  saveClient,
  saveProduct,
  saveInvoiceNumberSettings,
  savePrintSettings,
} from "@/lib/storage";
import {
  INDIAN_STATES,
  GST_RATES,
  BUILTIN_UNITS,
  getStateCodeFromGSTIN,
} from "@/lib/gstBillingEngine";
import { fetchGSTInfo, GstInfo, saveGSTINBackend } from "@/lib/api";
import toast from "react-hot-toast";

export const ONBOARDING_COMPLETED_KEY = "gstlens_onboarding_completed";
export const OPEN_ONBOARDING_EVENT = "gstlens_open_onboarding";

interface OpeningStockItem {
  name: string;
  hsn: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  taxPercent: number;
  stock: number;
}

export default function BusinessOnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;

  // Step 1: Business Profile State
  const [gstin, setGstin] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [pan, setPan] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [pincode, setPincode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isFetchingGst, setIsFetchingGst] = useState(false);
  const [gstVerified, setGstVerified] = useState<GstInfo | null>(null);

  // Step 2: First Buyer / Customer State
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerState, setBuyerState] = useState("Maharashtra");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [isBuyerCashWalkin, setIsBuyerCashWalkin] = useState(false);
  const [isFetchingBuyerGst, setIsFetchingBuyerGst] = useState(false);

  // Step 3: First Vendor / Supplier State
  const [vendorGstin, setVendorGstin] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");
  const [vendorState, setVendorState] = useState("Maharashtra");
  const [vendorAddress, setVendorAddress] = useState("");
  const [isFetchingVendorGst, setIsFetchingVendorGst] = useState(false);

  // Step 4: Opening Stock / Products State
  const [stockItems, setStockItems] = useState<OpeningStockItem[]>([
    {
      name: "",
      hsn: "998311",
      unit: "Pcs",
      purchasePrice: 0,
      sellingPrice: 0,
      taxPercent: 18,
      stock: 10,
    },
  ]);

  // Step 5: Billing Preferences State
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [startingNumber, setStartingNumber] = useState(1);
  const [defaultTemplate, setDefaultTemplate] = useState<
    "modern" | "classic" | "minimalist" | "compact" | "thermal"
  >("modern");

  // Check if onboarding is needed
  useEffect(() => {
    if (typeof window === "undefined") return;

    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (!completed) {
      getBusinessProfile()
        .then((prof) => {
          // If profile has no GSTIN or is empty, launch onboarding
          if (!prof || !prof.gstin || prof.gstin.trim() === "") {
            setIsOpen(true);
          }
        })
        .catch(() => {
          setIsOpen(true);
        });
    }

    const handleOpen = () => {
      setCurrentStep(1);
      setIsOpen(true);
    };

    window.addEventListener(OPEN_ONBOARDING_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, handleOpen);
  }, []);

  // GST Auto-Fill for Step 1: Business Profile
  const handleBusinessGstLookup = async (inputGstin?: string) => {
    const clean = (inputGstin || gstin).trim().toUpperCase();
    if (clean.length !== 15) {
      toast.error("Please enter a 15-character GSTIN");
      return;
    }

    setIsFetchingGst(true);
    try {
      const res = await fetchGSTInfo(clean);
      if (res && res.data) {
        const info = res.data;
        setGstVerified(info);
        setGstin(clean);
        setLegalName(info.legal_name || legalName);
        setTradeName(info.trade_name || info.legal_name || tradeName);
        setPan(info.pan_number || clean.slice(2, 12));
        if (info.address) setAddress(info.address);
        if (info.city) setCity(info.city);
        if (info.pincode) setPincode(info.pincode);
        if (info.state) {
          const matchedState = INDIAN_STATES.find(
            (s) =>
              s.code === info.state_code ||
              s.name.toLowerCase() === info.state.toLowerCase()
          );
          if (matchedState) setState(matchedState.name);
        }
        toast.success(`Verified: ${info.trade_name || info.legal_name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch GSTIN details");
    } finally {
      setIsFetchingGst(false);
    }
  };

  // GST Auto-Fill for Step 2: Buyer
  const handleBuyerGstLookup = async (inputGstin?: string) => {
    const clean = (inputGstin || buyerGstin).trim().toUpperCase();
    if (clean.length !== 15) {
      toast.error("Please enter a 15-character GSTIN");
      return;
    }

    setIsFetchingBuyerGst(true);
    try {
      const res = await fetchGSTInfo(clean);
      if (res && res.data) {
        const info = res.data;
        setBuyerName(info.trade_name || info.legal_name || buyerName);
        const fullAddr = [info.address, info.city, info.pincode].filter(Boolean).join(", ");
        if (fullAddr) setBuyerAddress(fullAddr);
        if (info.state) {
          const matched = INDIAN_STATES.find(
            (s) =>
              s.code === info.state_code ||
              s.name.toLowerCase() === info.state.toLowerCase()
          );
          if (matched) setBuyerState(matched.name);
        }
        toast.success(`Buyer found: ${info.trade_name || info.legal_name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not lookup buyer GST");
    } finally {
      setIsFetchingBuyerGst(false);
    }
  };

  // GST Auto-Fill for Step 3: Vendor
  const handleVendorGstLookup = async (inputGstin?: string) => {
    const clean = (inputGstin || vendorGstin).trim().toUpperCase();
    if (clean.length !== 15) {
      toast.error("Please enter a 15-character GSTIN");
      return;
    }

    setIsFetchingVendorGst(true);
    try {
      const res = await fetchGSTInfo(clean);
      if (res && res.data) {
        const info = res.data;
        setVendorName(info.trade_name || info.legal_name || vendorName);
        const fullAddr = [info.address, info.city, info.pincode].filter(Boolean).join(", ");
        if (fullAddr) setVendorAddress(fullAddr);
        if (info.state) {
          const matched = INDIAN_STATES.find(
            (s) =>
              s.code === info.state_code ||
              s.name.toLowerCase() === info.state.toLowerCase()
          );
          if (matched) setVendorState(matched.name);
        }
        toast.success(`Supplier found: ${info.trade_name || info.legal_name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not lookup vendor GST");
    } finally {
      setIsFetchingVendorGst(false);
    }
  };

  // Stock table helpers
  const handleStockChange = (index: number, field: keyof OpeningStockItem, val: any) => {
    setStockItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const addStockRow = () => {
    setStockItems((prev) => [
      ...prev,
      {
        name: "",
        hsn: "",
        unit: "Pcs",
        purchasePrice: 0,
        sellingPrice: 0,
        taxPercent: 18,
        stock: 10,
      },
    ]);
  };

  const removeStockRow = (index: number) => {
    if (stockItems.length <= 1) return;
    setStockItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Final submission and persistence
  const handleCompleteOnboarding = async () => {
    try {
      const stateObj = INDIAN_STATES.find((s) => s.name === state);
      const stateCode = stateObj ? stateObj.code : getStateCodeFromGSTIN(gstin);

      // 1. Save Business Profile
      const profileToSave: BusinessProfile = {
        id: "default-business",
        businessName: legalName.trim() || tradeName.trim() || "My Business",
        tradeName: tradeName.trim() || legalName.trim(),
        gstin: gstin.trim().toUpperCase(),
        pan: pan.trim().toUpperCase() || (gstin.length >= 12 ? gstin.slice(2, 12) : ""),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state,
        stateCode: stateCode,
        pincode: pincode.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        upiId: upiId.trim(),
        isDefault: true,
      };
      await saveBusinessProfile(profileToSave);

      // Also sync GSTIN with backend API if available
      if (gstin.trim()) {
        saveGSTINBackend(gstin.trim().toUpperCase()).catch(() => {});
      }

      // 2. Save First Buyer (if provided)
      if (isBuyerCashWalkin) {
        const cashClient: Client = {
          id: `cli-walkin-cash`,
          name: "Cash Walk-in Customer",
          state: state,
          stateCode: stateCode,
          type: "customer",
          created_at: Date.now(),
        };
        await saveClient(cashClient);
      } else if (buyerName.trim()) {
        const buyerStateObj = INDIAN_STATES.find((s) => s.name === buyerState);
        const buyerClient: Client = {
          id: `cli-${Date.now()}`,
          name: buyerName.trim(),
          gstin: buyerGstin.trim().toUpperCase(),
          phone: buyerPhone.trim(),
          address: buyerAddress.trim(),
          state: buyerState,
          stateCode: buyerStateObj ? buyerStateObj.code : getStateCodeFromGSTIN(buyerGstin),
          type: "customer",
          created_at: Date.now(),
        };
        await saveClient(buyerClient);
      }

      // 3. Save First Vendor (if provided)
      if (vendorName.trim()) {
        const vendorStateObj = INDIAN_STATES.find((s) => s.name === vendorState);
        const vendorClient: Client = {
          id: `cli-${Date.now() + 1}`,
          name: vendorName.trim(),
          gstin: vendorGstin.trim().toUpperCase(),
          phone: vendorPhone.trim(),
          address: vendorAddress.trim(),
          state: vendorState,
          stateCode: vendorStateObj ? vendorStateObj.code : getStateCodeFromGSTIN(vendorGstin),
          type: "vendor",
          created_at: Date.now(),
        };
        await saveClient(vendorClient);
      }

      // 4. Save Opening Stock Products
      for (let i = 0; i < stockItems.length; i++) {
        const item = stockItems[i];
        if (item.name.trim()) {
          const product: Product = {
            id: `prod-${Date.now() + i}`,
            name: item.name.trim(),
            hsn: item.hsn.trim(),
            unit: item.unit || "Pcs",
            purchasePrice: Number(item.purchasePrice) || 0,
            sellingPrice: Number(item.sellingPrice) || 0,
            taxPercent: Number(item.taxPercent) || 18,
            stock: Number(item.stock) || 0,
            minStockAlert: 5,
            created_at: Date.now(),
          };
          await saveProduct(product);
        }
      }

      // 5. Save Numbering & Print Preferences
      const numberingSettings: InvoiceNumberSettings = {
        format: "branded",
        brandPrefix: invoicePrefix.replace(/[/#-]/g, "").trim() || "INV",
        separator: "/",
        showFinYear: true,
        startNumber: Number(startingNumber) || 1,
        padDigits: 4,
      };
      await saveInvoiceNumberSettings(numberingSettings);

      const printSettings: PrintSettings = {
        template: defaultTemplate,
        colorTheme: "#2563EB",
        showHSN: true,
        showLogo: true,
        showBankDetails: !!accountNumber,
        showUPI: !!upiId,
        showSignature: true,
        showTerms: true,
        declarationText: "We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.",
        footerNote: "Goods once sold will not be taken back. Subject to local jurisdiction.",
      };
      await savePrintSettings(printSettings);

      // Mark complete in localStorage
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
      setIsOpen(false);
      toast.success("Workspace setup completed successfully! Welcome aboard.");

      // Refresh to reload profile in header & generator
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      toast.error("Failed to complete setup: " + err.message);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, "true");
    setIsOpen(false);
    toast("You can complete your profile anytime in Settings.", { icon: "ℹ️" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header with Step Indicators */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              GSTLens Business Setup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Step {currentStep} of {totalSteps}:{" "}
              {currentStep === 1 && "Your Business & GST Particulars"}
              {currentStep === 2 && "Primary Buyer / Customer"}
              {currentStep === 3 && "Primary Supplier / Vendor"}
              {currentStep === 4 && "Initial Inventory & Opening Stock"}
              {currentStep === 5 && "Invoice Preferences & Series"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              Skip Setup
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Progress Tracker */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
          <div
            className="bg-blue-600 h-1.5 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* STEP 1: BUSINESS PROFILE */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Enter your GSTIN for Instant Auto-Fill
                  </p>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">
                    We query the GST Portal directly to populate your legal name, trade name, registered address, and PAN automatically.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AAAAA0000A1Z5"
                    value={gstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                      setGstin(val);
                      if (val.length === 15) {
                        handleBusinessGstLookup(val);
                      }
                    }}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg font-mono uppercase font-bold text-slate-900 dark:text-white flex-1 md:w-48 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleBusinessGstLookup()}
                    disabled={isFetchingGst || gstin.length < 15}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs disabled:opacity-40 transition shrink-0 cursor-pointer"
                  >
                    {isFetchingGst ? "Fetching..." : "Auto-Fill"}
                  </button>
                </div>
              </div>

              {gstVerified && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Verified Taxpayer:</strong> {gstVerified.legal_name} (Status: {gstVerified.status || "Active"})
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Enterprises Pvt Ltd"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Trade / Shop Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Supermarket"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    PAN
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="AAAAA0000A"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Phone / Mobile Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="billing@mybusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Full Registered Address
                  </label>
                  <input
                    type="text"
                    placeholder="Shop/Office number, Street, Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bank & UPI QR Setup */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  Bank & UPI Details (For Invoice Payment QR)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="HDFC Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="50200012345678"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="HDFC0001234"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      placeholder="business@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FIRST BUYER / CUSTOMER */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Add Your First Customer / Buyer
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Save a regular wholesale buyer, or select Walk-in Cash for retail counter sales.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                  <input
                    type="checkbox"
                    checked={isBuyerCashWalkin}
                    onChange={(e) => setIsBuyerCashWalkin(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Use Walk-in Cash Customer
                  </span>
                </label>
              </div>

              {!isBuyerCashWalkin ? (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Buyer GSTIN (Auto-Fill)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleBuyerGstLookup()}
                        disabled={isFetchingBuyerGst || buyerGstin.length < 15}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 cursor-pointer"
                      >
                        {isFetchingBuyerGst ? "Fetching..." : "Auto-Fill from GST Portal"}
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 27AABCT3518Q1ZV"
                      value={buyerGstin}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                        setBuyerGstin(val);
                        if (val.length === 15) {
                          handleBuyerGstLookup(val);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Customer / Firm Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Acme Trading Corp"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98000 00000"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        placeholder="Billing Street Address"
                        value={buyerAddress}
                        onChange={(e) => setBuyerAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        State
                      </label>
                      <select
                        value={buyerState}
                        onChange={(e) => setBuyerState(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                      >
                        {INDIAN_STATES.map((s) => (
                          <option key={s.code} value={s.name}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Cash Walk-in Mode Selected
                  </p>
                  <p className="text-[11px]">
                    Invoices will automatically default to local retail counter sales without requiring party registration.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: FIRST SUPPLIER / VENDOR */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  Add Your Primary Supplier / Vendor
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Record who you purchase inventory from to claim Input Tax Credit (ITC) under GSTR-3B Table 4.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Vendor GSTIN (Auto-Fill)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleVendorGstLookup()}
                    disabled={isFetchingVendorGst || vendorGstin.length < 15}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    {isFetchingVendorGst ? "Fetching..." : "Auto-Fill from GST Portal"}
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 07AABCL1234F1Z8"
                  value={vendorGstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                    setVendorGstin(val);
                    if (val.length === 15) {
                      handleVendorGstLookup(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Vendor / Firm Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Modern Wholesale Distributors"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98000 00000"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Vendor Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street, City"
                    value={vendorAddress}
                    onChange={(e) => setVendorAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    State
                  </label>
                  <select
                    value={vendorState}
                    onChange={(e) => setVendorState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: OPENING STOCK & PRODUCTS */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    Initial Inventory & Opening Stock
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Add items you regularly sell. Rates, HSN codes, and tax rates will auto-fill on invoices.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addStockRow}
                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold rounded-lg hover:bg-blue-100 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>

              <div className="space-y-3">
                {stockItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-4">
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1 text-[11px]">
                        Item / Product Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Basmati Rice 5kg or Consulting Service"
                        value={item.name}
                        onChange={(e) => handleStockChange(index, "name", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1 text-[11px]">
                        HSN / SAC
                      </label>
                      <input
                        type="text"
                        placeholder="1006"
                        value={item.hsn}
                        onChange={(e) => handleStockChange(index, "hsn", e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1 text-[11px]">
                        Selling Price (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.sellingPrice || ""}
                        onChange={(e) => handleStockChange(index, "sellingPrice", parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1 text-[11px]">
                        Tax Slab
                      </label>
                      <select
                        value={item.taxPercent}
                        onChange={(e) => handleStockChange(index, "taxPercent", parseFloat(e.target.value))}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      >
                        {GST_RATES.map((r) => (
                          <option key={r} value={r}>
                            {r}% GST
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1 text-[11px]">
                        Stock Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.stock}
                        onChange={(e) => handleStockChange(index, "stock", parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeStockRow(index)}
                        disabled={stockItems.length <= 1}
                        className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-20 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: BILLING PREFERENCES & SERIES */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  Billing & Invoicing Preferences
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Configure your starting invoice numbering series and default print layout.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Invoice Series Prefix
                  </label>
                  <input
                    type="text"
                    placeholder="INV/2024-25/"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Preview: {invoicePrefix}000{startingNumber}
                  </p>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Starting Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={startingNumber}
                    onChange={(e) => setStartingNumber(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Default Invoice Template
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: "modern", label: "Modern Blue", desc: "Corporate SaaS with UPI QR" },
                    { id: "classic", label: "Classic Indian", desc: "GST Rule 46 boxed borders" },
                    { id: "minimalist", label: "Minimalist", desc: "Monochrome Swiss typography" },
                    { id: "thermal", label: "80mm POS Slip", desc: "Thermal receipt format" },
                  ].map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setDefaultTemplate(tpl.id as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        defaultTemplate === tpl.id
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <p className="text-xs font-bold">{tpl.label}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                        {tpl.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition flex items-center gap-1.5 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous Step
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !legalName.trim() && !tradeName.trim()) {
                    toast.error("Please enter your Business Name or GSTIN");
                    return;
                  }
                  setCurrentStep((prev) => prev + 1);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 text-xs shadow-sm cursor-pointer"
              >
                Next Step ({currentStep + 1}/{totalSteps})
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center gap-2 text-xs shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Setup & Launch Workspace
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
