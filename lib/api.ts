const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

import { getIdToken } from "@/lib/authToken";
import { UPDATE_CREDIT_EVENT, AI_RETRY_EVENT, AiRetryEventDetail } from "@/lib/constants";

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
  created_time?: string;
  updated_time?: string;
  created_at?: number;
  updated_at?: number;
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

function isGuestSandboxActive(): boolean {
  return (
    typeof window !== "undefined" &&
    localStorage.getItem("gstlens_sandbox_mode") === "true"
  );
}

async function simulateSandboxUpload(
  file: File,
  signal?: AbortSignal
): Promise<UploadResponse> {
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      const err = new Error("Aborted");
      err.name = "AbortError";
      reject(err);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      const err = new Error("Aborted");
      err.name = "AbortError";
      reject(err);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, 2000);
    signal?.addEventListener("abort", onAbort, { once: true });
  });

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const shortName = (file.name || "Bill").replace(/\.[^/.]+$/, "").slice(0, 28);

  return {
    status: "success",
    data: {
      invoice_number: `DEMO-${Math.floor(100 + Math.random() * 900)}`,
      invoice_date: `${dd}-${mm}-${yyyy}`,
      seller_gstin: "07AAAAA0000A1Z5",
      seller_name: "Sharma Infotech & Retail Solutions",
      buyer_gstin: "27AABCU9603R1ZM",
      buyer_name: "Apex Cloud Technologies Pvt Ltd",
      invoice_type: "B2B",
      pos: "27",
      taxable_value: 8500,
      cgst: 0,
      sgst: 0,
      igst: 1530,
      invoice_total: 10030,
      warning:
        "Sandbox Demo Extraction: Simulated AI output. Sign in free with Google to scan real bills using Gemini 2.5 Flash.",
      items: [
        {
          name: `Demo Scan (${shortName})`,
          hsn: "998311",
          quantity: 1,
          unit: "NOS",
          rate: 8500,
          tax_percent: 18,
          amount: 8500,
        },
      ],
    },
  };
}

export async function uploadInvoice(
  file: File,
  options?: { signal?: AbortSignal }
): Promise<UploadResponse> {
  const token = await getIdToken();
  if (!token && isGuestSandboxActive()) {
    return simulateSandboxUpload(file, options?.signal);
  }

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

  const maxRetries = 2;
  const retryDelaySeconds = 5;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await authFetch(`/upload`, {
        method: "POST",
        body: formData,
        signal: options?.signal,
      });

      if (res.status === 503 && attempt < maxRetries) {
        console.warn(
          `[AI Model 503] Model experiencing high demand (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in 5 seconds...`
        );

        // Live 5s countdown for UI widgets
        for (let s = retryDelaySeconds; s >= 1; s--) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent<AiRetryEventDetail>(AI_RETRY_EVENT, {
                detail: {
                  active: true,
                  attempt: attempt + 1,
                  maxRetries: maxRetries + 1,
                  secondsLeft: s,
                },
              })
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent<AiRetryEventDetail>(AI_RETRY_EVENT, {
              detail: {
                active: false,
                attempt: attempt + 1,
                maxRetries: maxRetries + 1,
                secondsLeft: 0,
              },
            })
          );
        }
        continue;
      }

      window.dispatchEvent(new Event(UPDATE_CREDIT_EVENT));
      return await handleResponse(res);
    } catch (err: any) {
      if (options?.signal?.aborted) {
        throw err;
      }
      const errStr = (err?.message || "").toLowerCase();
      const is503 =
        errStr.includes("503") ||
        errStr.includes("unavailable") ||
        errStr.includes("high demand");
      if (is503 && attempt < maxRetries) {
        console.warn(
          `[AI Model 503] Model high demand spike encountered (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in 5 seconds...`
        );

        for (let s = retryDelaySeconds; s >= 1; s--) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent<AiRetryEventDetail>(AI_RETRY_EVENT, {
                detail: {
                  active: true,
                  attempt: attempt + 1,
                  maxRetries: maxRetries + 1,
                  secondsLeft: s,
                },
              })
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent<AiRetryEventDetail>(AI_RETRY_EVENT, {
              detail: {
                active: false,
                attempt: attempt + 1,
                maxRetries: maxRetries + 1,
                secondsLeft: 0,
              },
            })
          );
        }
        continue;
      }
      throw err;
    }
  }

  throw new Error(
    "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."
  );
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

function buildLocalGstInfoFallback(cleanGstin: string): GSTResponse {
  const stateCode = cleanGstin.slice(0, 2);
  const panNumber = cleanGstin.length >= 12 ? cleanGstin.slice(2, 12) : "";
  const isSandbox = isGuestSandboxActive();
  return {
    status: "success",
    data: {
      gstin: cleanGstin,
      legal_name: isSandbox ? "Demo Registered Business" : "Local Offline Party",
      trade_name: isSandbox ? "Demo Registered Business" : "Local Offline Business",
      status: isSandbox ? "Active (Sandbox Mode)" : "Active (Offline Mode)",
      constitution: "Private Limited",
      state_code: stateCode,
      state: isSandbox ? `State Code ${stateCode}` : "India (Offline)",
      pan_number: panNumber,
      address: "Registered Office",
      city: "New Delhi",
      pincode: "110001",
    },
  };
}

export async function fetchGSTInfo(gstin: string): Promise<GSTResponse> {
  const cleanGstin = (gstin || "").trim().toUpperCase();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return buildLocalGstInfoFallback(cleanGstin);
  }

  const base = API_BASE || "http://127.0.0.1:8000";

  try {
    const res = await fetch(`${base}/gstinfo/${cleanGstin}`, {
      method: "GET",
    });

    return await handleResponse(res);
  } catch (err) {
    if (isGuestSandboxActive()) {
      return buildLocalGstInfoFallback(cleanGstin);
    }
    throw err;
  }
}
