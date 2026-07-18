import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@calcom/cal-sans-ui"],
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "phwwfimrpbdwiwpkuzwj.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "cityofsantamonica.getbynder.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
