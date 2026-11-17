import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bchblaze/identity", "@bchblaze/contracts"],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };
    if (config.output) {
      config.output.environment = {
        ...config.output.environment,
        asyncFunction: true,
        bigIntLiteral: true,
      };
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
