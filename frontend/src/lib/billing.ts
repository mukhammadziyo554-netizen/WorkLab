import { getApiHeaders, getBackendBaseUrl } from "./backend";

const SESSION_KEY = "worklab_session_token";

export type BillingStatus = {
  role: string;
  subscription_status: string;
  subscription_plan: string;
  subscription_expiry: string | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  features: {
    ai_employees: number;
    telegram_bots: number;
    analytics: string;
  };
  admin_bypass: boolean;
};

export type BillingPlan = {
  id: "starter" | "pro" | "business";
  name: string;
  price_usd: number;
  limits: {
    ai_employees: number;
    telegram_bots: number;
    analytics: string;
  };
};

function getSessionToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(SESSION_KEY) || "";
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const baseUrl = getBackendBaseUrl();
  const token = getSessionToken();
  const response = await fetch(`${baseUrl}/billing/status`, {
    headers: getApiHeaders({
      Authorization: `Bearer ${token}`,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to load billing status");
  }

  const data = (await response.json()) as { billing: BillingStatus };
  return data.billing;
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  const baseUrl = getBackendBaseUrl();
  const response = await fetch(`${baseUrl}/billing/plans`, {
    headers: getApiHeaders(),
  });
  if (!response.ok) {
    throw new Error("Failed to load plans");
  }
  const data = (await response.json()) as { plans?: BillingPlan[] };
  return data.plans || [];
}
