// Thin wrappers around `chart.addSeries(LineSeries, ...)` for the three kinds
// of line this app draws. All `time` values are chart indexes (see time.js).

import { LineSeries, LineStyle, LineType } from 'lightweight-charts'

// Hide the price-axis badge and dashed price line that lightweight-charts
// adds for each series' last value; with dozens of series they're just noise.
const QUIET = { lastValueVisible: false, priceLineVisible: false }

const LINE_STYLES = {
  solid: LineStyle.Solid,
  dotted: LineStyle.Dotted,
  dashed: LineStyle.Dashed,
  large_dashed: LineStyle.LargeDashed,
  sparse_dotted: LineStyle.SparseDotted,
}

export function lineStyleFromName(name) {
  return LINE_STYLES[name] ?? LineStyle.Solid
}

/** Adds a series with this app's defaults; `options` are passed through. */
export function addLineSeries(chart, options) {
  return chart.addSeries(LineSeries, { pointMarkersVisible: false, ...options, ...QUIET })
}

/**
 * Plots `tick[config.key]` for every tick. With `signColored`, each point is
 * colored `config.color` when >= 0 and `config.color_negative` when < 0.
 */
export function addIndicatorSeries(chart, ticks, config, { signColored = false } = {}) {
  const series = addLineSeries(chart, {
    color: config.color,
    lineWidth: config.width,
    lineType: config.type,
  })
  series.setData(ticks.map((tick, index) => {
    const value = tick[config.key]
    return signColored
      ? { time: index, value, color: value >= 0 ? config.color : config.color_negative }
      : { time: index, value }
  }))
  return series
}

/**
 * Draws a horizontal segment at `price` from chart index `from` to `to`.
 * lightweight-charts has no segment primitive, so each segment is its own
 * two-point series.
 */
export function addSegment(chart, from, to, price, options) {
  const series = addLineSeries(chart, { lineType: LineType.Simple, ...options })
  const value = parseFloat(price)
  series.setData([{ time: from, value }, { time: to, value }])
  return series
}
