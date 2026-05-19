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
  assert.equal(
    actual,
    expected,
    'snapshot HTML does not match tests/snapshots/expected.html. ' +
      'If this change is intentional, regenerate the baseline:\n' +
      '  node scripts/snapshot.mjs tests/data/api_data.json tests/snapshots/expected.html',
  )
})
