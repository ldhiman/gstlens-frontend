import {
  upsertInvoice,
  saveBusinessProfile,
  saveClient,
  savePurchase,
  getAllInvoices,
  getAllPurchases,
  deleteInvoice,
  deletePurchase,
  getFP,
  type StoredInvoice,
  type BusinessProfile,
  type Client,
  type PurchaseBill,
} from "./storage.ts";

export const SAMPLE_SANDBOX_PROFILE: BusinessProfile = {
  id: "profile_default",
  businessName: "Sharma Infotech & Retail Solutions",
  tradeName: "Sharma Infotech",
  gstin: "07AAAAA0000A1Z5",
  pan: "AAAAA0000A",
  phone: "9876543210",
  email: "billing@sharmainfotech.in",
  address: "Shop No. 14, Commercial Complex, Connaught Place",
  city: "New Delhi",
  state: "Delhi",
  stateCode: "07",
  pincode: "110001",
  upiId: "sharma@okhdfcbank",
  bankName: "HDFC Bank",
  accountNumber: "50200012345678",
  ifsc: "HDFC0000123",
  branch: "Connaught Place, New Delhi",
};

function formatSandboxDates(refDate: Date, targetDay: number): {
  ddMmYyyy: string;
  yyyyMmDd: string;
} {
  const safeDay = Math.max(1, Math.min(targetDay, refDate.getDate()));
  const dd = String(safeDay).padStart(2, "0");
  const mm = String(refDate.getMonth() + 1).padStart(2, "0");
  const yyyy = String(refDate.getFullYear());
  return {
    ddMmYyyy: `${dd}-${mm}-${yyyy}`,
    yyyyMmDd: `${yyyy}-${mm}-${dd}`,
  };
}

/**
 * Builds deterministic, current-month sample StoredInvoice records with full GSTR-1 / Tally / Billing compatibility.
 */
