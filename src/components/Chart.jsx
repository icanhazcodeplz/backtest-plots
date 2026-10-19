import { useEffect, useRef } from 'react'
import { buildChart } from '../chart/buildChart.js'
import { getSubPanes, hasLineData } from '../chart/payload.js'
import { PANE_FLEX } from '../chart/theme.js'
import LineLegend from './LineLegend.jsx'

/**
 * Lays out the stacked panes and hands their DOM containers to buildChart.
 * All drawing logic lives in src/chart/; this component only owns layout and
 * the chart lifecycle.
 */
function Chart({ data }) {
  const mainRef = useRef(null)
  const subRefs = useRef([])
  const subPanes = getSubPanes(data)

  useEffect(() => {
    if (!mainRef.current || !data) return
    return buildChart({
      mainContainer: mainRef.current,
      subPanes: getSubPanes(data).map((pane, i) => ({ container: subRefs.current[i], lines: pane.lines })),
      data,
    })
  }, [data])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      <Pane containerRef={mainRef} flex={PANE_FLEX.main} lines={data?.TickChartLines} ticks={data?.ticks} />
      {subPanes.map((pane, i) => (
        <Pane
          key={pane.field}
          containerRef={el => { subRefs.current[i] = el }}
          flex={PANE_FLEX.sub}
          lines={pane.lines}
          ticks={data.ticks}
        />
      ))}
    </div>
  )
}

function Pane({ containerRef, flex, lines, ticks }) {
  return (
    <div style={{ position: 'relative', width: '100%', flex }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {hasLineData(lines, ticks) && <LineLegend lines={lines} />}
    </div>
  )
}

export default Chart
