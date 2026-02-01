import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Si usas la v4 de tailwind

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/promptpad/', // <--- ¡AÑADE ESTA LÍNEA!
})