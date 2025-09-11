import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Set base to your repo name for GitHub Pages
  base: 'https://leidygbeta1.github.io/Calculadora-EPI3/',
  // Optional: build into docs/ so Pages can serve from main/docs
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
})
