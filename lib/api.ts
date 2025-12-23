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
  buyer_gstin?: string | null;
  invoice_type: "B2B" | "B2C";
  pos?: string;
  taxable_value?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  invoice_total?: number;
  warning?: string;
  seller_gstin_info?: GstInfo;
  buyer_gstin_info?: GstInfo;
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
  const res = await authFetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse(res);
}

export async function saveGSTINBackend(gstin: string) {
  const res = await authFetch("/profile/gstin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gstin }),
  });
  return handleResponse(res);
}

export async function updateSettingsBackend(settings: any) {
  const res = await authFetch("/profile/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  return handleResponse(res);
}

export async function fetchGSTInfo(gstin: string): Promise<GSTResponse> {
  if (!API_BASE) {
    throw new Error("API base URL not configured");
  }

  const res = await fetch(`${API_BASE}/gstinfo/${gstin}`, {
    method: "GET",
  });

  return handleResponse(res);
}
