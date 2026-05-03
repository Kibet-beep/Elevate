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
    // Optimize development experience
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    }
  },
  build: {
    sourcemap: true,
    minify: true, // Use default minifier
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split icons into separate lazy-loadable chunk
          if (id.includes('icons.generated')) {
            return 'icons'
          }
          // Split supabase into separate chunk
          if (id.includes('node_modules/@supabase')) {
            return 'supabase'
          }
          // React & core dependencies go to vendor
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')) {
            return 'vendor-react'
          }
        },
        // Optimize async chunk loading - smaller initial payload
        dir: 'dist',
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
})
