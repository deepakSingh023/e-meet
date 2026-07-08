import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: "0.0.0.0",
    port: 5173,

    https: {
      key: fs.readFileSync("./certs/localhost+3-key.pem"),
      cert: fs.readFileSync("./certs/localhost+3.pem"),
    },
  },
})