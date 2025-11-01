# Copilot Instructions

## Core Context

- Landing page runs on Vite + React (`npm run dev`); `src/App.jsx` wires the high-level sections, toggles the contact modal, and mounts the dev-only `AnalyticsDashboard`.
- Visual strategy demo uses React Flow; see `src/components/sections/demo/Demo.jsx` for node state orchestration, parameter management, and backtest option assembly.
- Global look & feel lives under `src/styles` plus per-component SCSS; prefer editing the local `.scss` next to each JSX file so animations and variables stay localized.

## Graph & Simulation Flow

- `Demo.jsx` keeps `parameters`, `nodes`, and `edges` in React state and injects a shared `params` array into each node before sending them to the worker.
- Parameter editing happens in `.../demo/parameter-block/ParameterBlock.jsx`, which dispatches a `parametersUpdated` custom event; node components (e.g. `nodes/buy/Buy.jsx`) listen for it to stay in sync.
- The web worker `src/workers/backtest.worker.js` deep-clones nodes, normalizes variable bindings, then pipelines into `parseGraph` and `runSimulation`.
- `src/utils/parser.js` translates nodes/edges into a blueprint with `dataProducers`, `entryGraph`, and `inTradeGraph`; reference its warning messages when graph wiring is incomplete.
- `src/utils/simulator.js` consumes that blueprint, resolves series via `calculateIndicator`, and returns normalized equity, trades, and drawdown metrics used by the UI.

## Backtest View

- `.../demo/back-test/BacktestView.jsx` fetches CoinGecko data (daily EUR) with fallback to synthetic prices from `utils/indicators.js`; it auto-runs once prices land and replays chart animations on each run.
- Chart rendering uses Recharts with custom tooltips and reference dots; update data shape via the computed `priceChartData` / `equityChartData` helpers to keep annotations working.
- Stop-loss and indicator labels are derived by scanning `options.nodes`; when adding new node types ensure `options.nodes` still surfaces `data.parameters` for the worker/lookups.

## Analytics & Telemetry

- Privacy-friendly analytics live in `src/utils/analytics.js`; it queues events until Supabase is ready and falls back to `localStorage` under `import.meta.env.DEV`.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable live inserts; the dev-only `AnalyticsDashboard.jsx` reads from the singleton and lets you inspect/clear stored events.

## Styling & UX

- Scrollbar auto-hide is initialized via `initScrollbarAutoHide` (`src/utils/scrollbarAutoHide.js`) and driven by CSS variables; adjust behavior there instead of sprinkling listeners elsewhere.
- Node UI shares wrappers in `.../demo/nodes/nodeDefault.jsx` plus individual SCSS; keep new node components consistent with the existing handles and `updateNodeData` hooks.

## Scripts & Tooling

- Install deps with `npm install`; run the site with `npm run dev`, build for deploy via `npm run build`, and preview using `npm run preview`.
- Smoke the simulation stack with `node scripts/smoke_test.mjs`, which wires sample nodes -> `parseGraph` -> `runSimulation` and logs blueprint warnings.
- `scripts/ping_coingecko.mjs` verifies the CoinGecko API key when rate limits bite; it reuses the same demo header used by `BacktestView`.

## Gotchas

- `package.json` advertises `npm test` / `npm run test:sim` but the `scripts/run_sim_test.mjs` entry is missing; stick to `node scripts/smoke_test.mjs` until the harness is restored.
- `GRAPH_EXECUTOR_GUIDE.md` describes an older `graphExecutor` module; the live implementation is the parser/simulator pair mentioned above.
- When editing analytics, remember production mode skips console logging and writes straight to Supabase—mirror any debug logging behind `import.meta.env.DEV`.
