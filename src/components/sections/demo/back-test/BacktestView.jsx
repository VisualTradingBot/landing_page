import { useEffect, useRef, useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
  generateSyntheticPrices,
  mapCoinGeckoPricesToOHLC,
  calculateIndicator,
} from "../../../../utils/backtest";
import { executeGraphStrategy } from "../../../../utils/graphExecutor";

export default function BacktestView({
  options,
  externalControl: _externalControl = false,
  useSynthetic = false,
}) {
  const [stats, setStats] = useState(null);
  const [storedPrices, setStoredPrices] = useState(null);

  const asset = options?.asset ?? "bitcoin";
  const lookback = options?.lookback ?? 30;
  const feePercent = options?.feePercent ?? 0.05;

  // Extract stop-loss from graph nodes (for visualization only)
  const stopLossPercent = useMemo(() => {
    if (!options?.nodes) return 5;
    const ifNodes = options.nodes.filter((n) => n.type === "ifNode");
    for (const ifNode of ifNodes) {
      const vars = ifNode.data?.variables || [];
      const rightVar = vars[1];
      const stopLossValue = rightVar?.parameterData?.value;
      if (
        typeof stopLossValue === "string" &&
        stopLossValue.includes("entry") &&
        stopLossValue.includes("*")
      ) {
        const match = stopLossValue.match(/entry\s*\*\s*([0-9.]+)/);
        if (match && match[1]) {
          const multiplier = parseFloat(match[1]);
          return parseFloat(((1 - multiplier) * 100).toFixed(2));
        }
      }
    }
    return 5;
  }, [options]);

  const syntheticRef = useRef(null);
  if (syntheticRef.current === null) {
    syntheticRef.current = generateSyntheticPrices(365 * 2, 20000);
  }

  useEffect(() => {
    let mounted = true;
    async function initPrices() {
      if (useSynthetic) {
        setStoredPrices(syntheticRef.current);
        return;
      }

      let url = `https://api.coingecko.com/api/v3/coins/${asset}/market_chart?vs_currency=eur&days=365&interval=daily`;

      const fetchOptions = {
        method: "GET",
        headers: { "x-cg-demo-api-key": "CG-QimdPsyLSKFzBLJHXU2TtZ4w" },
      };

      try {
        const response = await fetch(url, fetchOptions);
        if (response && response.ok) {
          const data = await response.json();
          const mapped = mapCoinGeckoPricesToOHLC(data.prices || []);
          if (Array.isArray(mapped) && mapped.length > 0) {
            setStoredPrices(mapped);
            return;
          }
        } else {
          console.warn(
            "CoinGecko response not ok, status=",
            response && response.status
          );
        }
      } catch (error) {
        console.error("Error fetching prices:", error);
      }

      if (mounted) setStoredPrices(syntheticRef.current);
    }

    initPrices();

    return () => {
      mounted = false;
    };
  }, [asset, useSynthetic]);

  // Re-run backtest whenever storedPrices or parameters change
  useEffect(() => {
    if (!storedPrices || storedPrices.length === 0) {
      setStats(null);
      return;
    }

    // Use graph-based executor
    const result = executeGraphStrategy(
      storedPrices,
      options.nodes,
      options.edges,
      {
        feePercent,
      }
    );
    setStats(result);
  }, [storedPrices, feePercent, options]);

  // Check if indicator is connected to the graph (reachable from Input)
  const isIndicatorConnected = useMemo(() => {
    if (!options?.nodes || !options?.edges) return false;

    const inputNode = options.nodes.find((n) => n.type === "inputNode");
    const indicatorNode = options.nodes.find((n) => n.type === "indicatorNode");

    if (!inputNode || !indicatorNode) return false;

    // Build reachability from input
    const reachable = new Set();
    const queue = [inputNode.id];
    const edgeMap = new Map();

    options.edges.forEach((e) => {
      if (!edgeMap.has(e.source)) edgeMap.set(e.source, []);
      edgeMap.get(e.source).push(e.target);
    });

    while (queue.length > 0) {
      const current = queue.shift();
      if (reachable.has(current)) continue;
      reachable.add(current);

      const neighbors = edgeMap.get(current) || [];
      neighbors.forEach((n) => queue.push(n));
    }

    return reachable.has(indicatorNode.id);
  }, [options]);

  if (!stats || !storedPrices || storedPrices.length === 0)
    return <div>Backtest unavailable</div>;

  const { equitySeries, totalReturn, winRate, avgDuration, maxDrawdown } =
    stats;
  const trades = stats.trades || [];

  // Calculate effective window used in backtest
  const maxWindow = Math.max(1, storedPrices.length - 1);
  const effectiveLookback = Math.min(lookback, maxWindow);

  const w = 720;
  const priceH = 180;
  const equityH = 120;
  const gapV = 10;

  // Compute indicator for visualization only if connected
  const indicatorType = options?.graph?.indicatorType || "30d_high";
  const indicatorSeries = isIndicatorConnected
    ? calculateIndicator(storedPrices, indicatorType, effectiveLookback)
    : null;

  // For backwards compatibility, also reference as highestSeries
  const highestSeries = indicatorSeries;

  // Get display name for indicator
  const indicatorDisplayNames = {
    "30d_high": "Rolling High",
    "30d_low": "Rolling Low",
    sma: "SMA",
    ema: "EMA",
    rsi: "RSI",
    bollinger_upper: "Bollinger Upper",
    bollinger_lower: "Bollinger Lower",
    atr: "ATR",
  };
  const indicatorLabel = indicatorDisplayNames[indicatorType] || "Indicator";

  const priceValues = storedPrices
    .map((p) => Number(p.close))
    .filter((v) => typeof v === "number" && !Number.isNaN(v));
  const highOverlayVals = highestSeries
    ? highestSeries.filter((v) => v != null)
    : [];

  const priceMin = Math.min(
    ...priceValues,
    ...(highOverlayVals.length ? highOverlayVals : [])
  );
  const priceMax = Math.max(
    ...priceValues,
    ...(highOverlayVals.length ? highOverlayVals : [])
  );
  const priceSpan = priceMax - priceMin || 1;

  const pricePoints = storedPrices.map((p, i) => {
    const x = (i / (storedPrices.length - 1)) * w;
    const y = priceH - ((p.close - priceMin) / priceSpan) * priceH;
    return `${x},${y}`;
  });

  const highPoints = highestSeries
    ? highestSeries
        .map((v, i) =>
          v == null
            ? null
            : {
                x: (i / (storedPrices.length - 1)) * w,
                y: priceH - ((v - priceMin) / priceSpan) * priceH,
              }
        )
        .filter(Boolean)
        .map((pt) => `${pt.x},${pt.y}`)
    : [];

  // --- START OF CHANGES ---
  // 4. Stop-loss line visualization now correctly uses the stopLossPercent from props.
  const stopLossMultiplierVis = 1 - stopLossPercent / 100;
  // --- END OF CHANGES ---
  const stopLineSegments = trades
    .map((t, idx) => {
      const entryIdx = t.entryIndex;
      const exitIdx = t.exitIndex;
      if (
        typeof entryIdx !== "number" ||
        typeof exitIdx !== "number" ||
        t.entryPrice == null ||
        entryIdx < 0 ||
        exitIdx >= storedPrices.length
      )
        return null;
      const stop = t.entryPrice * stopLossMultiplierVis;
      const pts = [];
      for (let i = entryIdx; i <= exitIdx; i++) {
        const x = (i / (storedPrices.length - 1)) * w;
        const y = priceH - ((stop - priceMin) / priceSpan) * priceH;
        pts.push(`${x},${y}`);
      }
      return { key: `stop-${idx}`, points: pts.join(" ") };
    })
    .filter(Boolean);

  const eqMin = equitySeries.length > 0 ? Math.min(...equitySeries) : 0;
  const eqMax = equitySeries.length > 0 ? Math.max(...equitySeries) : 1;
  const eqSpan = eqMax - eqMin || 1;
  const equityPoints = equitySeries.map((v, i) => {
    const x = (i / (equitySeries.length - 1)) * w;
    const y = equityH - ((v - eqMin) / eqSpan) * equityH;
    return `${x},${y}`;
  });

  var assetLabel =
    asset === "bitcoin"
      ? "BTC"
      : asset === "ethereum"
      ? "ETH"
      : asset.toUpperCase();

  return (
    <div className="backtest-panel">
      <h3>30-day High Breakout — {assetLabel} (1y)</h3>

      {/* Price pane */}
      <svg
        width={w}
        height={priceH}
        style={{ background: "#0b1220", display: "block", marginBottom: gapV }}
      >
        {/* Y-axis label (Price) */}
        <text x={10} y={15} fill="#94a3b8" fontSize={11} fontWeight="600">
          Price (€)
        </text>
        {/* Y-axis values */}
        <text x={5} y={25} fill="#64748b" fontSize={9}>
          {priceMax.toFixed(0)}
        </text>
        <text x={5} y={priceH - 5} fill="#64748b" fontSize={9}>
          {priceMin.toFixed(0)}
        </text>

        {/* X-axis label (Time) */}
        <text
          x={w - 35}
          y={priceH - 5}
          fill="#94a3b8"
          fontSize={11}
          fontWeight="600"
        >
          Time
        </text>

        <polyline
          fill="none"
          stroke="#60a5fa"
          strokeWidth={1.5}
          points={pricePoints.join(" ")}
        />
        {highPoints.length > 1 && (
          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1}
            points={highPoints.join(" ")}
          />
        )}
        {stopLineSegments.map((seg) => (
          <polyline
            key={seg.key}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 3"
            points={seg.points}
          />
        ))}
        {trades.map((t, idx) => {
          const ei = t.entryIndex;
          const exitI = t.exitIndex;
          // Add bounds checking and null safety
          if (
            typeof ei !== "number" ||
            typeof exitI !== "number" ||
            ei < 0 ||
            ei >= storedPrices.length ||
            exitI < 0 ||
            exitI >= storedPrices.length ||
            !storedPrices[ei] ||
            !storedPrices[exitI] ||
            storedPrices[ei].close == null ||
            storedPrices[exitI].close == null
          ) {
            return null;
          }

          const xi = (ei / (storedPrices.length - 1)) * w;
          const yi =
            priceH - ((storedPrices[ei].close - priceMin) / priceSpan) * priceH;
          const xe = (exitI / (storedPrices.length - 1)) * w;
          const ye =
            priceH -
            ((storedPrices[exitI].close - priceMin) / priceSpan) * priceH;
          return (
            <g key={`price-mark-${idx}`}>
              <circle cx={xi} cy={yi} r={3.5} fill="#10b981" stroke="#000" />
              <circle cx={xe} cy={ye} r={3.5} fill="#ef4444" stroke="#000" />
            </g>
          );
        })}
      </svg>

      {/* Equity pane */}
      <svg
        width={w}
        height={equityH}
        style={{ background: "#0f1720", display: "block", marginBottom: 8 }}
      >
        {/* Y-axis label (Equity) */}
        <text x={10} y={15} fill="#94a3b8" fontSize={11} fontWeight="600">
          Equity (€)
        </text>
        {/* Y-axis values */}
        <text x={5} y={25} fill="#64748b" fontSize={9}>
          {eqMax.toFixed(0)}
        </text>
        <text x={5} y={equityH - 5} fill="#64748b" fontSize={9}>
          {eqMin.toFixed(0)}
        </text>

        {/* X-axis label (Time) */}
        <text
          x={w - 35}
          y={equityH - 5}
          fill="#94a3b8"
          fontSize={11}
          fontWeight="600"
        >
          Time
        </text>

        <polyline
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          points={equityPoints.join(" ")}
        />
      </svg>

      <div className="backtest-stats">
        <div>
          <strong>Parameters</strong>: lookback={lookback} (using window=
          {effectiveLookback}) stop-loss={stopLossPercent}% fee={feePercent}%
          asset={assetLabel}
          {options?.graph && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Strategy: If close &gt; {lookback}-day high then{" "}
                {options.graph.actions?.firstIfTrue || "buy"}, else if close
                &lt; entry * (1 - {stopLossPercent}%) then{" "}
                {options.graph.actions?.secondIfTrue || "sell"}.
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: "#10b981",
                      borderRadius: 2,
                      display: "inline-block",
                    }}
                  ></span>
                  Equity curve (bottom)
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: "#60a5fa",
                      borderRadius: 2,
                      display: "inline-block",
                    }}
                  ></span>
                  Price (top)
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: "#f59e0b",
                      borderRadius: 2,
                      display: "inline-block",
                    }}
                  ></span>
                  {`${indicatorLabel} (${effectiveLookback}d)`}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: "#ef4444",
                      borderRadius: 2,
                      display: "inline-block",
                    }}
                  ></span>
                  Stop-loss level (during trades)
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: "#10b981",
                      borderRadius: 12,
                      display: "inline-block",
                    }}
                  ></span>
                  Entry
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      background: "#ef4444",
                      borderRadius: 12,
                      display: "inline-block",
                    }}
                  ></span>
                  Exit
                </span>
              </div>
            </div>
          )}
        </div>
        <div>Total return: {(totalReturn * 100).toFixed(1)}%</div>
        <div>Win rate: {(winRate * 100).toFixed(1)}%</div>
        <div>Avg trade duration: {Math.round(avgDuration)} days</div>
        <div>Max drawdown: {(maxDrawdown * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}

BacktestView.propTypes = {
  options: PropTypes.shape({
    asset: PropTypes.string,
    lookback: PropTypes.number,
    feePercent: PropTypes.number,
    graph: PropTypes.object,
    nodes: PropTypes.array,
    edges: PropTypes.array,
  }),
  externalControl: PropTypes.bool,
  useSynthetic: PropTypes.bool,
};
