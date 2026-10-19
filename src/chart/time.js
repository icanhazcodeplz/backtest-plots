// Tick timestamps arrive as nanosecond Unix times in decimal strings
// (e.g. "1770121507372223001"). They are irregularly spaced, which
// lightweight-charts renders with gaps, so the chart plots each tick at its
// array index instead and uses a time index to translate between the two.
//
// This module is pure (no DOM, no lightweight-charts) so it can be unit tested
// under plain Node.

const NANOS_PER_SECOND_DIGITS = 9

/**
 * Formats a nanosecond timestamp string as `HH:MM:SS.nnnnnnnnn` in the
 * viewer's local timezone. Returns null for non-string input.
 */
export function formatNanoTime(time) {
  if (typeof time !== 'string') return null
  // Split the string rather than parsing the whole value: nanosecond epochs
  // exceed Number.MAX_SAFE_INTEGER, so parsing them as a number would round.
  const seconds = Number(time.slice(0, -NANOS_PER_SECOND_DIGITS) || 0)
  const nanos = time.slice(-NANOS_PER_SECOND_DIGITS).padStart(NANOS_PER_SECOND_DIGITS, '0')
  const date = new Date(seconds * 1000)
  const pad = n => n.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${nanos}`
}

function toBigInt(time) {
  try {
    return typeof time === 'string' ? BigInt(time) : null
  } catch {
    return null
  }
}

/**
 * Builds lookups between nanosecond timestamps and chart indexes for an
 * ordered list of ticks.
 *
 *   indexOf(time)        exact match, or undefined
 *   nearestIndexOf(time) closest tick by time, or undefined for bad input
 *   format(index)        axis label for a chart index
 */
export function createTimeIndex(ticks) {
  const times = ticks.map(tick => tick.time)
  const exact = new Map(times.map((time, index) => [time, index]))
  const labels = times.map(formatNanoTime)
  let sorted = null // BigInt copies of `times`, built on first nearestIndexOf call

  function nearestIndexOf(time) {
    const target = toBigInt(time)
    if (target === null || times.length === 0) return undefined
    sorted ??= times.map(t => toBigInt(t) ?? 0n)

    // Binary search for the first tick at or after `target`.
    let lo = 0
    let hi = sorted.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (sorted[mid] < target) lo = mid + 1
      else hi = mid
    }
    if (lo > 0 && target - sorted[lo - 1] <= sorted[lo] - target) return lo - 1
    return lo
  }

  return {
    indexOf: time => exact.get(time),
    nearestIndexOf,
    format: index => labels[index],
  }
}
