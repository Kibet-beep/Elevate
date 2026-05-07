import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  base: mode === 'capacitor' ? './' : '/',
  resolve: {
    conditions: ['module', 'browser', 'development', 'import', 'default'],
    dedupe: ['rxdb', 'dexie']
  },
  optimizeDeps: {
    exclude: ['rxdb', 'rxdb-supabase'],
    include: ['dexie']
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    }
  },
  build: {
    sourcemap: true,
    minify: true,
    chunkSizeWarningLimit: 1000,
    worker: {
      format: 'es',
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('icons.generated')) return 'icons'
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')) {
            return 'vendor-react'
          }
        },
        dir: 'dist',
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
}))