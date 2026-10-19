import { THEME } from '../chart/theme.js'

/**
 * Key for a pane's indicator lines, pinned to the pane's top-right corner just
 * inside the price axis. Lines with `color_negative` show a split swatch.
 */
function LineLegend({ lines }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: THEME.priceAxisWidth + 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '6px 8px',
        background: THEME.legend.background,
        border: `1px solid ${THEME.legend.border}`,
        borderRadius: 4,
        color: THEME.text,
        font: THEME.legend.font,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {lines.map(line => (
        <div key={line.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 14,
              height: 10,
              borderRadius: 2,
              background: line.color_negative
                ? `linear-gradient(90deg, ${line.color} 0 50%, ${line.color_negative} 50% 100%)`
                : line.color,
            }}
          />
          <span>{line.key}</span>
        </div>
      ))}
    </div>
  )
}

export default LineLegend
