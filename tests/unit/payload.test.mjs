import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getSubPanes, hasLineData, validatePayload } from '../../src/chart/payload.js'

const fixture = JSON.parse(await readFile(new URL('../data/api_data.json', import.meta.url), 'utf8'))

const T1 = '1000000000000000100'
const T2 = '1000000000000000200'

function payload(extra = {}) {
  return {
    ticks: [{ time: T1, price: 100, pnl: 1 }, { time: T2, price: 101 }],
    ...extra,
  }
}

test('hasLineData is true only when some tick has a configured key', () => {
  const { ticks } = payload()
  assert.equal(hasLineData([{ key: 'pnl' }], ticks), true)
  assert.equal(hasLineData([{ key: 'missing' }], ticks), false)
  assert.equal(hasLineData([], ticks), false)
  assert.equal(hasLineData(undefined, ticks), false)
})

test('getSubPanes skips sub-panes whose lines have no data', () => {
  const data = payload({
    TickChart2Lines: [{ key: 'missing' }],
    TickChart3Lines: [{ key: 'pnl' }],
  })
  assert.deepEqual(getSubPanes(data).map(pane => pane.field), ['TickChart3Lines'])
  assert.deepEqual(getSubPanes(null), [])
})

test('the test fixture is a valid payload', () => {
  assert.deepEqual(validatePayload(fixture), [])
})

test('the test fixture exercises every drawable field', () => {
  for (const field of ['fill_markers', 'TickChartLines', 'orderDurations', 'HorizLines', 'VertLines']) {
    assert.ok(fixture[field]?.length > 0, `fixture has no ${field}`)
  }
  assert.equal(getSubPanes(fixture).length, 2, 'fixture should render both sub-panes')
})

test('validatePayload rejects non-objects and missing ticks', () => {
  assert.deepEqual(validatePayload(null), ['payload must be a JSON object'])
  assert.deepEqual(validatePayload({}), ['`ticks` must be an array'])
})

test('validatePayload reports malformed ticks', () => {
  const problems = validatePayload({ ticks: [{ time: 123, price: '1' }] })
  assert.equal(problems.length, 2)
  assert.match(problems[0], /ticks\[0\]\.time/)
  assert.match(problems[1], /ticks\[0\]\.price/)
})

test('validatePayload reports timestamps that match no tick', () => {
  const problems = validatePayload(payload({
    fill_markers: [{ time: T1 }, { time: '999' }],
    orderDurations: [{ start_time: T1, end_time: '999' }],
    HorizLines: [{ start_time: '999', end_time: T2, price: 1 }],
  }))
  assert.deepEqual(problems, [
    'fill_markers[1].time "999" does not match any tick time',
    'orderDurations[0].end_time "999" does not match any tick time',
    'HorizLines[0].start_time "999" does not match any tick time',
  ])
})

test('validatePayload allows VertLines between ticks but not malformed ones', () => {
  const problems = validatePayload(payload({
    VertLines: [{ time: '1000000000000000150' }, { time: 'noon' }],
  }))
  assert.deepEqual(problems, ['VertLines[1].time must be a nanosecond timestamp string, got "noon"'])
})

test('validatePayload reports unknown HorizLine styles', () => {
  const problems = validatePayload(payload({
    HorizLines: [{ start_time: T1, end_time: T2, price: 1, line_style: 'wavy' }],
  }))
  assert.equal(problems.length, 1)
  assert.match(problems[0], /line_style "wavy"/)
})
