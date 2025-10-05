import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  optimizeDeps: {
    include: ['react', 'react-dom', 'hoist-non-react-statics'],
    exclude: ['@emotion/styled']
  },
  plugins: [react()]
})