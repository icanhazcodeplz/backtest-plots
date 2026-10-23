# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server. Lists runs from `<VITE_API_BASE>/runs` and loads one from `<VITE_API_BASE>/data/<run>` (default root `http://127.0.0.1:5001/api`).
- `npm run build` / `npm run preview` — production build and preview.
- `npm run lint` — ESLint over the repo.
- `npm test` — node test runner over `tests/**/*.test.mjs`: unit tests in `tests/unit/` for the pure modules, plus a snapshot test that builds the bundle and diffs it against `tests/snapshots/expected.html`.
- `npm run snapshot [data.json] [out.html]` — builds a single self-contained HTML file with the payload inlined as `window.__BACKTEST_DATA__` (defaults: `data/api_dumps/api_data.json` → `data/snapshots/snapshot.html`). Open the output directly in a browser; no backend needed.
- `npm run snapshot:update` — regenerate the snapshot baseline after any intentional change to source, deps, build config, or `tests/data/api_data.json`.
- `npm run fetch-data [url] [out.json]` — dumps the live backend response to disk.
- `npm run validate [data.json]` — runs `validatePayload` on a payload file.

## Architecture

React + Vite app built on TradingView's `lightweight-charts` v5. The payload schema lives in `README.md`.

- `src/App.jsx` — reads `window.__BACKTEST_DATA__` (snapshot builds) or fetches `API_URL` (`src/config.js`), logs `validatePayload` problems, renders `Chart`.
- `src/components/Chart.jsx` — React layout only: one container div per pane plus `LineLegend` overlays; its effect calls `buildChart` and returns its cleanup.
- `src/chart/` — all lightweight-charts code:
  - `buildChart.js` orchestrates: time index → main chart → `draw*` overlays (call order = z-order) → sub-pane charts → sync.
  - `overlays.js` has one `draw*(ctx)` per main-pane payload field; `ctx = { chart, data, timeIndex, priceSeries }`.
  - `series.js` (line/indicator/segment helpers), `panes.js` (per-pane chart options + watermark), `sync.js` (time scale + crosshair sync with a `syncing` guard), `theme.js` (all default colors/sizes).
  - `time.js` and `payload.js` are pure (no DOM, no lightweight-charts) so Node unit tests can import them. Keep them that way, and use explicit `.js` extensions in imports under `src/chart/`.
- `src/plugins/` — custom primitives: `VertLine` (full-height line + time-axis label) and `HorizLineLabel` (text above a segment's right end).

Each stacked pane is a separate chart instance (not a lightweight-charts pane) so it can carry a React legend. Sub-panes come from `SUB_PANE_FIELDS` (`TickChart2Lines`, `TickChart3Lines`) and are created only if `hasLineData` finds a tick with a matching key. Only the bottom pane shows the time axis, so `VertLine` labels on the main pane are hidden when sub-panes exist.

### Time-axis trick

Tick timestamps are nanosecond decimal strings and are non-uniform, which `lightweight-charts` doesn't render well. Charts **use the tick array index as `time`** (via `createOptionsChart`), and `createTimeIndex` in `time.js` provides `format(index)` for axis labels, `indexOf(time)` for exact lookups (`fill_markers`, `orderDurations`, `HorizLines`), and `nearestIndexOf(time)` for snapping (`VertLines`). Every series/marker/primitive must be in index-space, not nanosecond-space. Never parse nanosecond strings with `Number`/`parseInt` (precision loss); use string slicing or `BigInt`.

## Tests

`scripts/snapshot.mjs` runs a Vite build in-memory (plugins from `vite.config.js`), inlines every chunk/css into the HTML, then injects the fixture JSON. The snapshot test asserts byte-equality, so it detects bundle changes but not rendering; to verify visuals, screenshot `tests/snapshots/expected.html` with headless Chrome. `tests/data/api_data.json` should keep exercising every drawable field (a unit test enforces this).
