import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.',
  base: './',
  publicDir: 'public',
  server: {
    port: 5500,
    host: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase') || id.includes('supabase-js') || id.includes('@supabase/functions')) return 'vendor-supabase'
            if (id.includes('lucide')) return 'vendor-icons'
            if (id.includes('@coldwired') || id.includes('svelte') || id.includes('zod')) return 'vendor-core'
            return 'vendor'
          }
        },
      },
    },
  },
})
