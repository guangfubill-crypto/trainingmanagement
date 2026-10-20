import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_BASE_PATH || (mode === "demo" ? "/trainingmanagement/" : "/"),
    define: { "import.meta.env.VITE_DEMO_MODE": JSON.stringify(mode === "demo" ? "true" : "false") },
    plugins: [vue()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": { target: env.API_PROXY_TARGET || "http://127.0.0.1:8000" },
      },
    },
  };
});
