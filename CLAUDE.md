# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server. Expects a backend at `http://127.0.0.1:5001/api/data`.
- `npm run build` / `npm run preview` — production build and preview.
- `npm run lint` — ESLint over the repo.
- `npm test` — runs the node test runner over `tests/**/*.test.mjs`. The only test currently builds a snapshot and diffs against `tests/snapshots/expected.html`.
- `npm run snapshot [data.json] [out.html]` — builds a single self-contained HTML file with the fixture data inlined as `window.__BACKTEST_DATA__` (defaults: `data/api_dumps/api_data.json` → `data/snapshots/snapshot.html`). Open the output directly in a browser; no backend needed.
- `npm run fetch-data [url] [out.json]` — dumps the live backend response to disk.

Regenerate the snapshot baseline after intentional rendering changes:
`node scripts/snapshot.mjs tests/data/api_data.json tests/snapshots/expected.html`

## Architecture

Single-page React + Vite app whose entire render is one `Chart` component (`src/components/Chart.jsx`) built on TradingView's `lightweight-charts` v5.

### Data flow

`App.jsx` either reads `window.__BACKTEST_DATA__` (set by the snapshot bundle) or fetches `http://127.0.0.1:5001/api/data`, then hands the JSON to `Chart`. The full payload schema lives in `README.md`.

### Chart construction (one effect, runs per `data` change)

`Chart` builds up to three stacked panes that share a synchronized time scale and crosshair:

1. **Main pane** — price line, fill markers (separate invisible-line series for marker anchoring), `TickChartLines` overlays, `orderDurations` as two-point horizontal line segments colored by side, `signals` as vertical lines via the `VertLine` primitive (`src/plugins/vertical-line.js`).
2. **Sub-panes** — `TickChart2Lines` and `TickChart3Lines`. A sub-pane is created only if `hasChartData` finds at least one tick with a matching key. Sub-pane lines use per-point coloring (`color` for ≥0, `color_negative` for <0).

### Time-axis trick

Tick timestamps are nanosecond decimal strings and are non-uniform, which `lightweight-charts` doesn't render well. The component **uses the array index as the chart's `time` value** so bars render contiguously, and supplies a `timeFormatter` (via `createOptionsChart`) that maps the index back to a formatted `HH:MM:SS.nnnnnnnnn` string. Anything keyed by original timestamp (`fill_markers`, `orderDurations`, `signals`) is remapped through `originalTimeToIndex` before being passed to the chart APIs. When touching this area: every series/marker/primitive must be in index-space, not nanosecond-space.

### Sync

`syncTimeScales` and `syncCrosshairs` wire pane-to-pane events with a `syncing` guard to prevent feedback loops. Both functions are no-ops with a single pane.

## Snapshot test

`scripts/snapshot.mjs` runs a Vite build in-memory, inlines every chunk/css into the HTML, then injects the fixture JSON as `window.__BACKTEST_DATA__`. The test (`tests/snapshot.test.mjs`) shells out to this script and asserts byte-equality against `tests/snapshots/expected.html`. Any change that alters bundled JS (deps, build config, source) will likely require regenerating the baseline.
