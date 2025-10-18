import { useCallback } from "react";
import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  addEdge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import Execute from "./nodes/execute/Execute";
import If from "./nodes/if/If";
import SetParameter from "./nodes/setParameter/SetParameter";
import Input from "./nodes/input/Input";
import Indicator from "./nodes/indicator/Indicator";
import "./demo.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  runBreakoutBacktest,
  mapCoinGeckoPricesToOHLC,
  generateSyntheticPrices,
} from "../../../utils/backtest";

const initialNodes = [
  {
    id: "inputNode",
    type: "inputNode",
    position: { x: 100, y: 0 },
    data: { label: "Input" },
  },
  {
    id: "indicatorNode",
    type: "indicatorNode",
    position: { x: 400, y: 0 },
    data: { label: "Indicator" },
  } /*
  {
    id: "setParameterNode",
    type: "setParameterNode",
    position: { x: 200, y: 400 },
    data: { label: "Set Parameter" },
  },*/,
  {
    id: "ifNode-1",
    type: "ifNode",
    position: { x: 400, y: 200 },
    data: {
      label: "If",
      term1: "close",
      operator: ">",
      term2: "Highest_Price_30d",
    },
  },
  {
    id: "ifNode-2",
    type: "ifNode",
    position: { x: 650, y: 350 },
    data: { label: "If", term1: "close", operator: "<", term2: "entry * 0.95" },
  },
  {
    id: "executeNode-1",
    type: "executeNode",
    position: { x: 650, y: 500 },
    data: { label: "Execute" },
  },
  {
    id: "executeNode-2",
    type: "executeNode",
    position: { x: 950, y: 450 },
    data: { label: "Execute" },
  },
];

const nodeTypes = {
  executeNode: Execute,
  ifNode: If,
  inputNode: Input,
  indicatorNode: Indicator,
  setParameterNode: SetParameter,
};

const initialEdges = [
  {
    id: "n1-n2",
    source: "inputNode",
    sourceHandle: "inputNode-right",
    target: "indicatorNode",
    targetHandle: "indicatorNode-left",
  },
  {
    id: "n2-n3.1",
    source: "indicatorNode",
    sourceHandle: "indicatorNode-bottom",
    target: "ifNode-1",
    targetHandle: "ifNode-1-top",
  },
  {
    id: "n3.1-n4.1",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-bottom",
    target: "executeNode-1",
    targetHandle: "executeNode-1-left",
  },
  {
    id: "n3.1-n3.2",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-right",
    target: "ifNode-2",
    targetHandle: "ifNode-2-top",
  },
  {
    id: "n3.2-n4.2",
    source: "ifNode-2",
    sourceHandle: "ifNode-2-bottom",
    target: "executeNode-2",
    targetHandle: "executeNode-2-left",
  },
];

export default function Demo() {
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [setEdges]
  );

  // Memoize node types to avoid re-creating components each render
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Compute translateExtent based on container size so the draggable area feels correct
  const containerRef = useRef(null);
  const [translateExtent, setTranslateExtent] = useState([
    [0, 0],
    [1200, 800],
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateExtent() {
      // Use container width/height or fallback to defaults
      const width = el.clientWidth || 1200;
      const height = el.clientHeight || 800;
      // Allow extra padding so nodes near edges aren't clipped
      setTranslateExtent([
        [0, 0],
        [Math.max(1200, width), Math.max(800, height)],
      ]);
    }

    updateExtent();
    const ro = new ResizeObserver(updateExtent);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Run validation checks only when nodes or edges change
  useEffect(() => {
    nodes.forEach((node) => {
      if (!node || !node.position) return;
      if (isNaN(node.position.x) || isNaN(node.position.y)) {
        console.warn("Invalid position in node:", node);
      }
    });

    edges.forEach((edge) => {
      if (!edge) return;
      if (
        !nodes.find((n) => n.id === edge.source) ||
        !nodes.find((n) => n.id === edge.target)
      ) {
        console.warn("Edge refers to missing node:", edge);
      }
    });
  }, [nodes, edges]);

  return (
    <section id="demo" className="demo">
      <div ref={containerRef} style={{ width: "100%", height: "50vh" }}>
        <ReactFlow
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }} // DO NOT REMOVE THE ZOOM PROPERTY, EVERYTHING WILL GO TO HELL FOR SOME UNKNOWN REASON
          nodes={nodes}
          nodeTypes={memoizedNodeTypes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          preventScrolling={false}
          autoPanOnNodeDrag={false}
          maxZoom={0.9}
          minZoom={0.9}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          translateExtent={translateExtent}
        >
          {/*<Panel position="top-left">
            <div className="parameter-table">
              <h1>Parameters</h1>
            </div>
          </Panel>*/}
        </ReactFlow>
      </div>

      <div className="divider"></div>

      {/* Backtest visualization */}
      <div className="backtest">
        <BacktestView />
      </div>
    </section>
  );
}

