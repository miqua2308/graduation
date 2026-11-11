import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' để site chạy được dưới subpath của repo (https://user.github.io/<repo>/)
export default defineConfig({
  base: './',
  plugins: [react()],
})
