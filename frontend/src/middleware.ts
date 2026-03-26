import { NextRequest, NextResponse } from "next/server";

const SESSION_KEY = "worklab_session_token";

function stripTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function isPlaceholderBackendUrl(value: string): boolean {
  return /your-backend-domain\.com/i.test(value);
}

function getBackendTarget(): string {
  const internal = process.env.BACKEND_INTERNAL_URL?.trim();
  if (internal) {
    return stripTrailingSlash(internal);
  }

  // prefer explicit public API env (NEXT_PUBLIC_API_URL)
  const publicApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApi && !isPlaceholderBackendUrl(publicApi)) {
    return stripTrailingSlash(publicApi);
  }

  const legacy = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (legacy && !isPlaceholderBackendUrl(legacy)) {
    return stripTrailingSlash(legacy);
  }

  return "http://127.0.0.1:8000";
}

async function isAdminRequest(token: string): Promise<boolean> {
  const backendTarget = getBackendTarget();

  try {
    const response = await fetch(`${backendTarget}/auth/session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as {
      user?: {
        role?: string;
      };
    };

    return data.user?.role === "admin";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_KEY)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isAdmin = await isAdminRequest(token);
  if (!isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
