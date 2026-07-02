import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// El frontend habla con el sidecar FastAPI (enjambre.api) en 127.0.0.1:8000.
// El CORS del sidecar ya permite localhost:5173, asi que la base se fija en
// el cliente (src/api/client.ts) y no hace falta proxy.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
})
