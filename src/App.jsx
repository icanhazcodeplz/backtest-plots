import { useEffect, useState } from 'react'
import Chart from './components/Chart.jsx'
import { RUNS_URL, runDataUrl } from './config.js'
import { validatePayload } from './chart/payload.js'

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} responded ${response.status} ${response.statusText}`)
  return response.json()
}

// The selected run lives in the URL (?run=...), so a reload or a shared link shows the same run.
function runFromUrl() {
  return new URLSearchParams(window.location.search).get('run')
}

function setRunInUrl(run) {
  const url = new URL(window.location.href)
  url.searchParams.set('run', run)
  window.history.replaceState(null, '', url)
}

function App() {
  // Snapshot builds (scripts/snapshot.mjs) inline one payload as window.__BACKTEST_DATA__; there
  // is no backend to list runs from.
  if (window.__BACKTEST_DATA__) return <Chart data={window.__BACKTEST_DATA__} />
  return <RunViewer />
}

function RunViewer() {
  const [runs, setRuns] = useState(null)
  const [run, setRun] = useState(null)
  const [runsError, setRunsError] = useState(null)
  // What came back for a run, kept with the run's name: while another run loads, it is stale
  const [loaded, setLoaded] = useState({ run: null, data: null, error: null })
  const data = loaded.run === run ? loaded.data : null
  const error = runsError ?? (loaded.run === run ? loaded.error : null)

  const selectRun = name => {
    setRunInUrl(name)
    setRun(name)
  }

  useEffect(() => {
    fetchJson(RUNS_URL)
      .then(names => {
        setRuns(names)
        const fromUrl = runFromUrl()
        const first = names.includes(fromUrl) ? fromUrl : names[0]
        if (first) selectRun(first)
      })
      .catch(err => setRunsError(`Could not load ${RUNS_URL}: ${err.message}. Is the backend running?`))
  }, [])

  useEffect(() => {
    if (!run) return
    fetchJson(runDataUrl(run))
      .then(payload => {
        const problems = validatePayload(payload)
        if (problems.length) console.warn(`Backtest payload has ${problems.length} problem(s):\n${problems.join('\n')}`)
        setLoaded({ run, data: payload, error: null })
      })
      .catch(err => setLoaded({ run, data: null, error: `Could not load ${run}: ${err.message}` }))
  }, [run])

  let body
  if (error) body = <p className="status">{error}</p>
  else if (runs && runs.length === 0) body = <p className="status">No runs in the backend's RUNS_FOLDER.</p>
  else if (!data) body = <p className="status">Loading data...</p>
  else body = <Chart data={data} />

  return (
    <>
      {runs && runs.length > 0 && (
        <header className="run-bar">
          <label>
            Run{' '}
            <select value={run ?? ''} onChange={e => selectRun(e.target.value)}>
              {runs.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </header>
      )}
      <main className="chart-area">{body}</main>
    </>
  )
}

export default App
