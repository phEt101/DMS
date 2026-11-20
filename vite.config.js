import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiProxy = {
  '/boswell-api': 'http://127.0.0.1:3000',
  '/api': 'http://127.0.0.1:3000',
}

// ค่าเริ่มต้นผูกกับ loopback (ปลอดภัย) — ตั้ง VITE_HOST=0.0.0.0 เพื่อแชร์ให้เครื่องอื่นในวง Wi-Fi เดียวกัน
const host = process.env.VITE_HOST ?? '127.0.0.1'

export default defineConfig({
  plugins: [react()],
  server: {
    host,
    allowedHosts: ['.trycloudflare.com'],
    port: 5137,
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    host,
    port: 4173,
    proxy: apiProxy,
  },
})
