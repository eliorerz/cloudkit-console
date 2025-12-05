import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'patternfly': ['@patternfly/react-core', '@patternfly/react-icons'],
          'i18n': ['i18next', 'react-i18next'],
        },
      },
    },
    // Increase chunk size warning limit since we're using code splitting
    chunkSizeWarningLimit: 600,
  },
})
