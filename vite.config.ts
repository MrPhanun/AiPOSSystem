import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The dev server proxies the Laravel API so the browser sees ONE origin (localhost:5173).
// That keeps Sanctum's cookie/session auth simple: no CORS, first-party cookies.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: false },
      "/sanctum": { target: "http://127.0.0.1:8000", changeOrigin: false },
    },
  },
});
