"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { getApiHeaders, getBackendBaseUrl } from "../../lib/backend";

type MobileNavItem = {
  label: string;
  href: string;
};

export default function MobileTelegramNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = useMemo<MobileNavItem[]>(
    () => [
      { label: "Dashboard", href: "/dashboard" },
      { label: "AI Employees", href: "/dashboard/ai-employees" },
      { label: "Knowledge Base", href: "/dashboard/knowledge-base" },
      { label: "Conversations", href: "/dashboard/conversations" },
      { label: "Analytics", href: "/dashboard/analytics" },
      { label: "Settings", href: "/dashboard/settings" },
      { label: "Billing", href: "/dashboard/settings/billing" },
      { label: "Pricing", href: "/pricing" },
      { label: "Profile", href: "/dashboard/profile" },
    ],
    []
  );

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onEscape);
    };
  }, [isOpen]);

  const onLogout = async () => {
    const token = window.localStorage.getItem("worklab_session_token");
    const backendBaseUrl = getBackendBaseUrl();

    setIsLoggingOut(true);
    try {
      if (token && backendBaseUrl) {
        await fetch(`${backendBaseUrl}/auth/logout`, {
          method: "POST",
          headers: getApiHeaders({
            Authorization: `Bearer ${token}`,
          }),
        });
      }
    } catch {
      // Continue with client-side logout even if API call fails.
    } finally {
      window.localStorage.removeItem("worklab_session_token");
      setIsOpen(false);
      router.push("/login");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-white/10 bg-[#070b16]/90 backdrop-blur md:hidden"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 pb-3"
          style={{
            paddingLeft: "calc(env(safe-area-inset-left) + 0.75rem)",
            paddingRight: "calc(env(safe-area-inset-right) + 0.75rem)",
          }}
        >
          <button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((previous) => !previous)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 transition hover:border-cyan-300/45"
          >
            <span
              className={`absolute h-[2px] w-5 rounded-full bg-current transition-all ${
                isOpen ? "translate-y-0 rotate-45" : "-translate-y-[4px] rotate-0"
              }`}
              style={{ transitionDuration: "250ms" }}
            />
            <span
              className={`absolute h-[2px] w-5 rounded-full bg-current transition-all ${
                isOpen ? "translate-y-0 -rotate-45" : "translate-y-[4px] rotate-0"
              }`}
              style={{ transitionDuration: "250ms" }}
            />
          </button>

          <Link href="/dashboard" className="text-base font-semibold tracking-tight text-white">
            WorkLab
          </Link>

          <LanguageSwitcher />
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/45 transition-opacity md:hidden ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ transitionDuration: "250ms" }}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      >
        <aside
          className={`h-full w-[52vw] min-w-[220px] max-w-[320px] border-r border-white/10 bg-[#0a1020] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-transform ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            transitionDuration: "250ms",
            paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <nav className="grid gap-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? "border border-cyan-300/35 bg-cyan-300/15 text-cyan-100"
                      : "border border-transparent text-slate-200 hover:border-white/10 hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="mt-2 rounded-lg border border-white/10 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:border-rose-300/45 hover:bg-rose-400/10 hover:text-rose-200"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </nav>
        </aside>
      </div>
    </>
  );
}
