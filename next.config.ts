import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    localPatterns: [
      { pathname: "/brand/**", search: "*" },
      { pathname: "/brand/**" },
    ],
  },
  transpilePackages: [
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-react-ui",
  ],
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
