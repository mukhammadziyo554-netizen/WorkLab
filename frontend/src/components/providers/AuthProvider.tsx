"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getSessionToken, clearSessionToken } from "../../lib/session";
import { getBackendBaseUrl, getApiHeaders, fetchWithRetry } from "../../lib/backend";

type User = any;

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      const token = getSessionToken();
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const url = `${getBackendBaseUrl()}/auth/session`;
        const res = await fetchWithRetry(url, { headers: getApiHeaders() }, 1);
        if (!res.ok) {
          clearSessionToken();
          if (mounted) setUser(null);
          return;
        }

        const data = await res.json();
        if (mounted) setUser(data.user || null);
      } catch (err) {
        // network or other error: preserve token but leave user null
        console.warn("Auth restore failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restore();

    return () => {
      mounted = false;
    };
  }, []);

  function logout() {
    clearSessionToken();
    setUser(null);
    try {
      // fire-and-forget backend logout
      fetch(`${getBackendBaseUrl()}/auth/logout`, { method: "POST", headers: getApiHeaders() }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthProvider;
