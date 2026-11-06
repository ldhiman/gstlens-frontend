const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

import { getIdToken } from "@/lib/authToken";
import { UPDATE_CREDIT_EVENT } from "@/lib/constants";

/* ----------------------------- */
/* Types (minimal, reusable)     */
/* ----------------------------- */

export type CanonicalInvoice = {
  invoice_number?: string;
  invoice_date?: string;
  seller_gstin?: string;
  seller_name?: string;
  buyer_gstin?: string | null;
  buyer_name?: string | null;
  invoice_type: "B2B" | "B2C";
  pos?: string;
  taxable_value?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  invoice_total?: number;
  warning?: string;
  duplicate_warning?: string;
  seller_gstin_info?: GstInfo;
  buyer_gstin_info?: GstInfo;
  items?: Array<{
    name?: string;
    hsn?: string;
    quantity?: number;
    unit?: string;
    rate?: number;
    tax_percent?: number;
    amount?: number;
  }>;
};

export type GstInfo = {
  gstin: string;
  legal_name: string;
  trade_name: string;
  status: string;
  constitution: string;
  state_code: string;
  state: string;
  pan_number: string;
  address?: string;
  city?: string;
  pincode?: string;
};

export type UploadResponse = {
  status: "success" | "error";
  data: CanonicalInvoice;
};

export type GSTResponse = {
  status: "success" | "error";
  data: GstInfo;
};

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = await getIdToken();

  const headers = {
    ...(options.headers || {}),
    Authorization: token ? `Bearer ${token}` : "",
  };

  return fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });
}

/* ----------------------------- */
/* Helper: check HTTP response   */
/* ----------------------------- */

export async function handleResponse(res: Response) {
  if (!res.ok) {
    let msg = "Request failed";
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/* ----------------------------- */
/* Upload invoice (image / PDF)  */
/* ----------------------------- */

export async function uploadInvoice(file: File): Promise<UploadResponse> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error(
      "You are currently offline. Cloud AI OCR requires an internet connection. You can still create invoices, record purchases, and enter items manually in offline mode."
    );
  }

  if (!API_BASE) {
    throw new Error("API base URL not configured");
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`/upload`, {
    method: "POST",
    body: formData,
  });

  window.dispatchEvent(new Event(UPDATE_CREDIT_EVENT));

  return handleResponse(res);
}

export async function secureCall() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { status: "offline" };
  }
  const res = await authFetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res);
}

export async function saveGSTINBackend(gstin: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { status: "offline_saved", gstin };
  }
  const res = await authFetch("/profile/gstin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gstin }),
  });
  return handleResponse(res);
}

export async function updateSettingsBackend(settings: any) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { status: "offline_saved", settings };
  }
  const res = await authFetch("/profile/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function fetchGSTInfo(gstin: string): Promise<GSTResponse> {
  const cleanGstin = (gstin || "").trim().toUpperCase();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const stateCode = cleanGstin.slice(0, 2);
    const panNumber = cleanGstin.length >= 12 ? cleanGstin.slice(2, 12) : "";
    return {
      status: "success",
      data: {
        gstin: cleanGstin,
        legal_name: "Local Offline Party",
        trade_name: "Local Offline Business",
        status: "Active (Offline Mode)",
        constitution: "Private Limited",
        state_code: stateCode,
        state: "India (Offline)",
        pan_number: panNumber,
        address: "Local Registered Office",
        city: "Local City",
        pincode: "110001",
      },
    };
  }

  const base = API_BASE || "http://127.0.0.1:8000";

  const res = await fetch(`${base}/gstinfo/${cleanGstin}`, {
    method: "GET",
  });

  return handleResponse(res);
}
