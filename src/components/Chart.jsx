import {useEffect, useRef} from 'react'
import {createOptionsChart, createSeriesMarkers, createTextWatermark, LineSeries} from 'lightweight-charts'
import {VertLine} from '../plugins/vertical-line'

function hasChartData(lines, ticks) {
  if (!lines?.length || !ticks) return false
  return lines.some(p => ticks.some(item => item[p.key] != null))
}

function buildChartOptions(container, timeFormatter, minYaxisWidth, isMain = false) {
  return {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { color: '#050505' },
      textColor: '#C3BCDB',
      ...(isMain ? {
        panes: {
          separatorColor: '#C3BCDB',
          separatorHoverColor: 'rgba(255, 0, 0, 0.1)',
          enableResize: true,
        },
      } : {}),
    },
    rightPriceScale: { minimumWidth: minYaxisWidth },
    grid: {
      vertLines: { color: '#444' },
      horzLines: { color: '#444' },
    },
    localization: { timeFormatter },
    timeScale: { minBarSpacing: 0.0001, visible: !isMain },
  }
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
  const chart2ContainerRef = useRef(null)
  const chart3ContainerRef = useRef(null)
  const chartRef = useRef(null)
  const chart2Ref = useRef(null)
  const chart3Ref = useRef(null)

  useEffect(() => {
    if (!mainContainerRef.current || !data) return

    const hasChart2 = hasChartData(data.TickChart2Lines, data.ticks)
    const hasChart3 = hasChartData(data.TickChart3Lines, data.ticks)

    function formatTimeFromNano(time) {
      if (typeof time !== 'string') return null
      const nanos = time.slice(-9)
      // 3600 * 0 offset can be adjusted for timezone; 0 = EST
      const date = new Date(parseInt(time) / 1000000 + 3600 * 0)
      const pad = (n) => n.toString().padStart(2, '0')
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${nanos}`
    }

    const indexToFormattedStr = new Map(
      data.ticks.map((item, index) => [index, formatTimeFromNano(item.time)])
    )
    const originalTimeToIndex = new Map(
      data.ticks.map((item, index) => [item.time, index])
    )
    const indexToFormattedTime = (key) => indexToFormattedStr.get(key)

    const minYaxisWidth = 90
    const chart = createOptionsChart(mainContainerRef.current, buildChartOptions(mainContainerRef.current, indexToFormattedTime, minYaxisWidth, true))
    chartRef.current = chart

    if (data.title) {
      createTextWatermark(chart.panes()[0], {
        horzAlign: 'left',
        vertAlign: 'top',
        lines: [{ text: data.title, color: 'rgba(195, 188, 219, 0.25)', fontSize: 48, fontStyle: 'bold' }],
      })
    }

    function createSubChart(containerRef, ref, lines) {
      if (!containerRef.current) return null
      const c = createOptionsChart(containerRef.current, buildChartOptions(containerRef.current, indexToFormattedTime, minYaxisWidth))
      ref.current = c
      createTextWatermark(c.panes()[0], {
        horzAlign: 'left',
        vertAlign: 'top',
        lines: [{ text: lines.map(p => p.key).join(', '), color: 'rgba(195, 188, 219, 0.25)', fontSize: 48, fontStyle: 'bold' }],
      })
      return c
    }

    const chart2 = hasChart2 ? createSubChart(chart2ContainerRef, chart2Ref, data.TickChart2Lines) : null
    const chart3 = hasChart3 ? createSubChart(chart3ContainerRef, chart3Ref, data.TickChart3Lines) : null

    const allCharts = [chart, chart2, chart3].filter(Boolean)
    if (allCharts.length > 1) syncTimeScales(allCharts)

    // Main chart series
    const priceLineSeries = chart.addSeries(LineSeries, {
      lineWidth: 1,
      lineType: 1,
      pointMarkersVisible: true,
      pointMarkersRadius: 1.5,
      color: '#ffffff',
      priceScaleId: 'right',
      priceFormat: { precision: 4, minMove: 0.0001 },
      lastValueVisible: false,
      priceLineVisible: false,
    })
    priceLineSeries.setData(data.ticks.map((item, index) => ({ time: index, value: item.price })))

    const fillLineSeries = chart.addSeries(LineSeries, {
      lineWidth: 0, lineType: 1, pointMarkersVisible: true, pointMarkersRadius: 3.5,
      color: 'black', lastValueVisible: false, priceLineVisible: false,
    })
    fillLineSeries.setData(data.ticks.map((item, index) => ({ time: index, value: item.fill })))

    data.TickChartLines?.forEach(params => {
      const s = chart.addSeries(LineSeries, { color: params.color, lineWidth: params.width, lineType: params.type, pointMarkersVisible: false, lastValueVisible: false, priceLineVisible: false })
      s.setData(data.ticks.map((item, index) => ({ time: index, value: item[params.key] })))
    })

    data.orderDurations?.forEach(order => {
      const fromIdx = originalTimeToIndex.get(order.start_time)
      const toIdx = originalTimeToIndex.get(order.end_time)
      if (fromIdx === undefined || toIdx === undefined) return
      const s = chart.addSeries(LineSeries, {
        color: order.side === 'buy' ? '#fcf11b' : '#ff6347',
        lineWidth: 2, lineType: 0, pointMarkersVisible: false, lastValueVisible: false, priceLineVisible: false,
      })
      s.setData([
        { time: fromIdx, value: parseFloat(order.price) },
        { time: toIdx, value: parseFloat(order.price) },
      ])
    })

    function addSubChartSeries(subChart, lines) {
      let firstSeries = null
      lines.forEach(params => {
        const s = subChart.addSeries(LineSeries, { color: params.color, lineWidth: params.width, lineType: params.type, pointMarkersVisible: false, lastValueVisible: false, priceLineVisible: false })
        if (!firstSeries) firstSeries = s
        s.setData(data.ticks.map((item, index) => {
          const value = item[params.key]
          return { time: index, value, color: value >= 0 ? params.color : params.color_negative }
        }))
      })
      return firstSeries
    }

    const chart2Series = chart2 ? addSubChartSeries(chart2, data.TickChart2Lines) : null
    const chart3Series = chart3 ? addSubChartSeries(chart3, data.TickChart3Lines) : null

    const chartSeriesPairs = [
      { c: chart, s: priceLineSeries },
      ...(chart2 ? [{ c: chart2, s: chart2Series }] : []),
      ...(chart3 ? [{ c: chart3, s: chart3Series }] : []),
    ]
    if (chartSeriesPairs.length > 1) {
      syncCrosshairs(chartSeriesPairs.map(p => p.c), chartSeriesPairs.map(p => p.s))
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

    const containerChartPairs = [
      [mainContainerRef, chartRef],
      [chart2ContainerRef, chart2Ref],
      [chart3ContainerRef, chart3Ref],
    ]
    const handleResize = () => {
      containerChartPairs.forEach(([containerRef, cRef]) => {
        if (containerRef.current && cRef.current) {
          cRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          })
        }
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      ;[chartRef, chart2Ref, chart3Ref].forEach(ref => { if (ref.current) ref.current.remove() })
    }
  }, [data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div ref={mainContainerRef} style={{ width: '100%', flex: 7 }} />
      {hasChartData(data?.TickChart2Lines, data?.ticks) && (
        <div ref={chart2ContainerRef} style={{ width: '100%', flex: 3 }} />
      )}
      {hasChartData(data?.TickChart3Lines, data?.ticks) && (
        <div ref={chart3ContainerRef} style={{ width: '100%', flex: 3 }} />
      )}
    </div>
  )
}

export default Chart
