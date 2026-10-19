// Creates one lightweight-charts instance per pane. Each stacked pane is its
// own chart (rather than a lightweight-charts pane within one chart) so it can
// carry its own React-rendered legend; sync.js keeps them moving together.

import { createOptionsChart, createTextWatermark, CrosshairMode } from 'lightweight-charts'
import { THEME } from './theme.js'

/**
 * @param container     DOM element to render into; the chart fills it and
 *                      follows its size.
 * @param timeFormatter maps a chart index to an axis label.
 * @param showTimeAxis  only the bottom pane shows the shared time axis.
 * @param watermark     optional text drawn faintly in the top-left corner.
 */
export function createPaneChart(container, { timeFormatter, showTimeAxis, watermark }) {
  // createOptionsChart (not createChart) because the horizontal scale is a
  // plain number (the tick index), not a calendar time.
  const chart = createOptionsChart(container, {
    autoSize: true,
    layout: { background: { color: THEME.background }, textColor: THEME.text },
    rightPriceScale: { minimumWidth: THEME.priceAxisWidth },
    grid: {
      vertLines: { color: THEME.grid },
      horzLines: { color: THEME.grid },
    },
    localization: { timeFormatter },
    // Normal (not Magnet): the horizontal crosshair line follows the mouse
    // instead of snapping to the nearest series value.
    crosshair: { mode: CrosshairMode.Normal },
    timeScale: { minBarSpacing: 0.0001, visible: showTimeAxis },
  })

  if (watermark) {
    createTextWatermark(chart.panes()[0], {
      horzAlign: 'left',
      vertAlign: 'top',
      lines: [{ text: watermark, color: THEME.watermark.color, fontSize: THEME.watermark.fontSize, fontStyle: 'bold' }],
    })
  }

  return chart
}
