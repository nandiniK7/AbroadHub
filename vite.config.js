import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend runs as a separate process in dev (see server/dev.js). Proxy
// /api so the frontend can keep using relative fetch() calls exactly
// as it does in production, where the same Node process serves both.
const API_PORT = process.env.PORT || 8787;

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      }
    }
  }
});
