import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use a relative base so asset URLs in the built `index.html` work
  // when loaded from the Android WebView (file://) inside the APK.
  base: './',
  server: {
    host: true, // Listen on all addresses for network access
    port: 5173,
    strictPort: true,
  },
})