function BacktestView() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [asset, setAsset] = useState("bitcoin"); // 'bitcoin' | 'ethereum'
  const [lookback, setLookback] = useState(30);
  const [stopLossPercent, setStopLossPercent] = useState(5);
  const [feePercent, setFeePercent] = useState(0.05);
  // Keep one synthetic series per component mount so it doesn't change when params change
  const syntheticRef = useRef(null);
  if (syntheticRef.current === null) {
    syntheticRef.current = generateSyntheticPrices(365 * 2, 20000);
  }

  // Demo API key (dev only, provided by user)
  const DEMO_KEY = "CG-QimdPsyLSKFzBLJHXU2TtZ4w";

  useEffect(() => {
    let cancelled = false;

    async function fetchAndRun() {
      setLoading(true);
      try {
        console.log("[BacktestView] starting fetchAndRun");
        // Fetch last 2 years daily price for selected asset from CoinGecko
        const now = Math.floor(Date.now() / 1000);
        const twoYearsAgo = now - 365 * 2 * 24 * 3600;

        // Call CoinGecko PRO API directly with demo key (may be blocked by CORS in browser)
        let url = `https://pro-api.coingecko.com/api/v3/simple/price?ids=${asset}`;
        let res = null;
        try {
          res = await fetch(url, {
            method: "GET",
            headers: {
              "x-cg-demo-api-key": DEMO_KEY,
            },
            body: undefined,
          });
        } catch (fetchErr) {
          // network/CORS error — leave res null so we fallback to synthetic
          console.warn("[BacktestView] fetch failed (network/CORS):", fetchErr);
          res = null;
        }
        let prices = [];
        if (res && res.ok) {
          const data = await res.json();
          prices = mapCoinGeckoPricesToOHLC(data.prices || []);
          console.log("[BacktestView] coinGecko prices:", prices.length);
        } else if (res) {
          console.warn("CoinGecko response not ok, status=", res.status);
        }

        if (!prices || prices.length === 0) {
          // fallback to synthetic data for demo (stable across param changes)
          prices = syntheticRef.current;
        }

        let result = runBreakoutBacktest(prices, {
          window: lookback,
          stopLossPercent: stopLossPercent,
          feePercent: feePercent,
        });
        if (!result) {
          console.warn(
            "[BacktestView] runBreakoutBacktest returned null, falling back to synthetic"
          );
          const fallback = syntheticRef.current;
          result = runBreakoutBacktest(fallback, {
            window: lookback,
            stopLossPercent: stopLossPercent,
            feePercent: feePercent,
          });
        }
        console.log("[BacktestView] backtest result ready", !!result);
        if (!cancelled) setStats(result);
      } catch (err) {
        // On any error, fallback to synthetic prices so the demo still displays
        console.error("Backtest fetch failed, using synthetic data:", err);
        try {
          const prices = syntheticRef.current;
          const result = runBreakoutBacktest(prices, {
            window: lookback,
            stopLossPercent: stopLossPercent,
            feePercent: feePercent,
          });
          console.log("[BacktestView] synthetic fallback result ready");
          if (!cancelled) setStats(result);
        } catch (e) {
          console.error("Synthetic backtest also failed:", e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAndRun();
    return () => {
      cancelled = true;
    };
  }, [asset, lookback, stopLossPercent, feePercent]);

  if (loading) return;

  const { equitySeries, totalReturn, winRate, avgDuration, maxDrawdown } =
    stats;

  // render simple SVG line chart
  const w = 600;
  const h = 120;
  const min = Math.min(...equitySeries);
  const max = Math.max(...equitySeries);

  const points = equitySeries.map((v, i) => {
    const x = (i / (equitySeries.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  });

  const assetLabel =
    asset === "bitcoin" ? "BTC" : asset === "ethereum" ? "ETH" : "AAPL";

  return (
    <div className="backtest-panel">
      <h3>30-day High Breakout — {assetLabel} (2y)</h3>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        <label>
          Asset:
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            style={{ marginLeft: 6 }}
          >
            <option value="bitcoin">BTC</option>
            <option value="ethereum">ETH</option>
          </select>
          <label>Lookback:</label>
          <input
            type="number"
            min={10}
            max={60}
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value) || 30)}
            style={{ width: 72, marginLeft: 6 }}
          />
          <label>Stop-loss %:</label>
          <input
            type="number"
            min={3}
            max={10}
            step={0.1}
            value={stopLossPercent}
            onChange={(e) => setStopLossPercent(Number(e.target.value) || 5)}
            style={{ width: 72, marginLeft: 6 }}
          />
          <label>Fee %:</label>
          <input
            type="number"
            min={0}
            max={0.2}
            step={0.01}
            value={feePercent}
            onChange={(e) => setFeePercent(Number(e.target.value) || 0)}
            style={{ width: 72, marginLeft: 6 }}
          />
        </label>
      </div>

      {loading ? (
        <div>Loading backtest...</div>
      ) : !stats ? (
        <div>Backtest unavailable</div>
      ) : (
        <svg
          width={w}
          height={h}
          style={{ background: "#0f1720", display: "block", marginBottom: 8 }}
        >
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth={2}
            points={points.join(" ")}
          />
        </svg>
      )}

      <div className="backtest-stats">
        <div>Total return: {(totalReturn * 100).toFixed(1)}%</div>
        <div>Win rate: {(winRate * 100).toFixed(1)}%</div>
        <div>Avg trade duration: {Math.round(avgDuration)} days</div>
        <div>Max drawdown: {(maxDrawdown * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}
