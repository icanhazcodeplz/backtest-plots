// The backend's API root. Override at dev/build time with
//   VITE_API_BASE=http://host:port/api npm run dev
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:5001/api'

// Names of the runs the backend can serve, e.g. "20260105-0929_20260105-0941"
export const RUNS_URL = `${API_BASE}/runs`

export const runDataUrl = run => `${API_BASE}/data/${encodeURIComponent(run)}`
