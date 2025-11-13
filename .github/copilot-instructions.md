# Copilot Instructions

## Project Snapshot

- React 18 + Vite app, entry at `src/main.jsx`, page shell in `src/App.jsx`, sections live under `src/components/sections/**` and share global styles in `src/styles`.
- Landing page flows top-to-bottom: `Navbar` → hero/build/test/trade/demo/faq/cta sections → `Footer`; `ContactModal` is toggled via callbacks passed from `App.jsx`.
- Demo section is the heart of the app (`src/components/sections/demo`), combining React Flow nodes, parameter management, and backtest visualizations.
- Assets and SCSS are colocated with components; new images/fonts belong in `src/assets` and should be imported at the entry point that consumes them.

## Dev Workflow

- Install deps with `npm install`; run locally via `npm run dev`; production build uses `npm run build`; bundle preview is `npm run preview`.
- ESLint (configured in `eslint.config.js`) is the only automated check—run `npm run lint` before sending PRs.
- `npm run test` currently points to the missing `scripts/run_sim_test.mjs`; use `node scripts/smoke_test.mjs` as the working simulator sanity check until that script is restored.
- Vite only exposes env vars prefixed with `VITE_`; Supabase analytics requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your local `.env`.

## Visual Strategy Builder

- React Flow graph state is owned by `Demo.jsx` using `useNodesState`/`useEdgesState`; wrap new node logic with the provided `nodeTypes` map in that file.
- Parameters are centralized in `ParameterBlock.jsx`; updates dispatch a `parametersUpdated` custom event and auto-generated variables are reconciled via `reconcileParametersWithAuto`—avoid bypassing `setParameters` helpers.
- Node definitions live under `components/sections/demo/nodes/**`; follow existing patterns (props include graph data plus injected parameter list) when introducing new node types.
- Asset & resolution picks are shared through `AssetContext`; consume it via `useAsset()` to avoid prop drilling.
- Keep `DEFAULT_*` constants in `defaults.js` in sync when changing initial strategy assumptions.

## Backtest Worker & Simulation

- `BacktestView.jsx` derives a lightweight graph signature from React Flow state, fetches price data (CoinGecko + API key header), and hands everything to `workers/backtest.worker.js`.
- The worker normalizes node data, resolves parameter bindings, then calls `parseGraph` and `runSimulation`; any new node data requirements must be mirrored in both parser and simulator.
- Historic prices must expose `live_price`; if you change upstream fetchers, keep that field populated or the simulator will bail.
- Progress/error messages are surfaced by posting `{ status: "progress" | "complete" | "error" }`; keep that contract when extending worker logic.
- Simulation outputs feed the Recharts graphs; add new metrics via the returned `stats` structure in `runSimulation`.

## Analytics & Contact Capture

- `src/utils/analytics.js` bootstraps on load, stores a singleton on `window.__analytics`, and logs to Supabase only outside dev; use `useAnalytics`/`useTrackInteraction` hooks rather than calling the singleton directly.
- The contact modal (`ContactModal.jsx`) enriches submissions with session analytics and writes to Supabase plus FormSubmit email; update both paths if you change the payload.
- Analytics dashboard (`components/AnalyticsDashboard.jsx`) is only rendered in dev (`import.meta.env.DEV`); keep heavy debugging UI behind the same guard.
- Scroll tracking, social clicks, and modal opens are measured as `custom_event` types—reuse those names for consistent reporting.

## UI & Styling

- Global scrollbar behavior comes from `initScrollbarAutoHide()` and CSS vars; when altering layout heights ensure `.site-footer` still toggles track colors.
- Components rely on SCSS files imported alongside the JSX; prefer BEM-ish class names already in use and avoid CSS modules to stay consistent.
- Animations use Anime.js or Framer Motion (e.g., `ContactModal`); match existing library usage instead of mixing new animation stacks.

## Misc Patterns

- Graph executor design notes live in `GRAPH_EXECUTOR_GUIDE.md`; consult it before changing parser/simulator data contracts.
- Keep worker imports using the Vite `?worker` suffix so bundling stays compatible.
- When touching analytics or network code remember fetch headers include the CoinGecko demo key—regressions there surface as rate-limit errors in the console.
- Place reusable utilities in `src/utils`; hooks belong in `src/hooks`; follow current naming (`camelCase.js` for utilities, `PascalCase.jsx` for components).
