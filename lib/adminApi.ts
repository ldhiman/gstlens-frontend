// lib/adminApi.ts

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const ADMIN_TOKEN_KEY = "gstlens_admin_jwt_token";

export interface AdminStats {
  total_users: number;
  active_subscriptions: number;
  custom_subscriptions: number;
  total_platform_credits: number;
  verified_gstin_count: number;
}

export interface AdminUserSubscription {
  active?: boolean;
  status?: string;
  is_custom?: boolean;
  plan?: string;
  deal_amount?: number;
  billing_cycle?: string;
  current_period_end?: number;
  unlimited_credits?: boolean;
  notes?: string;
  razorpay_subscription_id?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  name: string;
  photoURL?: string | null;
  credits: number;
  primary_gstin?: string;
  gst_verified: boolean;
  subscription?: AdminUserSubscription;
  upcoming_subscription?: any;
  cloud_sync_enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomSubscriptionPayload {
  plan_name: string;
  deal_amount: number;
  billing_cycle: "monthly" | "quarterly" | "annual" | "lifetime" | "custom";
  duration_days: number;
  active: boolean;
  unlimited_credits: boolean;
  bonus_credits: number;
  cloud_sync_enabled: boolean;
  notes?: string;
  as_upcoming?: boolean;
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
}

export function removeAdminToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

function authHeaders(): HeadersInit {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAdminSetup(masterKey: string): Promise<{
  secret: string;
  provisioning_uri: string;
  instructions: string;
}> {
  const url = new URL(`${API_BASE}/admin/setup-info`);
  url.searchParams.append("master_key", masterKey);

  const res = await fetch(url.toString(), {
    method: "GET",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to fetch 2FA setup");
  }
  return data;
}

export async function adminLogin(
  password: string,
  totpCode: string
): Promise<{ token: string; expires_at: number }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      password,
      totp_code: totpCode,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Authentication failed");
  }

  setAdminToken(data.token);
  return data;
}

export async function verifyAdminSession(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_BASE}/admin/verify-token`, {
      method: "GET",
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to fetch stats");
  }
  return data;
}

export async function fetchAdminUsers(
  search = "",
  filter = "all"
): Promise<AdminUser[]> {
  const url = new URL(`${API_BASE}/admin/users`);
  if (search) url.searchParams.append("search", search);
  if (filter) url.searchParams.append("status_filter", filter);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to fetch users");
  }
  return data.users || [];
}

export async function updateCustomSubscription(
  uid: string,
  payload: CustomSubscriptionPayload
): Promise<AdminUserSubscription> {
  const res = await fetch(`${API_BASE}/admin/users/${uid}/subscription`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to update custom subscription");
  }
  return data.subscription;
}

export async function adjustUserCredits(
  uid: string,
  amount: number,
  mode: "add" | "set" = "add",
  note = ""
): Promise<number> {
  const res = await fetch(`${API_BASE}/admin/users/${uid}/credits`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ amount, mode, note }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to adjust credits");
  }
  return data.credits;
}

export interface CancelSubscriptionResponse {
  status: string;
  activated_upcoming?: boolean;
  message: string;
  subscription?: any;
}

export async function cancelUserSubscription(
  uid: string
): Promise<CancelSubscriptionResponse> {
  const res = await fetch(`${API_BASE}/admin/users/${uid}/subscription`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to cancel subscription");
  }
  return data;
}
