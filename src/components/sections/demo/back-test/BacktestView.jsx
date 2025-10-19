import { useEffect, useRef, useState } from "react";
import {
  runBreakoutBacktest,
  generateSyntheticPrices,
  mapCoinGeckoPricesToOHLC,
} from "../../../../utils/backtest";

export default function BacktestView() {
  const [stats, setStats] = useState(null);
  const [asset, setAsset] = useState("bitcoin"); // 'bitcoin' | 'ethereum'
  const [lookback, setLookback] = useState(30);
  const [stopLossPercent, setStopLossPercent] = useState(5);
  const [feePercent, setFeePercent] = useState(0.05);
  const [effectiveLookback, setEffectiveLookback] = useState(lookback);

  // Keep one synthetic series per component mount so it doesn't change when params change
  const syntheticRef = useRef(null);
  if (syntheticRef.current === null) {
    syntheticRef.current = generateSyntheticPrices(365 * 2, 20000); // 2 years daily
  }

  // Store fetched/mapped prices so we only fetch once per asset and manipulate locally
  const [storedPrices, setStoredPrices] = useState(null); // array of {time, close}

  // "https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=eur&days=365&interval=daily";

  useEffect(() => {
    let mounted = true;
    async function fetchPrices() {
      let url = `https://api.coingecko.com/api/v3/coins/${asset}/market_chart?vs_currency=eur&days=365&interval=daily`;

      const options = {
        method: "GET",
        headers: { "x-cg-demo-api-key": "CG-QimdPsyLSKFzBLJHXU2TtZ4w" },
        body: undefined,
      };

      try {
        const response = await fetch(url, options);
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

      // fallback to synthetic data
      if (mounted) setStoredPrices(syntheticRef.current);
    }

    fetchPrices();

    return () => {
      mounted = false;
    };
  }, [asset]);

  // Re-run backtest whenever storedPrices or parameters change
  useEffect(() => {
    if (!storedPrices || storedPrices.length === 0) {
      setStats(null);
      return;
    }

    // If the fetched series is shorter than the requested lookback, reduce the
    // effective window so the backtest can run. We still display the requested
    // lookback in the UI but compute with the max available.

    const maxWindow = Math.max(1, storedPrices.length - 1);
    const effectiveWindow = Math.min(lookback, maxWindow);

    const result = runBreakoutBacktest(storedPrices, {
      window: effectiveWindow,
      stopLossPercent: stopLossPercent,
      feePercent: feePercent,
    });
    setStats(result);
    setEffectiveLookback(effectiveWindow);
  }, [storedPrices, lookback, stopLossPercent, feePercent]);

  if (!stats) return <div>Backtest unavailable</div>;
  const { equitySeries, totalReturn, winRate, avgDuration, maxDrawdown } =
    stats;
  const trades = stats.trades || [];

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

  var assetLabel =
    asset === "bitcoin"
      ? "BTC"
      : asset === "ethereum"
      ? "ETH"
      : asset.toUpperCase();

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

      {!stats ? (
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
          {/* draw trade markers */}
          {trades.map((t, idx) => {
            const ei = t.entryIndex;
            const xi = (ei / (equitySeries.length - 1)) * w;
            const yi = h - ((equitySeries[ei] - min) / (max - min || 1)) * h;
            const exitI = t.exitIndex;
            const xe = (exitI / (equitySeries.length - 1)) * w;
            const ye = h - ((equitySeries[exitI] - min) / (max - min || 1)) * h;
            return (
              <g key={idx}>
                <circle cx={xi} cy={yi} r={4} fill="#10b981" stroke="#000" />
                <circle cx={xe} cy={ye} r={4} fill="#ef4444" stroke="#000" />

                <line
                  x1={xi}
                  y1={yi}
                  x2={xe}
                  y2={ye}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              </g>
            );
          })}
        </svg>
      )}

      <div className="backtest-stats">
        <div>
          <strong>Parameters</strong>: lookback={lookback} (using window=
          {effectiveLookback}) stop-loss={stopLossPercent}% fee={feePercent}%
          asset={assetLabel}
        </div>
        <div>Total return: {(totalReturn * 100).toFixed(1)}%</div>
        <div>Win rate: {(winRate * 100).toFixed(1)}%</div>
        <div>Avg trade duration: {Math.round(avgDuration)} days</div>
        <div>Max drawdown: {(maxDrawdown * 100).toFixed(1)}%</div>
      </div>
    </div>
  );
}
