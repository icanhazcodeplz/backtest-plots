import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const script = path.join(repoRoot, 'scripts/snapshot.mjs')
const dataPath = path.join(repoRoot, 'tests/data/api_data.json')
const expectedPath = path.join(repoRoot, 'tests/snapshots/expected.html')

test('snapshot of tests/data/api_data.json matches expected.html', { timeout: 60_000 }, async (t) => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'snapshot-'))
  t.after(() => rm(tmp, { recursive: true, force: true }))

  const actualPath = path.join(tmp, 'actual.html')
  const result = spawnSync('node', [script, dataPath, actualPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `snapshot.mjs failed (status=${result.status}):\nstdout: ${result.stdout}\nstderr: ${result.stderr}`)

  const [actual, expected] = await Promise.all([
    readFile(actualPath, 'utf8'),
    readFile(expectedPath, 'utf8'),
  ])
  // Compare by hand: assert.equal would print the whole ~500 KB bundle.
  if (actual !== expected) {
    const at = firstDifference(actual, expected)
    assert.fail(
      `snapshot HTML differs from tests/snapshots/expected.html at character ${at}:\n` +
        `  expected: ${JSON.stringify(expected.slice(at, at + 120))}\n` +
        `  actual:   ${JSON.stringify(actual.slice(at, at + 120))}\n` +
        'If this change is intentional, regenerate the baseline with `npm run snapshot:update`.',
    )
  }
})

function firstDifference(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}
