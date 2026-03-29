import { defineConfig } from 'vite' // Thiếu dòng này nè!
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true // Để Docker có thể truy cập được
  }
})