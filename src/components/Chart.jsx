import {useEffect, useRef} from 'react'
import {createOptionsChart, createSeriesMarkers, createTextWatermark, LineSeries} from 'lightweight-charts'
import {VertLine} from '../plugins/vertical-line'

const COMMON_SERIES_OPTIONS = { lastValueVisible: false, priceLineVisible: false }

function hasChartData(lines, ticks) {
  if (!lines?.length || !ticks) return false
  return lines.some(p => ticks.some(item => item[p.key] != null))
}

function buildChartOptions(container, timeFormatter, isMain) {
  return {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { color: '#050505' },
      textColor: '#C3BCDB',
      ...(isMain && {
        panes: {
          separatorColor: '#C3BCDB',
          separatorHoverColor: 'rgba(255, 0, 0, 0.1)',
          enableResize: true,
        },
      }),
    },
    rightPriceScale: { minimumWidth: 90 },
    grid: {
      vertLines: { color: '#444' },
      horzLines: { color: '#444' },
    },
    localization: { timeFormatter },
    timeScale: { minBarSpacing: 0.0001, visible: !isMain },
  }
}

function addWatermark(chart, text) {
  createTextWatermark(chart.panes()[0], {
    horzAlign: 'left',
    vertAlign: 'top',
    lines: [{ text, color: 'rgba(195, 188, 219, 0.25)', fontSize: 48, fontStyle: 'bold' }],
  })
}

