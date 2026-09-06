/**
 * Client for the SIH trajectory-model backend (oil-spill-hackathon / src/server.py).
 *
 * Point VITE_API_URL at the FastAPI server, e.g.:
 *   VITE_API_URL=http://localhost:8000 npm run dev
 */
const API_BASE = (import.meta.env?.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '')

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new Error(
      `Cannot reach the model API at ${API_BASE}. ` +
        'Start it from oil-spill-hackathon with: `uvicorn src.server:app --port 8000`.',
    )
  }

  let body = null
  try { body = await res.json() } catch { /* non-JSON error body */ }

  if (!res.ok) {
    const detail = body?.detail
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail ?? body) || `HTTP ${res.status}`)
  }
  return body
}

export const apiBase = API_BASE

/** GET /health -> { status, opendrift_available, note } */
export function checkHealth() {
  return request('/health')
}

/** POST /forecast -> { success, mode, generated_at, geojson, ais_areas } */
export function runForecast(params) {
  return request('/forecast', { method: 'POST', body: JSON.stringify(params) })
}

/** POST /hindcast -> { success, mode, generated_at, geojson, ais_areas } */
export function runHindcast(params) {
  return request('/hindcast', { method: 'POST', body: JSON.stringify(params) })
}
