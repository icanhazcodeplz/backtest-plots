// Keeps stacked pane charts scrolling, zooming, and showing the crosshair
// together. Each handler sets `syncing` while it updates the other charts so
// those updates don't fire their own handlers and loop forever.

export function syncTimeScales(charts) {
  if (charts.length < 2) return
  let syncing = false
  charts.forEach((chart, i) => {
    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (syncing || !range) return
      syncing = true
      charts.forEach((other, j) => { if (j !== i) other.timeScale().setVisibleLogicalRange(range) })
      syncing = false
    })
  })
}

/**
 * `anchorSeries[i]` is any series on `charts[i]`; lightweight-charts needs one
 * to position a programmatic crosshair.
 */
export function syncCrosshairs(charts, anchorSeries) {
  if (charts.length < 2) return
  let syncing = false
  charts.forEach((chart, i) => {
    chart.subscribeCrosshairMove(param => {
      if (syncing) return
      syncing = true
      charts.forEach((other, j) => {
        if (j === i) return
        if (param.time !== undefined) {
          other.setCrosshairPosition(0, param.time, anchorSeries[j])
        } else {
          other.clearCrosshairPosition()
        }
      })
      syncing = false
    })
  })
}