export function buildSandboxInvoices(refDate: Date = new Date()): StoredInvoice[] {
  const d1 = formatSandboxDates(refDate, 2).ddMmYyyy;
  const d2 = formatSandboxDates(refDate, 5).ddMmYyyy;
  const d3 = formatSandboxDates(refDate, 8).ddMmYyyy;
  const now = refDate.getTime();

  const rawInvoices = [
    {
      id: "sandbox-inv-1",
      data: {
        _local_id: "sandbox-inv-1",
        invoice_number: "SI-2026-001",
        invoice_date: d1,
        seller_gstin: "07AAAAA0000A1Z5",
        seller_name: "Sharma Infotech",
        buyer_gstin: "27AABCU9603R1ZM",
        buyer_name: "Apex Cloud Technologies Pvt Ltd",
        seller_gstin_info: {
          trade_name: "Sharma Infotech",
          legal_name: "Sharma Infotech & Retail Solutions",
        },
        buyer_gstin_info: {
          trade_name: "Apex Cloud Technologies Pvt Ltd",
          legal_name: "Apex Cloud Technologies Pvt Ltd",
        },
        invoice_type: "B2B",
        pos: "27",
        taxable_value: 25000,
        cgst: 0,
        sgst: 0,
        igst: 4500,
        cess: 0,
        invoice_total: 29500,
        direction: "outward",
        payment_status: "Paid",
        items: [
          {
            name: "Cloud Architecture Consulting & Security Audit",
            description: "Cloud Architecture Consulting & Security Audit",
            hsn: "998311",
            hsn_code: "998311",
            hsn_sc: "998311",
            unit: "NOS",
            quantity: 1,
            rate: 25000,
            unit_price: 25000,
            tax_rate: 18,
            taxPercent: 18,
            gst_rate: 18,
            taxable_value: 25000,
            taxable_amount: 25000,
            cgst: 0,
            sgst: 0,
            igst: 4500,
            cess: 0,
          },
        ],
      },
    },
    {
      id: "sandbox-inv-2",
      data: {
        _local_id: "sandbox-inv-2",
        invoice_number: "SI-2026-002",
        invoice_date: d2,
        seller_gstin: "07AAAAA0000A1Z5",
        seller_name: "Sharma Infotech",
        buyer_gstin: "07BBBBB1111B1Z2",
        buyer_name: "Gupta Traders Delhi",
        seller_gstin_info: {
          trade_name: "Sharma Infotech",
          legal_name: "Sharma Infotech & Retail Solutions",
        },
        buyer_gstin_info: {
          trade_name: "Gupta Traders Delhi",
          legal_name: "Gupta Traders Delhi",
        },
        invoice_type: "B2B",
        pos: "07",
        taxable_value: 12000,
        cgst: 1080,
        sgst: 1080,
        igst: 0,
        cess: 0,
        invoice_total: 14160,
        direction: "outward",
        payment_status: "Unpaid",
        items: [
          {
            name: "High-Speed Thermal Receipt Printers (80mm)",
            description: "High-Speed Thermal Receipt Printers (80mm)",
            hsn: "8471",
            hsn_code: "8471",
            hsn_sc: "8471",
            unit: "PCS",
            quantity: 2,
            rate: 6000,
            unit_price: 6000,
            tax_rate: 18,
            taxPercent: 18,
            gst_rate: 18,
            taxable_value: 12000,
            taxable_amount: 12000,
            cgst: 1080,
            sgst: 1080,
            igst: 0,
            cess: 0,
          },
        ],
      },
    },
    {
      id: "sandbox-inv-3",
      data: {
        _local_id: "sandbox-inv-3",
        invoice_number: "SI-2026-003",
        invoice_date: d3,
        seller_gstin: "07AAAAA0000A1Z5",
        seller_name: "Sharma Infotech",
        buyer_gstin: "",
        buyer_name: "Cash Retail Walk-in Customer",
        seller_gstin_info: {
          trade_name: "Sharma Infotech",
          legal_name: "Sharma Infotech & Retail Solutions",
        },
        buyer_gstin_info: {
          trade_name: "Cash Retail Walk-in Customer",
        },
        invoice_type: "B2C",
        pos: "07",
        taxable_value: 3000,
        cgst: 270,
        sgst: 270,
        igst: 0,
        cess: 0,
        invoice_total: 3540,
        direction: "outward",
        payment_status: "Paid",
        items: [
          {
            name: "Wireless Barcode Scanners & USB Cables",
            description: "Wireless Barcode Scanners & USB Cables",
            hsn: "8471",
            hsn_code: "8471",
            hsn_sc: "8471",
            unit: "PCS",
            quantity: 1,
            rate: 3000,
            unit_price: 3000,
            tax_rate: 18,
            taxPercent: 18,
            gst_rate: 18,
            taxable_value: 3000,
            taxable_amount: 3000,
            cgst: 270,
            sgst: 270,
            igst: 0,
            cess: 0,
          },
        ],
      },
    },
  ];

  return rawInvoices.map((item, idx) => {
    const fp = getFP(item.data.invoice_date);
    return {
      id: item.id,
      status: "confirmed",
      fp,
      data: {
        ...item.data,
        fp,
      },
      created_at: now - (3 - idx) * 3600 * 1000,
      updated_at: now,
      synced_to_cloud: 0,
      deleted: 0,
      cloud_id: "",
    };
  });
}

/**
 * Builds deterministic, current-month sample PurchaseBill records for ITC & GSTR-3B demonstration.
 */
export function buildSandboxPurchases(refDate: Date = new Date()): PurchaseBill[] {
  const p1Date = formatSandboxDates(refDate, 1).yyyyMmDd;
  const p2Date = formatSandboxDates(refDate, 4).yyyyMmDd;
  const now = refDate.getTime();

  return [
    {
      id: "sandbox-pur-1",
      supplierName: "National Cloud Hosting & Data Ltd",
      supplierGstin: "07CCCC0000C1Z8",
      invoiceNumber: "NCH-2026-8812",
      date: p1Date,
      taxableAmount: 10000,
      cgst: 900,
      sgst: 900,
      igst: 0,
      cess: 0,
      total: 11800,
      interstate: false,
      itcEligibility: "eligible",
      paymentStatus: "Paid",
      items: [
        {
          name: "Dedicated Cloud Server & Backup Storage",
          hsn: "998315",
          quantity: 1,
          unit: "NOS",
          rate: 10000,
          taxPercent: 18,
          cessPercent: 0,
        },
      ],
      created_at: now - 5 * 3600 * 1000,
    },
    {
      id: "sandbox-pur-2",
      supplierName: "Bharat Electronics Distributing Corp",
      supplierGstin: "07DDDD0000D1Z9",
      invoiceNumber: "BED-99120",
      date: p2Date,
      taxableAmount: 5000,
      cgst: 450,
      sgst: 450,
      igst: 0,
      cess: 0,
      total: 5900,
      interstate: false,
      itcEligibility: "eligible",
      paymentStatus: "Paid",
      items: [
        {
          name: "Thermal Paper Rolls (80mm Bulk Pack)",
          hsn: "4811",
          quantity: 10,
          unit: "BOX",
          rate: 500,
          taxPercent: 18,
          cessPercent: 0,
        },
      ],
      created_at: now - 4 * 3600 * 1000,
    },
  ];
}

