import type { NextConfig } from "next";

function getBackendOrigin(): string | undefined {
  const value = process.env.BACKEND_INTERNAL_URL?.trim();
  if (!value) {
    return undefined;
  }

  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("BACKEND_INTERNAL_URL must use HTTP or HTTPS.");
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new TypeError(
      "BACKEND_INTERNAL_URL must be an origin without credentials, path, query, or fragment.",
    );
  }

  return url.origin;
}

const backendOrigin = getBackendOrigin();

const nextConfig: NextConfig = {
  output: "standalone",
  // Django's API contract uses trailing slashes. Preserve them so Next.js does
  // not redirect the request before the external rewrite is applied.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (!backendOrigin) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*/",
        destination: `${backendOrigin}/api/v1/:path*/`,
      },
      {
        source: "/api/health/",
        destination: `${backendOrigin}/api/health/`,
      },
    ];
  },
};

export default nextConfig;
