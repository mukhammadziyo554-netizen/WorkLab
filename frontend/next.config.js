/** @type {import('next').NextConfig} */
function pickBackendTarget() {
  const internal = process.env.BACKEND_INTERNAL_URL?.trim();
  if (internal) {
    return internal;
  }

  const publicApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApi && !/your-backend-domain\.com/i.test(publicApi)) {
    return publicApi;
  }

  const legacy = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (legacy && !/your-backend-domain\.com/i.test(legacy)) {
    return legacy;
  }

  return "http://localhost:8000";
}

const backendTarget = pickBackendTarget();

const nextConfig = {
  // Prevent dev and build processes from corrupting each other's chunk outputs.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  async rewrites() {
    return [
      {
        source: "/telegram-auth",
        destination: `${backendTarget}/telegram-auth`,
      },
      {
        source: "/auth/:path*",
        destination: `${backendTarget}/auth/:path*`,
      },
      {
        source: "/ai/:path*",
        destination: `${backendTarget}/ai/:path*`,
      },
      {
        source: "/operations/:path*",
        destination: `${backendTarget}/operations/:path*`,
      },
      {
        source: "/features/:path*",
        destination: `${backendTarget}/features/:path*`,
      },
      {
        source: "/billing/:path*",
        destination: `${backendTarget}/billing/:path*`,
      },
      {
        source: "/admin/:path*",
        destination: `${backendTarget}/admin/:path*`,
      },
      {
        source: "/health",
        destination: `${backendTarget}/health`,
      },
      {
        source: "/docs",
        destination: `${backendTarget}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${backendTarget}/openapi.json`,
      },
    ];
  },
};

module.exports = nextConfig;