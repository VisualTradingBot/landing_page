# Copilot Instructions

## Project Overview

- Vite + React 18 SPA (`src/App.jsx`) stitches marketing sections with a node-based trading demo and analytics.
- UI sections live under `src/components/sections/**`, each paired with a SCSS module; global resets in `src/styles`.
- `Navbar`, `Hero`, `CTA`, and `ContactModal` share the `onOpenModal` prop to drive the contact modal state owned by `App`.

## Demo Graph & Backtest Flow

- `Demo.jsx` is the interactive core: ReactFlow nodes/edges seeded from `demo/initial.jsx`, parameters from `initialParameters`, and layout styles from `demo.scss`.
- `ParameterBlock.jsx` is the single source of truth for strategy parameters; it injects the array into every node, exposes drag payloads via the `application/reactflow` mime type, and broadcasts `parametersUpdated` events.
- Node implementations under `demo/nodes/**` rely on props such as `data.parameters`, `data.isInTradeHidden`, and `onToggleInTrade`; preserve these shapes when extending nodes.
- The backtest loop lives in `src/workers/backtest.worker.js`: clone incoming nodes, normalize parameter bindings, run `parseGraph` (`utils/parser.js`), then simulate with `runSimulation` (`utils/simulator.js`).
- `parseGraph` expects a block node labeled `"In a trade"` to split entry vs in-trade graphs; keep that label stable or update `IN_TRADE_LABEL`.
- `runSimulation` and downstream charts assume price objects carry a `live_price` number; `BacktestView.jsx` maps CoinGecko responses with `mapCoinGeckoPricesToOHLC` and falls back to `generateSyntheticPrices`.
- `BacktestView` creates the worker (`?worker` import), streams progress, animates chart reveal, and derives stop-loss/indicator context from `options.nodes`.

## Utilities & Conventions

- `utils/analytics.js` bootstraps automatically, storing events in localStorage during dev and Supabase in production; use `useTrackInteraction` / `useAnalytics` to log UI activity.
- Supabase helpers (`utils/supabase.js`) only load the SDK when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are defined; guard any direct Supabase usage accordingly.
- Scroll chrome is managed by `utils/scrollbarAutoHide.js`; call `initScrollbarAutoHide` once per session (already done in `App.jsx`).
- Styling prefers SCSS modules colocated with components; keep new selectors scoped to avoid leaking across sections.

## Developer Workflow

- Install dependencies with `npm install` and run the site via `npm run dev`; `npm run build` and `npm run preview` use the stock Vite pipeline.
- `npm run lint` enforces the flat `eslint.config.js` config; fix warnings before committing.
- Automated simulation tests are wired to `scripts/run_sim_test.mjs` (currently absent); in the meantime, run `node scripts/smoke_test.mjs` to exercise `parseGraph` + `runSimulation` end-to-end.
- Worker builds rely on Vite’s bundler; keep worker imports relative to `src` and avoid Node-only APIs inside worker code.

## External Integrations & Data

- Price data comes from the CoinGecko REST API with an `x-cg-demo-api-key` header (`BacktestView.jsx`); expect rate limits in dev and handle fallbacks gracefully.
- Analytics events ship to Supabase table `analytics_events`; schema expectation is defined inside `utils/analytics.js` `sendEventToSupabase`.
- ReactFlow custom edges are defined in `demo/initial.jsx` (`edgeTypes.shortStep` etc.); register new types there to keep visuals consistent.

## Productivity Tips

- When adding nodes or parameters, update `initial.jsx` so the demo blueprint, drag payloads, and worker normalization stay aligned.
- Keep parameter labels stable—worker logic resolves bindings by `label` before falling back to ids.
- For new charts or analytics views, reuse the number formatters and animation approach from `BacktestView` to maintain UX consistency.
- Dev-only tooling such as `AnalyticsDashboard.jsx` is gated behind `import.meta.env.DEV`; follow this pattern for diagnostic widgets.
