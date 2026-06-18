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
})
