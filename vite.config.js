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
  build: {
    sourcemap: true,
     minify: false, // Disable minification to debug icon issue
     rollupOptions: {
      output: {
        manualChunks(id) {
          // Don't create a separate lucide chunk - let it be inlined
          // This prevents cross-chunk re-export issues
          if (id.includes('node_modules/lucide-react')) {
            return undefined // Don't chunk, let it inline
          }
        }
      }
    }
  },
})
