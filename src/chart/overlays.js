// One function per payload field drawn on the main pane. To support a new
// field: add a function here, call it from buildChart.js, document the field
// in README.md, and add a check to validatePayload in payload.js.
//
// Every function takes `ctx = { chart, data, timeIndex, priceSeries }`.
// Items whose timestamps don't match a tick are skipped; validatePayload
// reports them.

import { createSeriesMarkers, LineType } from 'lightweight-charts'
import { THEME } from './theme.js'
import { addIndicatorSeries, addLineSeries, addSegment, lineStyleFromName } from './series.js'
import { VertLine } from '../plugins/vertical-line.js'
import { HorizLineLabel } from '../plugins/horizontal-line-label.js'

/** `ticks[].price` as a stepped white line. Returned series anchors other overlays. */
export function drawPrice({ chart, data }) {
  const series = addLineSeries(chart, {
    color: THEME.price.color,
    lineWidth: THEME.price.lineWidth,
    lineType: LineType.WithSteps,
    pointMarkersVisible: true,
    pointMarkersRadius: THEME.price.markerRadius,
    priceFormat: { precision: 4, minMove: 0.0001 },
  })
  series.setData(data.ticks.map((tick, index) => ({ time: index, value: tick.price })))
  return series
}

/**
 * `ticks[].fill` as dots (the line itself has zero width), with
 * `fill_markers` attached to those dots.
 */
export function drawFills({ chart, data, timeIndex }) {
  const series = addLineSeries(chart, {
    color: THEME.fills.color,
    lineWidth: 0,
    lineType: LineType.WithSteps,
    pointMarkersVisible: true,
    pointMarkersRadius: THEME.fills.markerRadius,
  })
  series.setData(data.ticks.map((tick, index) => ({ time: index, value: tick.fill })))

  const markers = (data.fill_markers ?? [])
    .map(marker => ({ ...marker, time: timeIndex.indexOf(marker.time) }))
    .filter(marker => marker.time !== undefined)
  createSeriesMarkers(series, markers)
}

/** `TickChartLines`: indicator lines overlaid on the price. */
export function drawIndicators({ chart, data }) {
  data.TickChartLines?.forEach(config => addIndicatorSeries(chart, data.ticks, config))
}

/** `orderDurations`: one horizontal segment per open order, colored by side. */
export function drawOrderDurations({ chart, data, timeIndex }) {
  data.orderDurations?.forEach(order => {
    const from = timeIndex.indexOf(order.start_time)
    const to = timeIndex.indexOf(order.end_time)
    if (from === undefined || to === undefined) return
    addSegment(chart, from, to, order.price, {
      color: order.side === 'buy' ? THEME.orders.buy : THEME.orders.sell,
      lineWidth: THEME.orders.lineWidth,
    })
  })
}

/** `HorizLines`: styled horizontal segments with an optional text label. */
export function drawHorizLines({ chart, data, timeIndex }) {
  data.HorizLines?.forEach(line => {
    const from = timeIndex.indexOf(line.start_time)
    const to = timeIndex.indexOf(line.end_time)
    if (from === undefined || to === undefined) return
    const color = line.color ?? THEME.horizLine.color
    const series = addSegment(chart, from, to, line.price, {
      color: withAlpha(color, line.opacity),
      lineWidth: line.thickness ?? THEME.horizLine.lineWidth,
      lineStyle: lineStyleFromName(line.line_style),
    })
    if (line.annotation != null) {
      // The label stays fully opaque even when the line is translucent.
      series.attachPrimitive(new HorizLineLabel(chart, series, to, parseFloat(line.price), {
        text: line.annotation,
        color,
      }))
    }
  })
}

/** `VertLines`: full-height vertical lines, snapped to the nearest tick. */
export function drawVertLines({ chart, data, timeIndex, priceSeries }) {
  data.VertLines?.forEach(line => {
    const index = timeIndex.nearestIndexOf(line.time)
    if (index === undefined) return
    const color = line.color ?? THEME.vertLine.color
    priceSeries.attachPrimitive(new VertLine(chart, priceSeries, index, {
      color,
      width: line.thickness ?? THEME.vertLine.lineWidth,
      showLabel: line.annotation != null,
      labelText: line.annotation ?? '',
      labelBackgroundColor: color,
      labelTextColor: THEME.vertLine.labelTextColor,
    }))
  })
}

// Resolves any CSS color (including named colors like "orange") to rgba()
// with the given alpha. A canvas normalizes whatever it's given to
// "#rrggbb", or "rgba(r, g, b, a)" for colors that already have alpha.
function withAlpha(color, alpha) {
  if (alpha == null) return color
  const ctx = document.createElement('canvas').getContext('2d')
  ctx.fillStyle = color
  const normalized = ctx.fillStyle
  const [r, g, b] = normalized.startsWith('#')
    ? [1, 3, 5].map(i => parseInt(normalized.slice(i, i + 2), 16))
    : normalized.match(/\d+/g).map(Number)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
