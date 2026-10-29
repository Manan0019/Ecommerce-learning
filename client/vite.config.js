import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Keep automated browser-profile databases out of Vite's file watcher.
// Chrome locks Cookies and Session files on Windows while browser tests run.
export default defineConfig({
  plugins: [react()],
  server: {
    // Development-only API, media, and Socket.IO proxy. Vite's HMR uses its own path.
    // If a client .env sets VITE_API_URL or VITE_SOCKET_URL, update those URLs too.
    proxy: {
      '/api': { target: 'http://127.0.0.1:4001', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:4001', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:4001', changeOrigin: true, ws: true },
    },
    watch: {
      ignored: ['**/.ui-browser/**', '**/.ui-artifacts/**'],
    },
  },
})
