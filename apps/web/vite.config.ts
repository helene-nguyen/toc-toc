import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // every /api call goes to the Fastify server — same origin in the browser
    // (mirrors production, where Fastify serves the built web app itself)
    proxy: {
      // 127.0.0.1, not localhost: Node resolves localhost to IPv6 (::1) first,
      // while the API listens on IPv4 (0.0.0.0)
      '/api': 'http://127.0.0.1:4210'
    }
  }
});
