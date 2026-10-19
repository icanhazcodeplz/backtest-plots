// Entry point for drawing a payload: creates the pane charts, draws every
// overlay, and links the panes together. Called by components/Chart.jsx.

import { createTimeIndex } from './time.js'
import { createPaneChart } from './panes.js'
import { addIndicatorSeries } from './series.js'
import { syncCrosshairs, syncTimeScales } from './sync.js'
import {
  drawFills,
  drawHorizLines,
  drawIndicators,
  drawOrderDurations,
  drawPrice,
  drawVertLines,
} from './overlays.js'

/**
 * @param mainContainer DOM element for the price pane.
 * @param subPanes      `[{ container, lines }]`, top to bottom; see getSubPanes.
 * @param data          the backend payload.
 * @returns a cleanup function that destroys every chart.
 */
export function buildChart({ mainContainer, subPanes, data }) {
  const timeIndex = createTimeIndex(data.ticks)

  const chart = createPaneChart(mainContainer, {
    timeFormatter: timeIndex.format,
    showTimeAxis: subPanes.length === 0,
    watermark: data.title,
  })

  // Series are drawn in call order, so later overlays sit on top.
  const ctx = { chart, data, timeIndex }
  ctx.priceSeries = drawPrice(ctx)
  drawFills(ctx)
  drawIndicators(ctx)
  drawOrderDurations(ctx)
  drawHorizLines(ctx)
  drawVertLines(ctx)

  const subCharts = subPanes.map(({ container, lines }, i) => {
    const subChart = createPaneChart(container, {
      timeFormatter: timeIndex.format,
      showTimeAxis: i === subPanes.length - 1,
      watermark: lines.map(line => line.key).join(', '),
    })
    const series = lines.map(config => addIndicatorSeries(subChart, data.ticks, config, { signColored: true }))
    return { chart: subChart, anchorSeries: series[0] }
  })

  const charts = [chart, ...subCharts.map(sub => sub.chart)]
  syncTimeScales(charts)
  syncCrosshairs(charts, [ctx.priceSeries, ...subCharts.map(sub => sub.anchorSeries)])
  charts.forEach(c => c.timeScale().fitContent())

  return () => charts.forEach(c => c.remove())
}
