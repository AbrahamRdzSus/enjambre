import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureApiToken } from './api/token'
import { watchCspViolations } from './lib/csp'

// Una CSP que bloquea algo en SILENCIO es lo peor que puede pasar: la app se rompe
// sin dejar rastro. Esto lo convierte en un error visible en la consola.
watchCspViolations()

// Se espera al token del sidecar ANTES del primer render. Sin esto hay una carrera
// real: React monta al instante, el EventSource de /logs/stream lee el token UNA sola
// vez al montar, y el sidecar todavia esta arrancando -> el stream quedaba abierto sin
// token para siempre y las primeras peticiones daban 401. Si el token no llega a
// tiempo, se renderiza igual (la UI ya sabe mostrar el error) en vez de dejar la
// ventana en blanco.
ensureApiToken().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
