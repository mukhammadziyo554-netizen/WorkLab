/** @type {import('next').NextConfig} */
function pickBackendTarget() {
  const internal = process.env.BACKEND_INTERNAL_URL?.trim();
  if (internal) {
    return internal;
  }

  const publicUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (publicUrl && !/your-backend-domain\.com/i.test(publicUrl)) {
    return publicUrl;
  }

  return "http://localhost:8000";
}

const backendTarget = pickBackendTarget();

const nextConfig = {
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