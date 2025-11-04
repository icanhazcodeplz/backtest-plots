import { useEffect, useRef } from 'react'
import {
  createOptionsChart,
  createSeriesMarkers,
  LineSeries
} from 'lightweight-charts'

function Chart({ data }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current || !data) return

    // const customBehavior = new (defaultHorzScaleBehavior())
    // Override methods to use numeric x-axis instead of time-based
    // customBehavior.preprocessData = (data) => {
    //   console.log(data)
      // data.map(item => ({ time: item.time, value: item.price }))
    // }
    // customBehavior.formatHorzItem = (item) => {
    //   item
      // console.log('formatHorzItem item:', item);
      // item.toFixed(2)
    // }
    // customBehavior.formatTickmark = (item) => item.toFixed(2)


    function formatTimeFromNano(time) {
      if (typeof time === 'string') {
        const nanos = time.slice(-9);
        const timeInt = parseInt(time);
        // The 3600 * 0 can be used to adjust time zones. 0 because currently in EST
        const date = new Date((timeInt / 1000000 + 3600 * 0));
        const pad = (num, size = 2) =>
            num.toString().padStart(size, '0');
        let timeString = [
              pad(date.getHours()),
              pad(date.getMinutes()),
              pad(date.getSeconds()),
            ].join(':') +
            '.' +
            nanos;
        return timeString;
      }
      return null;
    }

    const indexToFormattedStr = new Map(
      data.ticks.map((item, index) => [index, formatTimeFromNano(item.time)])
    );

    const indexToFormattedTime = (key) => {
      return indexToFormattedStr.get(key);
    }

    // Create a Map with incrementing integers (starting at 1) to original time strings
    const originalTimeToIndex = new Map(
      data.ticks.map((item, index) => [item.time, index])
    );

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
      localization: {
        // Set the hover-xaxis
        timeFormatter: indexToFormattedTime,
      },
      // timeScale: {
      //   timeVisible: false,
      //   secondsVisible: false,
      //   tickMarkFormatter: indexToFormattedTime, // DOES NOTHING
      // },
    })
    chartRef.current = chart

    const priceLineSeries = chart.addSeries(LineSeries, { lineWidth: 1, lineType:1, pointMarkersVisible: true, pointMarkersRadius:5, color: '#ffffff'});
    const priceData = data.ticks.map((item, index) => ({
      time: index,
      value: item.price,
    }));
    priceLineSeries.setData(priceData)

    if (data.TickChartLines) {
      data.TickChartLines.forEach(params => {
        // console.log('TickChartLines params:', params);
        const lineSeries = chart.addSeries(LineSeries, { color: params.color, lineWidth: params.width, lineType:params.type, pointMarkersVisible: false});
        lineSeries.setData(data.ticks.map((item, index) => ({time: index, value: item[params.key]})))
      })
    }


    const convertedPriceMarkers = data.price_markers.map(marker => {
      const markerTimeToIndex = originalTimeToIndex.get(marker.time);
      // console.log('marker.time:', marker.time, '-> convertedTime:', convertedTime);
      return {
        ...marker,
        time: markerTimeToIndex
      };
    });

    createSeriesMarkers(priceLineSeries, convertedPriceMarkers)

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
