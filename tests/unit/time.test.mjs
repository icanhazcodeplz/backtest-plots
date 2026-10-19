import { test } from 'node:test'
import assert from 'node:assert/strict'

// formatNanoTime uses the local timezone; pin it so results are stable.
process.env.TZ = 'UTC'
const { createTimeIndex, formatNanoTime } = await import('../../src/chart/time.js')

test('formatNanoTime keeps all nine nanosecond digits', () => {
  assert.equal(formatNanoTime('1770121507372223001'), '12:25:07.372223001')
})

test('formatNanoTime does not round up near a second boundary', () => {
  // As a Number this value rounds to ...508000000000, which would show :08.
  assert.equal(formatNanoTime('1770121507999999999'), '12:25:07.999999999')
})

test('formatNanoTime returns null for non-strings', () => {
  assert.equal(formatNanoTime(undefined), null)
  assert.equal(formatNanoTime(1770121507372223001n), null)
})

const ticks = ['1000000000000000100', '1000000000000000200', '1000000000000000400'].map(time => ({ time }))

test('indexOf maps exact timestamps to array indexes', () => {
  const index = createTimeIndex(ticks)
  assert.equal(index.indexOf('1000000000000000200'), 1)
  assert.equal(index.indexOf('1000000000000000201'), undefined)
})

test('nearestIndexOf snaps to the closest tick', () => {
  const index = createTimeIndex(ticks)
  assert.equal(index.nearestIndexOf('1000000000000000000'), 0, 'before first tick')
  assert.equal(index.nearestIndexOf('1000000000000000149'), 0)
  assert.equal(index.nearestIndexOf('1000000000000000151'), 1)
  assert.equal(index.nearestIndexOf('1000000000000000150'), 0, 'ties go to the earlier tick')
  assert.equal(index.nearestIndexOf('1000000000000000400'), 2, 'exact match')
  assert.equal(index.nearestIndexOf('9000000000000000000'), 2, 'after last tick')
})

test('nearestIndexOf rejects malformed input', () => {
  const index = createTimeIndex(ticks)
  assert.equal(index.nearestIndexOf('not a time'), undefined)
  assert.equal(index.nearestIndexOf(123), undefined)
  assert.equal(createTimeIndex([]).nearestIndexOf('1000'), undefined)
})

test('format maps chart indexes back to axis labels', () => {
  const index = createTimeIndex([{ time: '1770121507372223001' }])
  assert.equal(index.format(0), '12:25:07.372223001')
})
