import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dedupe the peer packages so the real bigface components (resolved through their symlinked
// workspace path) share one React and one Radix copy with this app.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "radix-ui",
      "@base-ui/react",
      "class-variance-authority",
      "lucide-react",
      "cn",
      "tailwindcss",
    ],
  },
  server: { host: "127.0.0.1", port: 38810, strictPort: true },
  preview: { host: "127.0.0.1", port: 38810, strictPort: true },
});
