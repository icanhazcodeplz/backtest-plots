// Fetch the backtest API response from the local backend and save it to disk.
//
// Usage:
//   node scripts/fetch_data.mjs                 # first run the backend lists -> data/api_dumps/api_data.json
//   node scripts/fetch_data.mjs <output.json>   # custom output path
//   node scripts/fetch_data.mjs <url> <output>  # custom url (e.g. http://127.0.0.1:5001/api/data/<run>) + output
//
// The API root can also be set with the VITE_API_BASE env var, as for the app.

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const looksLikeUrl = args[0]?.startsWith('http')
const apiBase = process.env.VITE_API_BASE ?? 'http://127.0.0.1:5001/api'
const url = looksLikeUrl ? args[0] : await firstRunUrl()
const outArg = looksLikeUrl ? args[1] : args[0]
const outPath = path.resolve(repoRoot, outArg ?? 'data/api_dumps/api_data.json')

async function firstRunUrl() {
  const res = await fetch(`${apiBase}/runs`)
  if (!res.ok) {
    console.error(`fetch ${apiBase}/runs failed: ${res.status} ${res.statusText}`)
    process.exit(1)
  }
  const [run] = await res.json()
  if (!run) {
    console.error(`${apiBase}/runs lists no runs`)
    process.exit(1)
  }
  return `${apiBase}/data/${encodeURIComponent(run)}`
}

const res = await fetch(url)
if (!res.ok) {
  console.error(`fetch ${url} failed: ${res.status} ${res.statusText}`)
  process.exit(1)
}

const body = await res.text()
JSON.parse(body) // validate

await mkdir(path.dirname(outPath), { recursive: true })
await writeFile(outPath, body)

const kb = (body.length / 1024).toFixed(1)
console.log(`Wrote ${path.relative(repoRoot, outPath)} (${kb} KB)`)
