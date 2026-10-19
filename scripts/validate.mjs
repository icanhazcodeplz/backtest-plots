// Check a payload JSON file against the schema in README.md and list anything
// the chart would skip. Exits 1 if there are problems.
//
// Usage:
//   node scripts/validate.mjs                # data/api_dumps/api_data.json
//   node scripts/validate.mjs <data.json>

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validatePayload } from '../src/chart/payload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const dataPath = path.resolve(repoRoot, process.argv[2] ?? 'data/api_dumps/api_data.json')
const problems = validatePayload(JSON.parse(await readFile(dataPath, 'utf8')))
const name = path.relative(repoRoot, dataPath)

if (problems.length === 0) {
  console.log(`${name}: OK`)
} else {
  console.error(`${name}: ${problems.length} problem(s)`)
  problems.forEach(problem => console.error(`  - ${problem}`))
  process.exit(1)
}
