import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  // This repository uses GitHub project Pages; keep local previews at the root.
  base: mode === 'production' ? '/vibeflix-android-windows/' : '/',
  plugins: [react()],
  // hls.js is a deferred, playback-only chunk and should not block initial browsing.
  build: { chunkSizeWarningLimit: 650 },
  server: { allowedHosts: ['.e2b.app'] },
}))
