import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine,
} from "recharts";
import {
  generateSyntheticPrices,
  mapCoinGeckoPricesToOHLC,
  calculateIndicator,
} from "../../../../utils/backtest";
import { executeGraphStrategy } from "../../../../utils/graphExecutor";
import "./backtest.scss";

// Custom tooltip for the charts
function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="backtest-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="tooltip-value" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  formatter: PropTypes.func,
};

export default function BacktestView({
  options,
  externalControl: _externalControl = false,
  useSynthetic = false,
}) {
  const [stats, setStats] = useState(null);
  const [storedPrices, setStoredPrices] = useState(null);
  const [visiblePricePoints, setVisiblePricePoints] = useState(0);
  const [visibleEquityPoints, setVisibleEquityPoints] = useState(0);
  const priceAnimationRef = useRef(null);
  const equityAnimationRef = useRef(null);

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
    syntheticRef.current = generateSyntheticPrices(365, 20000);
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

  // Animate chart reveal
  useEffect(() => {
    if (!stats || !storedPrices) return;

    const ANIMATION_DURATION = 1200;

    // Animate price chart
    const animatePrice = (timestamp) => {
      if (!priceAnimationRef.current) {
        priceAnimationRef.current = timestamp;
      }

      const elapsed = timestamp - priceAnimationRef.current;
      const progress = Math.min(1, elapsed / ANIMATION_DURATION);
      const nextCount = Math.round(progress * storedPrices.length);

      setVisiblePricePoints(nextCount);

      if (progress < 1) {
        requestAnimationFrame(animatePrice);
      }
    };

    // Animate equity chart with slight delay
    const animateEquity = (timestamp) => {
      if (!equityAnimationRef.current) {
        equityAnimationRef.current = timestamp;
      }

      const elapsed = timestamp - equityAnimationRef.current;
      const progress = Math.min(1, elapsed / ANIMATION_DURATION);
      const nextCount = Math.round(progress * stats.equitySeries.length);

      setVisibleEquityPoints(nextCount);

      if (progress < 1) {
        requestAnimationFrame(animateEquity);
      }
    };

    // Reset animation refs
    priceAnimationRef.current = null;
    equityAnimationRef.current = null;

    // Start animations
    requestAnimationFrame(animatePrice);
    setTimeout(() => requestAnimationFrame(animateEquity), 200);
  }, [stats, storedPrices]);

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

  // Memoize trades array to prevent unnecessary re-renders
  const trades = useMemo(() => stats?.trades || [], [stats]);

  // Calculate effective window used in backtest
  const maxWindow = useMemo(
    () => Math.max(1, (storedPrices?.length || 1) - 1),
    [storedPrices]
  );
  const effectiveLookback = Math.min(lookback, maxWindow);

  // Calculate indicator for visualization only if connected
  const indicatorType = options?.graph?.indicatorType || "30d_high";
  const indicatorSeries = useMemo(() => {
    if (!isIndicatorConnected || !storedPrices) return null;
    return calculateIndicator(storedPrices, indicatorType, effectiveLookback);
  }, [isIndicatorConnected, storedPrices, indicatorType, effectiveLookback]);

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

  // Prepare chart data for price chart
  const priceChartData = useMemo(() => {
    if (!storedPrices) return [];
    return storedPrices.slice(0, visiblePricePoints).map((p, i) => {
      const dataPoint = {
        index: i,
        time: `Day ${i + 1}`,
        price: Number(p.close),
      };

      // Add indicator if available
      if (indicatorSeries && indicatorSeries[i] != null) {
        dataPoint.indicator = indicatorSeries[i];
      }

      return dataPoint;
    });
  }, [storedPrices, visiblePricePoints, indicatorSeries]);

  // Prepare equity chart data
  const equityChartData = useMemo(() => {
    if (!stats?.equitySeries) return [];
    return stats.equitySeries
      .slice(0, visibleEquityPoints)
      .map((equity, i) => ({
        index: i,
        time: `Day ${i + 1}`,
        equity: Number(equity),
      }));
  }, [stats, visibleEquityPoints]);

  // Prepare trade markers data
  const tradeMarkers = useMemo(() => {
    if (!storedPrices) return { entries: [], exits: [] };
    const entries = [];
    const exits = [];

    trades.forEach((t) => {
      const ei = t.entryIndex;
      const exitI = t.exitIndex;

      if (
        typeof ei === "number" &&
        typeof exitI === "number" &&
        ei >= 0 &&
        ei < storedPrices.length &&
        exitI >= 0 &&
        exitI < storedPrices.length &&
        storedPrices[ei]?.close != null &&
        storedPrices[exitI]?.close != null
      ) {
        entries.push({
          index: ei,
          time: `Day ${ei + 1}`,
          price: Number(storedPrices[ei].close),
        });
        exits.push({
          index: exitI,
          time: `Day ${exitI + 1}`,
          price: Number(storedPrices[exitI].close),
        });
      }
    });

    return { entries, exits };
  }, [trades, storedPrices]);

  // Get min/max for Y-axis domains
  const { priceMin, priceMax, pricePadding } = useMemo(() => {
    if (!storedPrices) return { priceMin: 0, priceMax: 1, pricePadding: 0 };
    const priceValues = storedPrices.map((p) => Number(p.close));
    const indicatorValues = indicatorSeries
      ? indicatorSeries.filter((v) => v != null)
      : [];
    const allPriceValues = [...priceValues, ...indicatorValues];
    const min = Math.min(...allPriceValues);
    const max = Math.max(...allPriceValues);
    const padding = (max - min) * 0.1;
    return { priceMin: min, priceMax: max, pricePadding: padding };
  }, [storedPrices, indicatorSeries]);

  const { equityMin, equityMax, equityPadding } = useMemo(() => {
    if (!stats?.equitySeries)
      return { equityMin: 0, equityMax: 1, equityPadding: 0 };
    const equityValues = stats.equitySeries.map((e) => Number(e));
    const min = Math.min(...equityValues);
    const max = Math.max(...equityValues);
    const padding = (max - min) * 0.1;
    return { equityMin: min, equityMax: max, equityPadding: padding };
  }, [stats]);

  const assetLabel =
    asset === "bitcoin"
      ? "BTC"
      : asset === "ethereum"
      ? "ETH"
      : asset.toUpperCase();

  const formatPrice = useCallback((value) => {
    if (value == null) return "";
    return `€${value.toFixed(0)}`;
  }, []);

  const formatEquity = useCallback((value) => {
    if (value == null) return "";
    // Convert normalized equity (starting at 1.0) to percentage return
    const returnPercent = (value - 1) * 100;
    return `${returnPercent >= 0 ? "+" : ""}${returnPercent.toFixed(1)}%`;
  }, []);

  // Early return after all hooks
  if (!stats || !storedPrices || storedPrices.length === 0) {
    return <div className="backtest-unavailable">Backtest unavailable</div>;
  }

  const { totalReturn, winRate, avgDuration, maxDrawdown } = stats;

  return (
    <div className="backtest-panel">
      <div className="backtest-header">
        <h3>Demo Strategy — {assetLabel} (1y)</h3>
        <div className="backtest-params">
          Parameters: lookback={lookback} (using window={effectiveLookback}),
          stop-loss={stopLossPercent}%, fee={feePercent}%, asset={assetLabel}
        </div>
      </div>

      {/* Price Chart */}
      <div className="backtest-chart-container">
        <div className="chart-title">Price & Indicators</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={priceChartData}
            margin={{ left: 60, right: 30, top: 20, bottom: 40 }}
          >
            <defs>
              <linearGradient id="gridGradient" x1="0" x2="0" y1="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="rgba(148, 163, 184, 0.15)"
                  stopOpacity="0.8"
                />
                <stop
                  offset="100%"
                  stopColor="rgba(148, 163, 184, 0.05)"
                  stopOpacity="0.3"
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="url(#gridGradient)"
              strokeDasharray="3 3"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={{ stroke: "#475569" }}
              interval={Math.floor(storedPrices.length / 8)}
              height={35}
              label={{
                value: "Time",
                position: "insideBottom",
                offset: -10,
                fill: "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <YAxis
              domain={[priceMin - pricePadding, priceMax + pricePadding]}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={{ stroke: "#475569" }}
              tickFormatter={formatPrice}
              width={65}
              label={{
                value: "Price (€)",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <Tooltip
              content={<CustomTooltip formatter={formatPrice} />}
              cursor={{ stroke: "#64748b", strokeWidth: 1 }}
            />

            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              name="Price"
              connectNulls
              isAnimationActive={false}
            />

            {/* Indicator Line */}
            {indicatorSeries && (
              <Line
                type="monotone"
                dataKey="indicator"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                name={indicatorLabel}
                connectNulls
                isAnimationActive={false}
              />
            )}

            {/* Trade entry markers */}
            {tradeMarkers.entries.map((entry, idx) => (
              <ReferenceDot
                key={`entry-${idx}`}
                x={entry.time}
                y={entry.price}
                r={5}
                fill="#10b981"
                stroke="#000"
                strokeWidth={1.5}
                isFront={true}
              />
            ))}

            {/* Trade exit markers */}
            {tradeMarkers.exits.map((exit, idx) => (
              <ReferenceDot
                key={`exit-${idx}`}
                x={exit.time}
                y={exit.price}
                r={5}
                fill="#ef4444"
                stroke="#000"
                strokeWidth={1.5}
                isFront={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Equity Chart */}
      <div className="backtest-chart-container">
        <div className="chart-title">Equity Curve</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={equityChartData}
            margin={{ left: 60, right: 30, top: 20, bottom: 40 }}
          >
            <defs>
              <linearGradient id="equityGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="url(#gridGradient)"
              strokeDasharray="3 3"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={{ stroke: "#475569" }}
              interval={Math.floor(stats.equitySeries.length / 8)}
              height={35}
              label={{
                value: "Time",
                position: "insideBottom",
                offset: -10,
                fill: "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <YAxis
              domain={[equityMin - equityPadding, equityMax + equityPadding]}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={{ stroke: "#475569" }}
              tickFormatter={formatEquity}
              width={65}
              label={{
                value: "Return (%)",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <Tooltip
              content={<CustomTooltip formatter={formatEquity} />}
              cursor={{ stroke: "#64748b", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="Equity"
              fill="url(#equityGradient)"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="backtest-legend">
        <div className="legend-item">
          <span
            className="legend-color"
            style={{ background: "#10b981" }}
          ></span>
          <span>Equity curve</span>
        </div>
        <div className="legend-item">
          <span
            className="legend-color"
            style={{ background: "#60a5fa" }}
          ></span>
          <span>Price</span>
        </div>
        {indicatorSeries && (
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: "#f59e0b" }}
            ></span>
            <span>{`${indicatorLabel} (${effectiveLookback}d)`}</span>
          </div>
        )}
        <div className="legend-item">
          <span
            className="legend-marker"
            style={{ background: "#10b981" }}
          ></span>
          <span>Entry</span>
        </div>
        <div className="legend-item">
          <span
            className="legend-marker"
            style={{ background: "#ef4444" }}
          ></span>
          <span>Exit</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="backtest-stats">
        <div className="backtest-stat-card positive">
          <div className="stat-label">Total Return</div>
          <div className="stat-value">{(totalReturn * 100).toFixed(1)}%</div>
        </div>
        <div className="backtest-stat-card info">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value">{(winRate * 100).toFixed(1)}%</div>
        </div>
        <div className="backtest-stat-card warning">
          <div className="stat-label">Avg Trade Duration</div>
          <div className="stat-value">{Math.round(avgDuration)} days</div>
        </div>
        <div className="backtest-stat-card negative">
          <div className="stat-label">Max Drawdown</div>
          <div className="stat-value">{(maxDrawdown * 100).toFixed(1)}%</div>
        </div>
      </div>

      {options?.graph && (
        <div className="backtest-strategy-info">
          <div className="strategy-description">
            <strong>Strategy:</strong> If close &gt; {lookback}-day high then{" "}
            {options.graph.actions?.firstIfTrue || "buy"}, else if close &lt;
            entry * (1 - {stopLossPercent}%) then{" "}
            {options.graph.actions?.secondIfTrue || "sell"}.
          </div>
        </div>
      )}
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
