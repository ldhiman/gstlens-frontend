"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  Save,
  Eye,
  Search,
  ChevronDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
  Truck,
  CreditCard,
  Percent,
  Layers,
  ArrowLeft,
} from "lucide-react";
import {
  DOCUMENT_TYPES,
  DocumentType,
  LineItem,
  BUILTIN_UNITS,
  GST_RATES,
  INDIAN_STATES,
  TERMS_PRESETS,
  calculateLineTax,
  computeInvoiceTotals,
  formatINR,
  numberToWords,
  getLocalToday,
  getStateCodeFromGSTIN,
  normalizeDocType,
} from "@/lib/gstBillingEngine";
import {
  Client,
  Product,
  BusinessProfile,
  getAllClients,
  getAllProducts,
  getBusinessProfile,
  getNextDocumentNumber,
  saveClient,
  saveInvoiceDraft,
  adjustProductStock,
} from "@/lib/storage";
import InvoicePreview from "./InvoicePreview";
import { fetchGSTInfo, GstInfo } from "@/lib/api";
import toast from "react-hot-toast";

export interface InvoiceGeneratorProps {
  initialData?: any;
  onSaveSuccess?: (invoiceId: string) => void;
  onCancel?: () => void;
}

export default function InvoiceGenerator({
  initialData,
  onSaveSuccess,
  onCancel,
}: InvoiceGeneratorProps) {
  // Master states
  const isEditing = Boolean(initialData?.id || initialData?._local_id);
  const [docType, setDocType] = useState<DocumentType>(
    normalizeDocType(initialData?.docType || initialData?.invoice_type)
  );
  const docConfig = DOCUMENT_TYPES[docType] || DOCUMENT_TYPES["tax-invoice"];
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Invoice Header Fields
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(getLocalToday());
  const [dueDate, setDueDate] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Partial<Client>>({});
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("");
  const [reverseCharge, setReverseCharge] = useState<boolean>(false);
  const [eWayBillNo, setEWayBillNo] = useState<string>("");
  const [vehicleNo, setVehicleNo] = useState<string>("");
  const [poNumber, setPoNumber] = useState<string>("");

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: "item-1",
      name: "",
      description: "",
      hsn: "",
      quantity: 1,
      unit: "Pcs",
      rate: 0,
      discount: 0,
      discountType: "percent",
      taxPercent: 18,
      cessPercent: 0,
      taxInclusive: false,
    },
  ]);

  // Options & Additional Charges
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [shippingTaxRate, setShippingTaxRate] = useState<number>(18);
  const [tdsRate, setTdsRate] = useState<number>(0);
  const [tcsRate, setTcsRate] = useState<number>(0);
  const [terms, setTerms] = useState<string>(TERMS_PRESETS[0].body);
  const [notes, setNotes] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Unpaid">(
    initialData?.payment_status === "Paid" || initialData?.paymentStatus === "Paid" ? "Paid" : "Unpaid"
  );

  // Modals & Preview
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [newClientName, setNewClientName] = useState<string>("");
  const [newClientGstin, setNewClientGstin] = useState<string>("");
  const [newClientPhone, setNewClientPhone] = useState<string>("");
  const [newClientAddress, setNewClientAddress] = useState<string>("");
  const [newClientState, setNewClientState] = useState<string>("Maharashtra");
  const [isFetchingGst, setIsFetchingGst] = useState<boolean>(false);
  const [quickBuyerGstin, setQuickBuyerGstin] = useState<string>("");
  const [newClientGstStatus, setNewClientGstStatus] = useState<string | null>(null);

  const handleQuickGstFillForBuyer = async (rawGstin?: string) => {
    const clean = (rawGstin || quickBuyerGstin).trim().toUpperCase();
    if (clean.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }
    setIsFetchingGst(true);
    try {
      const res = await fetchGSTInfo(clean);
      if (res && res.data) {
        const info = res.data;
        const stateObj = INDIAN_STATES.find(
          (s) =>
            s.code === info.state_code ||
            s.name.toLowerCase() === (info.state || "").toLowerCase()
        );
        const partyState = stateObj ? stateObj.name : info.state || profile?.state || "Maharashtra";
        const partyStateCode = stateObj ? stateObj.code : info.state_code || getStateCodeFromGSTIN(clean);
        const partyName = info.trade_name || info.legal_name || clean;
        const partyAddress = [info.address, info.city, info.pincode].filter(Boolean).join(", ");

        let existing = clients.find((c) => c.gstin?.toUpperCase() === clean);
        if (!existing) {
          existing = {
            id: `cli-${Date.now()}`,
            name: partyName,
            tradeName: info.trade_name || "",
            gstin: clean,
            pan: info.pan_number || clean.slice(2, 12),
            address: partyAddress,
            city: info.city,
            state: partyState,
            stateCode: partyStateCode,
            pincode: info.pincode,
            type: "customer",
            created_at: Date.now(),
          };
          await saveClient(existing);
          setClients((prev) => [...prev, existing!]);
        }
        handleClientSelect(existing);
        setQuickBuyerGstin("");
        toast.success(`Selected verified party: ${partyName}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to lookup GST details");
    } finally {
      setIsFetchingGst(false);
    }
  };

  const handleSetWalkinCustomer = () => {
    const walkinClient: Client = {
      id: "walkin-cash",
      name: "Cash Walk-in Customer",
      state: profile?.state || "Maharashtra",
      stateCode: profile?.stateCode || "27",
      address: "Counter / Walk-in Sale",
      type: "customer",
      created_at: Date.now(),
    };
    handleClientSelect(walkinClient);
    setPaymentStatus("Paid");
    toast.success("Set to Cash Walk-in Customer (B2C)");
  };

  const handleModalGstLookup = async (lookupGstin?: string) => {
    const clean = (lookupGstin || newClientGstin).trim().toUpperCase();
    if (clean.length !== 15) {
      toast.error("Please enter a valid 15-character GSTIN");
      return;
    }
    setIsFetchingGst(true);
    try {
      const res = await fetchGSTInfo(clean);
      if (res && res.data) {
        const info = res.data;
        setNewClientName(info.trade_name || info.legal_name || newClientName);
        const fullAddr = [info.address, info.city, info.pincode].filter(Boolean).join(", ");
        if (fullAddr) setNewClientAddress(fullAddr);
        if (info.state) {
          const stateObj = INDIAN_STATES.find(
            (s) =>
              s.code === info.state_code ||
              s.name.toLowerCase() === info.state.toLowerCase()
          );
          if (stateObj) setNewClientState(stateObj.name);
        }
        setNewClientGstStatus(`${info.status || "Active"} • ${info.constitution || "Taxpayer"}`);
        toast.success(`Details fetched: ${info.trade_name || info.legal_name}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch details from GST portal");
    } finally {
      setIsFetchingGst(false);
    }
  };

  // Load Initial Resources
  useEffect(() => {
    Promise.all([getBusinessProfile(), getAllClients(), getAllProducts()])
      .then(([prof, cls, prods]) => {
        setProfile(prof);
        setClients(cls);
        setProducts(prods);

        const initialInvNum = initialData?.invoiceNumber || initialData?.invoice_number;
        if (!initialInvNum) {
          getNextDocumentNumber(docConfig.prefix).then(setInvoiceNumber);
        } else {
          setInvoiceNumber(initialInvNum);
        }

        if (initialData) {
          if (initialData.docType || initialData.invoice_type) {
            setDocType(normalizeDocType(initialData.docType || initialData.invoice_type));
          }
          const clientData = initialData.client || initialData.buyer;
          if (clientData) setSelectedClient(clientData);
          if (initialData.items && initialData.items.length > 0) setItems(initialData.items);
          const iDate = initialData.invoiceDate || initialData.invoice_date;
          if (iDate) setInvoiceDate(iDate);
          const dDate = initialData.dueDate || initialData.due_date;
          if (dDate) setDueDate(dDate);
          const pos = initialData.placeOfSupply || initialData.place_of_supply;
          if (pos) setPlaceOfSupply(pos);
          if (initialData.reverseCharge !== undefined || initialData.reverse_charge !== undefined) {
            setReverseCharge(Boolean(initialData.reverseCharge ?? initialData.reverse_charge));
          }
          if (initialData.eWayBillNo || initialData.eway_bill_no) {
            setEWayBillNo(initialData.eWayBillNo || initialData.eway_bill_no);
          }
          if (initialData.vehicleNo || initialData.vehicle_no) {
            setVehicleNo(initialData.vehicleNo || initialData.vehicle_no);
          }
          if (initialData.poNumber || initialData.po_number) {
            setPoNumber(initialData.poNumber || initialData.po_number);
          }
          if (initialData.shippingCharge !== undefined || initialData.shipping_charge !== undefined) {
            setShippingCharge(Number(initialData.shippingCharge ?? initialData.shipping_charge) || 0);
          }
          if (initialData.terms) setTerms(initialData.terms);
          if (initialData.notes) setNotes(initialData.notes);
          if (initialData.payment_status || initialData.paymentStatus) {
            const isPaid = initialData.payment_status === "Paid" || initialData.paymentStatus === "Paid";
            setPaymentStatus(isPaid ? "Paid" : "Unpaid");
          }
        }
      })
      .catch((err) => toast.error("Failed to load initial data: " + err.message));
  }, []);

  // Recalculate document number if docType changes
  const handleDocTypeChange = async (type: DocumentType) => {
    const safeType = normalizeDocType(type);
    setDocType(safeType);
    if (!initialData) {
      const cfg = DOCUMENT_TYPES[safeType] || DOCUMENT_TYPES["tax-invoice"];
      const nextNum = await getNextDocumentNumber(cfg.prefix);
      setInvoiceNumber(nextNum);
    }
  };

  // When client changes, auto-resolve state & place of supply
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    if (client.stateCode) {
      setPlaceOfSupply(client.stateCode);
    } else if (client.gstin) {
      const sc = getStateCodeFromGSTIN(client.gstin);
      if (sc) setPlaceOfSupply(sc);
    } else {
      setPlaceOfSupply(profile?.stateCode || "27");
    }
  };

  // Determine if Inter-state
  const isInterstate = React.useMemo(() => {
    if (selectedClient.isSEZ) return true;
    const businessStateCode = profile?.stateCode || "27";
    if (placeOfSupply) {
      return placeOfSupply !== businessStateCode;
    }
    return false;
  }, [profile?.stateCode, placeOfSupply, selectedClient.isSEZ]);

  // Totals
  const totals = React.useMemo(() => {
    return computeInvoiceTotals(items, isInterstate, {
      hasTax: docConfig.hasTax,
      shippingCharge,
      shippingTaxRate,
      tdsRate,
      tcsRate,
      applyRoundOff: true,
    });
  }, [items, isInterstate, docConfig.hasTax, shippingCharge, shippingTaxRate, tdsRate, tcsRate]);

  // Item helpers
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: "",
        description: "",
        hsn: "",
        quantity: 1,
        unit: "Pcs",
        rate: 0,
        discount: 0,
        discountType: "percent",
        taxPercent: 18,
        cessPercent: 0,
        taxInclusive: false,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("Invoice must have at least one line item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };

      // Auto-match product from catalog if item name is selected or typed
      if (field === "name" && typeof val === "string") {
        const match = products.find(
          (p) => p.name.trim().toLowerCase() === val.trim().toLowerCase()
        );
        if (match) {
          copy[index].hsn = match.hsn || copy[index].hsn;
          copy[index].unit = match.unit || copy[index].unit;
          copy[index].rate = match.sellingPrice || copy[index].rate;
          copy[index].taxPercent =
            match.taxPercent !== undefined ? match.taxPercent : copy[index].taxPercent;
          if (match.description) {
            copy[index].description = match.description;
          }
        }
      }

      return copy;
    });
  };

  const selectProductForItem = (index: number, product: Product) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        name: product.name,
        hsn: product.hsn || "",
        unit: product.unit || "Pcs",
        rate: product.sellingPrice || 0,
        taxPercent: product.taxPercent || 18,
        description: product.description || "",
      };
      return copy;
    });
  };

  const addDeliveryChargeLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `dlv-${Date.now()}`,
        name: "Delivery / Shipping Charges",
        description: "Doorstep delivery & transport charges",
        hsn: "996812",
        quantity: 1,
        unit: "Nos",
        rate: 150,
        discount: 0,
        discountType: "fixed",
        taxPercent: 18,
        taxInclusive: false,
      },
    ]);
    toast.success("Added Delivery Charges line");
  };

  // Quick Client Add
  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    const stateObj = INDIAN_STATES.find((s) => s.name === newClientState);
    const newClient: Client = {
      id: `cli-${Date.now()}`,
      name: newClientName.trim(),
      gstin: newClientGstin.trim().toUpperCase(),
      phone: newClientPhone.trim(),
      address: newClientAddress.trim(),
      state: newClientState,
      stateCode: stateObj ? stateObj.code : getStateCodeFromGSTIN(newClientGstin),
      type: "customer",
      created_at: Date.now(),
    };

    await saveClient(newClient);
    setClients((prev) => [...prev, newClient]);
    handleClientSelect(newClient);
    setShowAddClientModal(false);
    toast.success(`Client ${newClient.name} added!`);
  };

  // Save invoice
  const handleSaveInvoice = async (printImmediately: boolean = false) => {
    if (!invoiceNumber.trim()) {
      toast.error("Invoice number is mandatory");
      return;
    }
    if (!selectedClient.name) {
      toast.error("Please select or add a recipient customer");
      return;
    }
    if (items.some((it) => !it.name.trim() || it.quantity <= 0)) {
      toast.error("Every line item must have a valid name and positive quantity");
      return;
    }

    try {
      const invoicePayload = {
        _local_id: initialData?.id || initialData?._local_id,
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        due_date: dueDate,
        invoice_type: docType,
        seller: {
          name: profile?.tradeName || profile?.businessName,
          gstin: profile?.gstin,
          address: profile?.address,
          state: profile?.state,
          state_code: profile?.stateCode,
          phone: profile?.phone,
          email: profile?.email,
          pan: profile?.pan,
        },
        buyer: {
          name: selectedClient.name,
          trade_name: selectedClient.tradeName,
          gstin: selectedClient.gstin,
          address: selectedClient.address,
          state: selectedClient.state,
          state_code: selectedClient.stateCode || placeOfSupply,
          phone: selectedClient.phone,
          pan: selectedClient.pan,
        },
        items: items.map((it) => ({
          ...it,
          calc: calculateLineTax(it, isInterstate, docConfig.hasTax),
        })),
        totals,
        taxable_value: totals.taxableAmount,
        taxable_amount: totals.taxableAmount,
        invoice_total: totals.grandTotal,
        grand_total: totals.grandTotal,
        total_amount: totals.grandTotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        cess: totals.cess,
        customer_name: selectedClient.name || selectedClient.tradeName || "Cash Customer",
        buyer_name: selectedClient.name || selectedClient.tradeName || "Cash Customer",
        buyer_gstin: selectedClient.gstin || "",
        place_of_supply: placeOfSupply,
        is_interstate: isInterstate,
        reverse_charge: reverseCharge,
        eway_bill_no: eWayBillNo,
        vehicle_no: vehicleNo,
        po_number: poNumber,
        terms,
        notes,
        payment_status: paymentStatus,
        paymentStatus: paymentStatus,
        created_at: initialData?.created_at || Date.now(),
      };

      const savedId = await saveInvoiceDraft(invoicePayload, "confirmed");

      // Apply inventory stock adjustments
      const stockFactor = docConfig.stockEffect;
      if (stockFactor !== 0) {
        for (const it of items) {
          const matchedProd = products.find(
            (p) => p.name.toLowerCase() === it.name.toLowerCase() || (it.hsn && p.hsn === it.hsn)
          );
          if (matchedProd && !matchedProd.isService) {
            // e.g. stockEffect 1 (sales) reduces stock (-qty), credit note adds stock (+qty)
            await adjustProductStock(matchedProd.id, -1 * stockFactor * it.quantity);
          }
        }
      }

      toast.success(
        isEditing
          ? `${docConfig.label} ${invoiceNumber} updated!`
          : `${docConfig.label} ${invoiceNumber} saved!`
      );

      if (printImmediately) {
        setShowPreviewModal(true);
      } else if (onSaveSuccess) {
        onSaveSuccess(savedId);
      }
    } catch (err: any) {
      toast.error("Failed to save invoice: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                {isEditing ? `Edit ${docConfig.title} #${invoiceNumber}` : docConfig.title}
              </h1>
              {isEditing && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Editing
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              GST Rule 46 Compliant • Multi-Currency • UPI Dynamic QR • E-Way Bill Ready
            </p>
          </div>
        </div>

        {/* Document Type Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={docType}
            onChange={(e) => handleDocTypeChange(e.target.value as DocumentType)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-xl border-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(DOCUMENT_TYPES).map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            <Eye className="w-4 h-4 text-slate-500" />
            Preview
          </button>

          <button
            onClick={() => handleSaveInvoice(false)}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
          >
            <Save className="w-4 h-4" />
            {isEditing ? "Update & Save" : "Save Invoice"}
          </button>
        </div>
      </div>

      {/* Primary Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recipient / Client */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Bill To (Customer)
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetWalkinCustomer}
                className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg transition"
              >
                Cash Walk-in
              </button>
              <button
                type="button"
                onClick={() => setShowAddClientModal(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                New Party
              </button>
            </div>
          </div>

          {/* Quick GSTIN Lookup Bar for Walk-in B2B */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                Quick GSTIN Auto-Fill
              </span>
              <button
                type="button"
                onClick={() => handleQuickGstFillForBuyer()}
                disabled={isFetchingGst || quickBuyerGstin.length < 15}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 cursor-pointer"
              >
                {isFetchingGst ? "Fetching..." : "Auto-Fill"}
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Type 15-digit GSTIN..."
                maxLength={15}
                value={quickBuyerGstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                  setQuickBuyerGstin(val);
                  if (val.length === 15) {
                    handleQuickGstFillForBuyer(val);
                  }
                }}
                className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Select Saved Client
            </label>
            <select
              value={selectedClient.id || ""}
              onChange={(e) => {
                const found = clients.find((c) => c.id === e.target.value);
                if (found) handleClientSelect(found);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- Choose Party or Walk-in --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.gstin ? `(${c.gstin})` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedClient.name && (
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-900 dark:text-white">{selectedClient.name}</p>
              {selectedClient.address && <p>{selectedClient.address}</p>}
              <p>
                <span className="font-medium text-slate-500">GSTIN:</span>{" "}
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {selectedClient.gstin || "Unregistered (B2C)"}
                </span>
              </p>
              {selectedClient.phone && <p>Phone: {selectedClient.phone}</p>}
            </div>
          )}
        </div>

        {/* Invoice Metadata */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Document Particulars
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Place of Supply (POS)
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              >
                <option value="">Auto (Derived)</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.code} - {st.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                isInterstate
                  ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                  : "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300"
              }`}
            >
              {isInterstate ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={reverseCharge}
                onChange={(e) => setReverseCharge(e.target.checked)}
                className="rounded text-blue-600"
              />
              RCM Applicable
            </label>
          </div>
        </div>

        {/* E-Way Bill & Transport */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-600" />
            Transport & E-Way Bill
          </h3>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              e-Way Bill Number (Rule 138)
            </label>
            <input
              type="text"
              placeholder="e.g. 2410 1234 5678"
              value={eWayBillNo}
              onChange={(e) => setEWayBillNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Vehicle Number
              </label>
              <input
                type="text"
                placeholder="MH-02-AB-1234"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                PO / Reference No
              </label>
              <input
                type="text"
                placeholder="PO-2026-09"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Invoice Line Items
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={addDeliveryChargeLine}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition"
            >
              + Add Shipping / Delivery
            </button>
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-2 px-1 w-8">#</th>
                <th className="py-2 px-2 w-52">Product / Item</th>
                <th className="py-2 px-2 w-24">HSN/SAC</th>
                <th className="py-2 px-2 w-20">Qty</th>
                <th className="py-2 px-2 w-20">Unit</th>
                <th className="py-2 px-2 w-24">Rate (₹)</th>
                <th className="py-2 px-2 w-20">Disc (%)</th>
                {docConfig.hasTax && (
                  <th className="py-2 px-2 w-24">GST Rate</th>
                )}
                <th className="py-2 px-2 text-right w-28">Amount</th>
                <th className="py-2 px-1 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((it, idx) => {
                const lineCalc = calculateLineTax(
                  it,
                  isInterstate,
                  docConfig.hasTax
                );
                return (
                  <tr key={it.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                    <td className="py-2 px-1 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <div className="space-y-1">
                        <input
                          type="text"
                          placeholder="Item name / search catalog"
                          value={it.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                          list={`prod-list-${idx}`}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                        />
                        <datalist id={`prod-list-${idx}`}>
                          {products.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name} — ₹{p.sellingPrice} ({p.unit})
                            </option>
                          ))}
                        </datalist>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="HSN"
                        value={it.hsn || ""}
                        onChange={(e) => updateItem(idx, "hsn", e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.quantity}
                        onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={it.unit || "Pcs"}
                        onChange={(e) => updateItem(idx, "unit", e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      >
                        {BUILTIN_UNITS.map((u) => (
                          <option key={u.label} value={u.label}>
                            {u.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.rate}
                        onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold text-slate-900 dark:text-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={it.discount || 0}
                        onChange={(e) => updateItem(idx, "discount", Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                      />
                    </td>
                    {docConfig.hasTax && (
                      <td className="py-2 px-2">
                        <select
                          value={it.taxPercent}
                          onChange={(e) => updateItem(idx, "taxPercent", Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {r}%
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(lineCalc.totalAmount)}
                    </td>
                    <td className="py-2 px-1 text-center">
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Notes, Terms & Live Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Terms & Conditions Presets */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Terms & Conditions (13 Presets)
            </h3>
            <select
              onChange={(e) => {
                const found = TERMS_PRESETS.find((p) => p.id === e.target.value);
                if (found) setTerms(found.body);
              }}
              className="text-xs font-semibold text-blue-600 bg-transparent border-none cursor-pointer"
            >
              {TERMS_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} Preset
                </option>
              ))}
            </select>
          </div>

          <textarea
            rows={5}
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono"
            placeholder="Enter invoice terms and legal notes..."
          />

          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Internal Notes / Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid via UPI reference #9812401"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Payment Status Selector */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Payment Status
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentStatus("Unpaid")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentStatus === "Unpaid"
                    ? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Unpaid (Credit Sale)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentStatus("Paid")}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentStatus === "Paid"
                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paid (Payment Received)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Calculation Sidebar */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Invoice Summary & Taxes
          </h3>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Taxable Value:</span>
              <span className="font-mono font-semibold">{formatINR(totals.taxableAmount)}</span>
            </div>

            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-mono font-semibold">-{formatINR(totals.totalDiscount)}</span>
              </div>
            )}

            {docConfig.hasTax && (
              <>
                {!totals.isInterstate ? (
                  <>
                    <div className="flex justify-between">
                      <span>Central GST (CGST):</span>
                      <span className="font-mono font-semibold">{formatINR(totals.cgst)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>State GST (SGST):</span>
                      <span className="font-mono font-semibold">{formatINR(totals.sgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>Integrated GST (IGST):</span>
                    <span className="font-mono font-semibold">{formatINR(totals.igst)}</span>
                  </div>
                )}
              </>
            )}

            {totals.cess > 0 && (
              <div className="flex justify-between">
                <span>GST Cess:</span>
                <span className="font-mono font-semibold">{formatINR(totals.cess)}</span>
              </div>
            )}

            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Round Off (Section 170):</span>
                <span className="font-mono">{totals.roundOff > 0 ? `+${totals.roundOff}` : totals.roundOff}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
              <span>Grand Total:</span>
              <span className="text-xl font-mono text-blue-600 dark:text-blue-400">
                {formatINR(totals.grandTotal)}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
              {numberToWords(totals.grandTotal)}
            </p>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => handleSaveInvoice(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow transition"
            >
              <Printer className="w-4 h-4" />
              {isEditing ? "Update & Print" : "Save & Print / PDF"}
            </button>
            <button
              onClick={() => handleSaveInvoice(false)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              <Save className="w-4 h-4" />
              {isEditing ? "Update & Save" : "Save Invoice"}
            </button>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {showPreviewModal && profile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <InvoicePreview
              profile={profile}
              client={selectedClient}
              details={{
                invoiceNumber,
                invoiceDate,
                dueDate,
                placeOfSupply,
                docType,
                reverseCharge,
                eWayBillNo,
                vehicleNo,
                poNumber,
              }}
              items={items}
              totals={totals}
              terms={terms}
              notes={notes}
              onClose={() => setShowPreviewModal(false)}
            />
          </div>
        </div>
      )}

      {/* Quick Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Customer / Party
              </h3>
              <button
                onClick={() => setShowAddClientModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddClient} className="space-y-3 text-xs">
              {/* GSTIN First with Instant Auto-Fill */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                    GSTIN (Optional for B2C)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleModalGstLookup()}
                    disabled={isFetchingGst || !newClientGstin || newClientGstin.length < 15}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 cursor-pointer"
                  >
                    {isFetchingGst ? "Fetching..." : "Auto-Fill from GST Portal"}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 27AABCA1234F1Z8"
                  maxLength={15}
                  value={newClientGstin}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
                    setNewClientGstin(val);
                    if (val.length === 15) {
                      handleModalGstLookup(val);
                    }
                  }}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono uppercase font-bold text-slate-900 dark:text-white"
                />
                {newClientGstStatus && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Verified Taxpayer: {newClientGstStatus}
                  </p>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reliance Retail Ltd"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  State / Territory
                </label>
                <select
                  value={newClientState}
                  onChange={(e) => setNewClientState(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Billing Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street address, City, Pincode"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
