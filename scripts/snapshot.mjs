// Build a self-contained HTML snapshot of the React app with fixture data
// inlined as `window.__BACKTEST_DATA__`. Open the output file directly in a
// browser; no backend or dev server required.
//
// Usage:
//   node scripts/snapshot.mjs                                  # uses tests/data/api_data.json
//   node scripts/snapshot.mjs <data.json> <output.html>        # custom paths

import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const dataPath = path.resolve(repoRoot, process.argv[2] ?? 'data/api_dumps/api_data.json')
const outPath = path.resolve(repoRoot, process.argv[3] ?? 'data/snapshots/snapshot.html')

const dataJson = await readFile(dataPath, 'utf8')
JSON.parse(dataJson) // validate

const result = await build({
  root: repoRoot,
  plugins: [react()],
  logLevel: 'warn',
  build: {
    write: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: { codeSplitting: false },
    },
  },
})

const output = (Array.isArray(result) ? result[0] : result).output

const files = new Map()
let htmlAsset = null
for (const item of output) {
  if (item.fileName.endsWith('.html')) {
    htmlAsset = item
    continue
  }
  if (item.type === 'chunk') {
    files.set(item.fileName, item.code)
  } else {
    const src = typeof item.source === 'string'
      ? item.source
      : Buffer.from(item.source).toString('utf8')
    files.set(item.fileName, src)
  }
}
if (!htmlAsset) throw new Error('Vite build produced no HTML output')

let html = typeof htmlAsset.source === 'string'
  ? htmlAsset.source
  : Buffer.from(htmlAsset.source).toString('utf8')

// Inline <script type="module" src="..."></script>
html = html.replace(
  /<script\b([^>]*)\bsrc="([^"]+)"([^>]*)><\/script>/g,
  (match, _pre, src) => {
    const fname = src.replace(/^\/+/, '')
    if (!files.has(fname)) return match
    return `<script type="module">${files.get(fname)}</script>`
  },
)

// Inline <link rel="stylesheet" href="...">
html = html.replace(/<link\b[^>]*\/?>/g, (match) => {
  if (!/rel=["']stylesheet["']/.test(match)) return match
  const m = match.match(/href=["']([^"']+)["']/)
  if (!m) return match
  const fname = m[1].replace(/^\/+/, '')
  if (!files.has(fname)) return match
  return `<style>${files.get(fname)}</style>`
})

// Drop modulepreload hints — dynamic imports are inlined, so the referenced
// files don't exist in the single-file output.
html = html.replace(/<link\b[^>]*\brel=["']modulepreload["'][^>]*\/?>\s*/g, '')

const safeData = dataJson.replace(/<\/script>/gi, '<\\/script>')
const inject = `<script>window.__BACKTEST_DATA__ = ${safeData};</script>`
html = html.replace('</head>', `${inject}\n</head>`)

await mkdir(path.dirname(outPath), { recursive: true })
await writeFile(outPath, html)

const kb = (html.length / 1024).toFixed(1)
console.log(`Wrote ${path.relative(repoRoot, outPath)} (${kb} KB)`)
