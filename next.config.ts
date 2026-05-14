import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use React strict mode for catching bugs
  reactStrictMode: true,

  // Allow Supabase storage images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Suppress hydration warnings from browser extensions
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
