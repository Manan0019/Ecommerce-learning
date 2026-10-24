import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Keep automated browser-profile databases out of Vite's file watcher.
// Chrome locks Cookies and Session files on Windows while browser tests run.
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/.ui-browser/**', '**/.ui-artifacts/**'],
    },
  },
})
