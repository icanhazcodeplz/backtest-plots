import { useEffect, useState } from 'react'
import Chart from './components/Chart.jsx'
import { API_URL } from './config.js'
import { validatePayload } from './chart/payload.js'

// Snapshot builds (scripts/snapshot.mjs) inline the payload as
// window.__BACKTEST_DATA__; otherwise fetch it from the backend.
async function loadBacktestData() {
  if (window.__BACKTEST_DATA__) return window.__BACKTEST_DATA__
  const response = await fetch(API_URL)
  if (!response.ok) throw new Error(`${API_URL} responded ${response.status} ${response.statusText}`)
  return response.json()
}

function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBacktestData()
      .then(payload => {
        const problems = validatePayload(payload)
        if (problems.length) console.warn(`Backtest payload has ${problems.length} problem(s):\n${problems.join('\n')}`)
        setData(payload)
      })
      .catch(err => setError(`Could not load ${API_URL}: ${err.message}. Is the backend running?`))
  }, [])

  if (error) return <p className="status">{error}</p>
  if (!data) return <p className="status">Loading data...</p>
  return <Chart data={data} />
}

export default App
