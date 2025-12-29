import {useEffect, useRef} from 'react'
import {createOptionsChart, createSeriesMarkers, LineSeries} from 'lightweight-charts'
import {VertLine} from '../plugins/vertical-line'

function Chart({ data }) {
  const chartContainerRef = useRef(null)
  const secondaryChartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const secondaryChartRef = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current || !secondaryChartContainerRef.current || !data) return

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
    const minYaxisWidth = 90;
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
      rightPriceScale: {
        minimumWidth: minYaxisWidth,
      },
      grid: {
        vertLines: { color: "#444" },
        horzLines: { color: "#444" },
      },
      localization: {
        // Set the hover-xaxis
        timeFormatter: indexToFormattedTime,
      },
      timeScale: {
        minBarSpacing: 0.0001,
      },
      //   timeVisible: false,
      //   secondsVisible: false,
      //   tickMarkFormatter: indexToFormattedTime, // DOES NOTHING
      // },
    })
    chartRef.current = chart

    // Create secondary chart that shares the same x-axis
    const secondaryChart = createOptionsChart(secondaryChartContainerRef.current, {
      width: secondaryChartContainerRef.current.clientWidth,
      height: secondaryChartContainerRef.current.clientHeight,
      layout: {
        background: { color: "#050505" },
        textColor: "#C3BCDB",
      },
      rightPriceScale: {
        minimumWidth: minYaxisWidth,
      },
      grid: {
        vertLines: { color: "#444" },
        horzLines: { color: "#444" },
      },
      localization: {
        timeFormatter: indexToFormattedTime,
      },
      timeScale: {
        minBarSpacing: 0.0001,
      },
    })
    secondaryChartRef.current = secondaryChart

    // Sync the time scales between charts
    let isSyncing = false
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncing || !range) return
      isSyncing = true
      secondaryChart.timeScale().setVisibleLogicalRange(range)
      isSyncing = false
    })
    secondaryChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (isSyncing || !range) return
      isSyncing = true
      chart.timeScale().setVisibleLogicalRange(range)
      isSyncing = false
    })

    const priceLineSeries = chart.addSeries(LineSeries, {
      lineWidth: 1,
      lineType: 1,
      pointMarkersVisible: true,
      pointMarkersRadius: 1.5,
      color: '#ffffff',
      priceScaleId: 'right',
    });
    priceLineSeries.setData(data.ticks.map((item, index) => ({time: index, value: item.price})))


    const fillLineSeries = chart.addSeries(LineSeries, { lineWidth: 0, lineType:1, pointMarkersVisible: true, pointMarkersRadius: 3.5, color: 'black'});
    fillLineSeries.setData(data.ticks.map((item, index) => ({time: index, value: item.fill})))

    if (data.TickChartLines) {
      data.TickChartLines.forEach(params => {
        const lineSeries = chart.addSeries(LineSeries, { color: params.color, lineWidth: params.width, lineType:params.type, pointMarkersVisible: false});
        lineSeries.setData(data.ticks.map((item, index) => ({time: index, value: item[params.key]})))
      })
    }
    // Add series to the secondary chart
    let secondarySeriesRef = null
    if (data.SecondaryTickChartLines) {
      data.SecondaryTickChartLines.forEach(params => {
        const lineSeries = secondaryChart.addSeries(LineSeries, { color: params.color, lineWidth: params.width, lineType: params.type, pointMarkersVisible: false });
        if (!secondarySeriesRef) secondarySeriesRef = lineSeries
        lineSeries.setData(data.ticks.map((item, index) => {
          const value = item[params.key];
          return {
            time: index,
            value: value,
            color: value >= 0 ? params.color : params.color_negative,
          };
        }))
      })
    }

    // Sync crosshairs between charts
    let isCrosshairSyncing = false
    chart.subscribeCrosshairMove((param) => {
      if (isCrosshairSyncing) return
      isCrosshairSyncing = true
      if (param.time !== undefined && secondarySeriesRef) {
        secondaryChart.setCrosshairPosition(0, param.time, secondarySeriesRef)
      } else {
        secondaryChart.clearCrosshairPosition()
      }
      isCrosshairSyncing = false
    })
    secondaryChart.subscribeCrosshairMove((param) => {
      if (isCrosshairSyncing) return
      isCrosshairSyncing = true
      if (param.time !== undefined) {
        chart.setCrosshairPosition(0, param.time, priceLineSeries)
      } else {
        chart.clearCrosshairPosition()
      }
      isCrosshairSyncing = false
    })

    const convertedFillMarkers = data.fill_markers.map(marker => {
      const markerTimeToIndex = originalTimeToIndex.get(marker.time);
      return {
        ...marker,
        time: markerTimeToIndex
      };
    });

    createSeriesMarkers(fillLineSeries, convertedFillMarkers)

    // Add vertical lines for each signal
    if (data.signals) {
      data.signals.forEach(signal => {
        const signalIndex = originalTimeToIndex.get(signal.time);
        if (signalIndex !== undefined) {
          const vertLine = new VertLine(chart, priceLineSeries, signalIndex, {
            color: signal.win === false ? 'rgba(255,0,0,0.5)' : 'rgba(102,255,0,0.5)',
            width: 2,
            showLabel: true,
            labelText: signal.tag,
            labelBackgroundColor: signal.win === false ? 'rgb(128,2,2)' : 'rgb(52,128,2)',
            labelTextColor: 'white',
          });
          priceLineSeries.attachPrimitive(vertLine);
        }
      });
    }

    // RESIZING LOGIC ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    chart.timeScale().fitContent()
    secondaryChart.timeScale().fitContent()

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
      if (secondaryChartContainerRef.current && secondaryChartRef.current) {
        secondaryChartRef.current.applyOptions({
          width: secondaryChartContainerRef.current.clientWidth,
          height: secondaryChartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (chartRef.current) {
        chartRef.current.remove()
      }
      if (secondaryChartRef.current) {
        secondaryChartRef.current.remove()
      }
    }
  }, [data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <div ref={chartContainerRef} style={{ width: '100%', flex: 7 }} />
      <div ref={secondaryChartContainerRef} style={{ width: '100%', flex: 3 }} />
    </div>
  )
}

export default Chart
