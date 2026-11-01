import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @1password/sdk ships a WASM file it loads by path. Bundling moves that path, so the
  // package stays a plain Node import at runtime.
  serverExternalPackages: ["@1password/sdk"],
  async rewrites() {
    // Next ignores directories whose name starts with a dot, so the two
    // well-known documents are served from normal routes and rewritten here.
    return [
      { source: "/.well-known/openid-configuration", destination: "/api/oidc/discovery" },
      { source: "/.well-known/jwks.json", destination: "/api/oidc/jwks" },
    ];
  },
};

export default nextConfig;
