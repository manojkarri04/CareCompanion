import type { NextConfig } from "next";

const FASTAPI_SERVICE_URL = process.env.FASTAPI_SERVICE_URL || "http://localhost:8001";
const DJANGO_SERVICE_URL = process.env.DJANGO_SERVICE_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      // FastAPI Microservice (:8001) for Chat, AI Analysis, and Geospatial Intelligence
      {
        source: "/api/chat/:path*",
        destination: `${FASTAPI_SERVICE_URL}/api/chat/:path*`,
      },
      {
        source: "/api/analyze",
        destination: `${FASTAPI_SERVICE_URL}/api/analyze`,
      },
      {
        source: "/api/hackathon-analyze",
        destination: `${FASTAPI_SERVICE_URL}/api/hackathon-analyze`,
      },

      // Django Microservice (:8000) for Core Domain Logic
      {
        source: "/api/appointments/:path*",
        destination: `${DJANGO_SERVICE_URL}/api/appointments/:path*`,
      },
      {
        source: "/api/alerts/:path*",
        destination: `${DJANGO_SERVICE_URL}/api/alerts/:path*`,
      },
      {
        source: "/api/notes/:path*",
        destination: `${DJANGO_SERVICE_URL}/api/notes/:path*`,
      },
      {
        source: "/api/documents/:path*",
        destination: `${DJANGO_SERVICE_URL}/api/documents/:path*`,
      },
    ];
  },
};

export default nextConfig;
