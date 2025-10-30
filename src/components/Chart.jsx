import { useEffect, useRef } from 'react'
import {createOptionsChart, createSeriesMarkers, LineSeries} from 'lightweight-charts'

function Chart({ data }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current || !data) return

    // Create chart
    const chart = createOptionsChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "#050505" },
        textColor: "#C3BCDB",
        panes: {
          separatorColor: '#C3BCDB',
          separatorHoverColor: 'rgba(255, 0, 0, 0.1)',
          enableResize: true, // of panes
        },
      },
      grid: {
        vertLines: { color: "#444" },
        horzLines: { color: "#444" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    })

    chartRef.current = chart

    const priceLineSeries = chart.addSeries(LineSeries, { lineWidth: 1, lineType:0, pointMarkersVisible: false, pointMarkersRadius:3, color: '#ffffff'});
    const priceData = data.ticks.map(item => ({
      time: item.time,
      value: item.price,
    }));
    priceLineSeries.setData(priceData)

    if (data.TickChartLines) {
      data.TickChartLines.forEach(params => {
        console.log('TickChartLines params:', params);
        const lineSeries = chart.addSeries(LineSeries, { color: params.color, lineWidth: params.width, lineType:params.type, pointMarkersVisible: false});
        lineSeries.setData(data.ticks.map(item => ({time: item.time, value: item[params.key]})))
      })
    }


    createSeriesMarkers(priceLineSeries, data.price_markers)

    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
      }
    }
  }, [data])

  return (
    <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
  )
}

export default Chart