function formatTimeFromNano(time) {
  if (typeof time !== 'string') return null
  const nanos = time.slice(-9)
  // 3600 * 0 offset can be adjusted for timezone; 0 = EST
  const date = new Date(parseInt(time) / 1000000 + 3600 * 0)
  const pad = (n) => n.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${nanos}`
}

function addLineSeries(chart, ticks, params, perPointColor = false) {
  const s = chart.addSeries(LineSeries, {
    color: params.color,
    lineWidth: params.width,
    lineType: params.type,
    pointMarkersVisible: false,
    ...COMMON_SERIES_OPTIONS,
  })
  s.setData(ticks.map((item, index) => {
    const value = item[params.key]
    return perPointColor
      ? { time: index, value, color: value >= 0 ? params.color : params.color_negative }
      : { time: index, value }
  }))
  return s
}

function syncTimeScales(charts) {
  let syncing = false
  charts.forEach((chart, i) => {
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (syncing || !range) return
      syncing = true
      charts.forEach((other, j) => { if (j !== i) other.timeScale().setVisibleLogicalRange(range) })
      syncing = false
    })
  })
}

function syncCrosshairs(charts, seriesRefs) {
  let syncing = false
  charts.forEach((chart, i) => {
    chart.subscribeCrosshairMove((param) => {
      if (syncing) return
      syncing = true
      charts.forEach((other, j) => {
        if (j === i) return
        if (param.time !== undefined) {
          other.setCrosshairPosition(0, param.time, seriesRefs[j])
        } else {
          other.clearCrosshairPosition()
        }
      })
      syncing = false
    })
  })
}

function Chart({ data }) {
  const mainContainerRef = useRef(null)
  const sub1ContainerRef = useRef(null)
  const sub2ContainerRef = useRef(null)

  useEffect(() => {
    if (!mainContainerRef.current || !data) return

    const subSpecs = [
      { containerRef: sub1ContainerRef, lines: data.TickChart2Lines },
      { containerRef: sub2ContainerRef, lines: data.TickChart3Lines },
    ].filter(spec => hasChartData(spec.lines, data.ticks))

    const indexToFormattedStr = data.ticks.map(item => formatTimeFromNano(item.time))
    const originalTimeToIndex = new Map(data.ticks.map((item, index) => [item.time, index]))
    const indexToFormattedTime = (key) => indexToFormattedStr[key]

    const chart = createOptionsChart(
      mainContainerRef.current,
      buildChartOptions(mainContainerRef.current, indexToFormattedTime, true),
    )
    if (data.title) addWatermark(chart, data.title)

    const subCharts = subSpecs.map(({ containerRef, lines }) => {
      const c = createOptionsChart(
        containerRef.current,
        buildChartOptions(containerRef.current, indexToFormattedTime, false),
      )
      addWatermark(c, lines.map(p => p.key).join(', '))
      const firstSeries = lines.reduce((first, params) => {
        const s = addLineSeries(c, data.ticks, params, true)
        return first || s
      }, null)
      return { chart: c, containerRef, firstSeries }
    })

    const allCharts = [chart, ...subCharts.map(s => s.chart)]
    if (allCharts.length > 1) syncTimeScales(allCharts)

    const priceLineSeries = chart.addSeries(LineSeries, {
      lineWidth: 1, lineType: 1, pointMarkersVisible: true, pointMarkersRadius: 1.5,
      color: '#ffffff', priceScaleId: 'right',
      priceFormat: { precision: 4, minMove: 0.0001 },
      ...COMMON_SERIES_OPTIONS,
    })
    priceLineSeries.setData(data.ticks.map((item, index) => ({ time: index, value: item.price })))

    const fillLineSeries = chart.addSeries(LineSeries, {
      lineWidth: 0, lineType: 1, pointMarkersVisible: true, pointMarkersRadius: 3.5,
      color: 'black', ...COMMON_SERIES_OPTIONS,
    })
    fillLineSeries.setData(data.ticks.map((item, index) => ({ time: index, value: item.fill })))

    data.TickChartLines?.forEach(params => addLineSeries(chart, data.ticks, params))

    data.orderDurations?.forEach(order => {
      const fromIdx = originalTimeToIndex.get(order.start_time)
      const toIdx = originalTimeToIndex.get(order.end_time)
      if (fromIdx === undefined || toIdx === undefined) return
      const s = chart.addSeries(LineSeries, {
        color: order.side === 'buy' ? '#fcf11b' : '#ff6347',
        lineWidth: 2, lineType: 0, pointMarkersVisible: false,
        ...COMMON_SERIES_OPTIONS,
      })
      s.setData([
        { time: fromIdx, value: parseFloat(order.price) },
        { time: toIdx, value: parseFloat(order.price) },
      ])
    })

    if (allCharts.length > 1) {
      syncCrosshairs(allCharts, [priceLineSeries, ...subCharts.map(s => s.firstSeries)])
    }

    createSeriesMarkers(fillLineSeries, data.fill_markers.map(marker => ({
      ...marker,
      time: originalTimeToIndex.get(marker.time),
    })))

    data.signals?.forEach(signal => {
      const idx = originalTimeToIndex.get(signal.time)
      if (idx === undefined) return
      const vertLine = new VertLine(chart, priceLineSeries, idx, {
        color: signal.win === false ? 'rgba(255,0,0,0.5)' : 'rgba(102,255,0,0.5)',
        width: 2,
        showLabel: true,
        labelText: signal.tag,
        labelBackgroundColor: signal.win === false ? 'rgb(128,2,2)' : 'rgb(52,128,2)',
        labelTextColor: 'white',
      })
      priceLineSeries.attachPrimitive(vertLine)
    })

    allCharts.forEach(c => c.timeScale().fitContent())

    const resizable = [
      { containerRef: mainContainerRef, chart },
      ...subCharts,
    ]
    const handleResize = () => {
      resizable.forEach(({ containerRef, chart: c }) => {
        if (containerRef.current) {
          c.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          })
        }
      })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      allCharts.forEach(c => c.remove())
    }
  }, [data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div ref={mainContainerRef} style={{ width: '100%', flex: 7 }} />
      {hasChartData(data?.TickChart2Lines, data?.ticks) && (
        <div ref={sub1ContainerRef} style={{ width: '100%', flex: 3 }} />
      )}
      {hasChartData(data?.TickChart3Lines, data?.ticks) && (
        <div ref={sub2ContainerRef} style={{ width: '100%', flex: 3 }} />
      )}
    </div>
  )
}

export default Chart
