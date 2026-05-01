import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  server: {
  allowedHosts: ['archlinux.tail505e1.ts.net'],
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
