// Fetch the backtest API response from the local backend and save it to disk.
//
// Usage:
//   node scripts/fetch_data.mjs                 # saves to data/api_dumps/api_data.json
//   node scripts/fetch_data.mjs <output.json>   # custom output path
//   node scripts/fetch_data.mjs <url> <output>  # custom url + output

import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const looksLikeUrl = args[0]?.startsWith('http')
const url = looksLikeUrl ? args[0] : 'http://127.0.0.1:5001/api/data'
const outArg = looksLikeUrl ? args[1] : args[0]
const outPath = path.resolve(repoRoot, outArg ?? 'data/api_dumps/api_data.json')

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
