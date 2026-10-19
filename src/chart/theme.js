// Every default color and size used by the chart, in one place.
// Colors supplied in the payload (LineConfig.color, HorizLine.color, ...)
// override these per item.

export const THEME = {
  background: '#050505',
  text: '#C3BCDB',
  grid: '#444',
  // Fixed width so the price axes of stacked panes line up vertically.
  priceAxisWidth: 90,

  watermark: { color: 'rgba(195, 188, 219, 0.25)', fontSize: 48 },

  price: { color: '#ffffff', lineWidth: 1, markerRadius: 1.5 },
  fills: { color: 'black', markerRadius: 3.5 },
  orders: { buy: '#fcf11b', sell: '#ff6347', lineWidth: 2 },
  horizLine: { color: 'blue', lineWidth: 2 },
  vertLine: { color: 'blue', lineWidth: 1, labelTextColor: 'white' },

  legend: {
    background: 'rgba(5, 5, 5, 0.6)',
    border: 'rgba(195, 188, 219, 0.25)',
    font: '12px sans-serif',
  },
}

// Relative heights of the stacked panes (CSS flex-grow).
export const PANE_FLEX = { main: 7, sub: 3 }