export const SAMPLE_SANDBOX_INVOICES = buildSandboxInvoices().map((s) => s.data);
export const SAMPLE_SANDBOX_PURCHASES = buildSandboxPurchases();

/**
 * Idempotently seeds pre-configured sample business bills, purchases, clients, and profile into IndexedDB.
 * Safe to invoke repeatedly without creating duplicates.
 */
export async function seedSandboxData(): Promise<void> {
  // 1. Save profile
  await saveBusinessProfile(SAMPLE_SANDBOX_PROFILE);

  // 2. Save sample clients (deterministic IDs -> idempotent put)
  const now = Date.now();
  const sampleClients: Client[] = [
    {
      id: "client-sandbox-1",
      name: "Apex Cloud Technologies Pvt Ltd",
      gstin: "27AABCU9603R1ZM",
      phone: "9811122233",
      email: "accounts@apexcloud.in",
      address: "Bandra Kurla Complex, Mumbai, Maharashtra",
      state: "Maharashtra",
      stateCode: "27",
      type: "customer",
      created_at: now,
    },
    {
      id: "client-sandbox-2",
      name: "Gupta Traders Delhi",
      gstin: "07BBBBB1111B1Z2",
      phone: "9822233344",
      email: "gupta@traders.com",
      address: "Chandni Chowk, Delhi",
      state: "Delhi",
      stateCode: "07",
      type: "customer",
      created_at: now,
    },
    {
      id: "client-sandbox-3",
      name: "National Cloud Hosting & Data Ltd",
      gstin: "07CCCC0000C1Z8",
      phone: "9833344455",
      address: "Okhla Industrial Area Phase 3, New Delhi",
      state: "Delhi",
      stateCode: "07",
      type: "vendor",
      created_at: now,
    },
  ];

  for (const c of sampleClients) {
    await saveClient(c);
  }

  // 3. Upsert sample sales invoices (idempotent by deterministic ID)
  const invoices = buildSandboxInvoices();
  for (const inv of invoices) {
    await upsertInvoice(inv);
  }

  // 4. Upsert sample purchases (idempotent by deterministic ID)
  const purchases = buildSandboxPurchases();
  for (const p of purchases) {
    await savePurchase(p);
  }
}

/**
 * Clears all sandbox invoices and purchases cleanly.
 */
export async function clearAllSandboxData(): Promise<void> {
  const [invs, purs] = await Promise.all([
    getAllInvoices(),
    getAllPurchases().catch(() => []),
  ]);

  for (const inv of invs) {
    await deleteInvoice(inv.id);
  }
  for (const pur of purs) {
    await deletePurchase(pur.id);
  }
}

export const clearAllSandboxInvoices = clearAllSandboxData;

/**
 * Checks if user is currently running in guest sandbox mode
 */
export function isSandboxModeActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("gstlens_sandbox_mode") === "true";
}

/**
 * Activates sandbox mode in localStorage
 */
export function activateSandboxMode(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("gstlens_sandbox_mode", "true");
  localStorage.setItem("gstlens_offline_mode", "true");
}

/**
 * Exits sandbox mode
 */
export function deactivateSandboxMode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("gstlens_sandbox_mode");
  localStorage.removeItem("gstlens_offline_mode");
}
