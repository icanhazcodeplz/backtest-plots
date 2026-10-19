// Helpers for reading and checking the backend payload. The full schema is
// documented in README.md. Pure (no DOM), so it runs under Node in tests and
// in scripts/validate.mjs.

import { createTimeIndex } from './time.js'

// Payload fields that each get their own pane below the main chart, in order.
export const SUB_PANE_FIELDS = ['TickChart2Lines', 'TickChart3Lines']

export const LINE_STYLE_NAMES = ['solid', 'dotted', 'dashed', 'large_dashed', 'sparse_dotted']

/** True if at least one tick has a value for at least one of the lines' keys. */
export function hasLineData(lines, ticks) {
  if (!lines?.length || !ticks) return false
  return lines.some(line => ticks.some(tick => tick[line.key] != null))
}

/**
 * The sub-panes to draw, in order. A sub-pane is skipped when none of its
 * lines has data, so an empty `TickChart2Lines` doesn't leave a blank pane.
 */
export function getSubPanes(data) {
  return SUB_PANE_FIELDS
    .map(field => ({ field, lines: data?.[field] }))
    .filter(pane => hasLineData(pane.lines, data?.ticks))
}

/**
 * Returns a list of human-readable problems with the payload; empty means
 * valid. Anything listed here is skipped (not drawn) by the chart.
 */
export function validatePayload(data) {
  if (data === null || typeof data !== 'object') return ['payload must be a JSON object']
  if (!Array.isArray(data.ticks)) return ['`ticks` must be an array']

  const problems = []
  const index = createTimeIndex(data.ticks)

  data.ticks.forEach((tick, i) => {
    if (typeof tick.time !== 'string' || !/^\d+$/.test(tick.time)) {
      problems.push(`ticks[${i}].time must be a nanosecond timestamp string, got ${JSON.stringify(tick.time)}`)
    }
    // `price` may be omitted, e.g. on fill-only ticks; the price line skips them.
    if (tick.price != null && typeof tick.price !== 'number') {
      problems.push(`ticks[${i}].price must be a number, got ${JSON.stringify(tick.price)}`)
    }
  })

  const checkTime = (field, i, key, value) => {
    if (index.indexOf(value) === undefined) {
      problems.push(`${field}[${i}].${key} ${JSON.stringify(value)} does not match any tick time`)
    }
  }

  data.fill_markers?.forEach((m, i) => checkTime('fill_markers', i, 'time', m.time))

  for (const field of ['orderDurations', 'HorizLines']) {
    data[field]?.forEach((item, i) => {
      checkTime(field, i, 'start_time', item.start_time)
      checkTime(field, i, 'end_time', item.end_time)
    })
  }

  data.HorizLines?.forEach((line, i) => {
    if (line.line_style != null && !LINE_STYLE_NAMES.includes(line.line_style)) {
      problems.push(`HorizLines[${i}].line_style ${JSON.stringify(line.line_style)} is not one of ${LINE_STYLE_NAMES.join(', ')}`)
    }
  })

  // VertLines snap to the nearest tick, so only the format matters.
  data.VertLines?.forEach((line, i) => {
    if (index.nearestIndexOf(line.time) === undefined) {
      problems.push(`VertLines[${i}].time must be a nanosecond timestamp string, got ${JSON.stringify(line.time)}`)
    }
  })

  for (const field of ['TickChartLines', ...SUB_PANE_FIELDS]) {
    data[field]?.forEach((line, i) => {
      if (typeof line.key !== 'string') problems.push(`${field}[${i}].key must be a string`)
    })
  }

  return problems
}
