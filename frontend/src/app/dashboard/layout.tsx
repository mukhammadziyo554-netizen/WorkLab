"use client";

import { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/ui/Sidebar";
import MobileTelegramNav from "../../components/ui/MobileTelegramNav";
import DashboardTopBar from "../../components/ui/DashboardTopBar";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";
import { fetchBillingStatus } from "../../lib/billing";
import { clearSessionToken } from "../../lib/session";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [billingStatus, setBillingStatus] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const sessionToken = window.localStorage.getItem("worklab_session_token");
    if (!sessionToken) {
      router.replace("/login");
      return;
    }

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      clearSessionToken();
      router.replace("/login");
      return;
    }

    const validateSession = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}/auth/session`, {
          headers: getApiHeaders({
            Authorization: `Bearer ${sessionToken}`,
          }),
        });

        if (!response.ok) {
          clearSessionToken();
          router.replace("/login");
          return;
        }

        try {
          const billing = await fetchBillingStatus();
          setBillingStatus(billing.subscription_status);
          setIsAdmin(Boolean(billing.admin_bypass));
        } catch {
          setBillingStatus("");
          setIsAdmin(false);
        }
      } catch {
        clearSessionToken();
        router.replace("/login");
      }
    };

    void validateSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#05070f] text-slate-100">
      {/* Sidebar is fixed by component; render it in-flow so sidebar internals include a spacer */}
      <Sidebar onCollapseChange={setSidebarCollapsed} />
      <div className="md:hidden">
        <MobileTelegramNav />
      </div>
      <div className="transition-all duration-300" style={{ marginLeft: sidebarCollapsed ? 72 : 240 }}>
        <div className="fixed top-0 right-0 z-40 transition-all duration-300" style={{ left: sidebarCollapsed ? 72 : 240 }}>
          <DashboardTopBar />
        </div>
        <main className="pt-16 p-5 sm:p-6 lg:p-8">
        {billingStatus && billingStatus !== "active" && !isAdmin ? (
          <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-300/10 p-3.5 text-[0.85rem] text-amber-100">
            <p className="font-semibold">Subscription Required</p>
            <p className="mt-1 text-amber-100/90">
              Some features are locked until you activate a plan.
              <Link href="/pricing" className="ml-2 underline decoration-amber-200/70 underline-offset-2 hover:text-white">
                View pricing
              </Link>
            </p>
          </div>
        ) : null}
        {children}
        </main>
      </div>
    </div>
  );
}
