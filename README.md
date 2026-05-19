# backtest_plots

A React + Vite frontend for visualizing backtest results from a local trading-strategy backend. Renders tick price data, indicator lines, order fills, and signals on synchronized [lightweight-charts](https://github.com/tradingview/lightweight-charts) panes.

## What it shows

The app fetches a single JSON payload from `http://127.0.0.1:5001/api/data` and renders:

- **Main pane** — tick price line, with optional indicator overlays (`TickChartLines`), order durations drawn as horizontal segments colored by side (buy/sell), fill markers, and vertical signal lines tagged with win/loss colors.
- **Sub-panes** — up to two additional panes (`TickChart2Lines`, `TickChart3Lines`) for indicators rendered below the main chart, with per-point coloring based on sign.
- **Watermarks** — the payload `title` on the main pane; indicator keys on each sub-pane.

All panes share a synchronized time scale and crosshair. The time axis uses an integer index internally so non-uniform tick timestamps render without gaps; tick `time` values (nanosecond strings) are formatted back to `HH:MM:SS.nnnnnnnnn` on the axis.

## Running

The frontend expects a backend serving `/api/data` on `127.0.0.1:5001`.

```
npm install
npm run dev
```

Other scripts:

- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

## Test data

A captured response from the local API is checked in at `tests/data/api_data.json` for reference and future integration tests.
