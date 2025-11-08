/* eslint-disable react/prop-types */
import {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  useTransition,
} from "react";
import PropTypes from "prop-types";
// BacktestView: Visualizes the results of a trading strategy backtest, including price, indicators, equity curve, and trade statistics.
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts";

import { mapCoinGeckoPricesToOHLC } from "../../../../utils/indicators";

import CustomTooltip from "./CustomTooltip/CustomTooltip.jsx";

import "./backtest.scss";

import BacktestWorker from "../../../../workers/backtest.worker.js?worker";

const priceCache = new Map();

const MAX_FETCH_CONFIG = {
  "1d": { days: 365, interval: "daily" },
  "1h": { days: 90, interval: "hourly" },
};

const DEFAULT_WINDOW_BY_RESOLUTION = {
  "1d": 180,
  "1h": 48,
};

const COINGECKO_HEADERS = {
  "x-cg-demo-api-key": "CG-QimdPsyLSKFzBLJHXU2TtZ4w",
};

function buildPriceKey(opts) {
  if (!opts) return null;
  const assetKey = opts.asset ?? "bitcoin";
  const resolutionKey = opts.dataResolution ?? "1d";
  return `${assetKey}|${resolutionKey}`;
}

export default function BacktestView({
  options,
  onRegisterRunHandler,
  onRunStateChange,
}) {
  // === State for backtest and chart animation ===
  const [stats, setStats] = useState(null); // Backtest statistics and equity series
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [workerNotice, setWorkerNotice] = useState(null); // non-fatal errors/warnings from worker
  const [progress, setProgress] = useState(0); // 0..1 progress for worker
  const workerRef = useRef(null);
  const runInProgressRef = useRef(false); // prevents duplicate posts to worker
  const [storedPrices, setStoredPrices] = useState(null); // Price data (real or synthetic)
  const priceKeyRef = useRef(null); // Tracks which option set the current prices belong to
  const [visiblePricePoints, setVisiblePricePoints] = useState(0); // Animated price chart points
  const [visibleEquityPoints, setVisibleEquityPoints] = useState(0); // Animated equity chart points
  const priceAnimationRef = useRef(null);
  const equityAnimationRef = useRef(null);
  const [, startTransition] = useTransition();
  const [activeOptions, setActiveOptions] = useState(options);
  const optionsInitializedRef = useRef(false);
  const pendingRunRef = useRef(null);

  const cryptoFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 6,
      }),
    []
  );

  const profitFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    []
  );

  useEffect(() => {
    if (optionsInitializedRef.current) return;
    if (!options) return;
    setActiveOptions(options);
    pendingRunRef.current = options;
    optionsInitializedRef.current = true;
    setIsLoading(true);
    setProgress(0);
    setError(null);
    setVisiblePricePoints(0);
    setVisibleEquityPoints(0);
    setWorkerNotice(null);
  }, [options]);

  // === Backtest options ===
  const asset = activeOptions?.asset ?? "bitcoin";
  const assetSymbol =
    asset === "bitcoin"
      ? "BTC"
      : asset === "ethereum"
      ? "ETH"
      : asset.toUpperCase();
  const dataResolution = activeOptions?.dataResolution ?? "1d";
  // rely on Demo to provide the canonical lookback; if absent, treat as undefined
  const lookback = activeOptions?.lookback ?? 30;
  const feePercent = activeOptions?.feePercent ?? 0.05;

  const xAxisUnitLabel = useMemo(() => {
    switch (dataResolution) {
      case "1h":
        return "Hours";
      default:
        return "Days";
    }
  }, [dataResolution]);

  // === Extract stop-loss from graph nodes (for visualization only) ===
  // Looks for an 'ifNode' with a right-side variable like 'entry * 0.95' to infer stop-loss percent
  const stopLossPercent = useMemo(() => {
    if (!activeOptions?.nodes) return 5;
    const ifNodes = activeOptions.nodes.filter((n) => n.type === "ifNode");
    for (const ifNode of ifNodes) {
      const vars = ifNode.data?.variables || [];
      const rightVar = vars[1];
      // Prefer parameterId resolution (keeps in sync with ParameterBlock). Fall back to legacy parameterData.value
      let stopLossValue = null;
      const pd = rightVar?.parameterData;
      if (pd && pd.parameterId) {
        // Resolve by scanning node-attached parameters (Demo attaches parameters to each node.data.parameters)
        let resolved = null;
        for (const n of activeOptions.nodes) {
          const params = n?.data?.parameters;
          if (!Array.isArray(params)) continue;
          const match = params.find(
            (p) => p.id === pd.parameterId || p.label === pd.label
          );
          if (match) {
            resolved = match;
            break;
          }
        }
        stopLossValue = resolved?.value ?? pd.value;
      } else {
        stopLossValue = pd?.value ?? rightVar?.value ?? null;
      }
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
  }, [activeOptions]);

  // Debug: Log resolved stop-loss percent
  const runSimulationWithOptions = useCallback((runOptions, priceSeries) => {
    if (!workerRef.current || !priceSeries?.length) return;

    pendingRunRef.current = null;

    const numericFee = Number(runOptions?.feePercent);
    const feeForRun = Number.isFinite(numericFee) ? numericFee : 0.05;

    setIsLoading(true);
    setProgress(0);
    setError(null);
    setVisiblePricePoints(0);
    setVisibleEquityPoints(0);
    setWorkerNotice(null);
    runInProgressRef.current = true;

      workerRef.current.postMessage({
        nodes: runOptions.nodes,
        edges: runOptions.edges,
        parameters: runOptions.parameters,
        prices: priceSeries,
        feePercent: feeForRun,
      });
  }, []);

  const resolveFetchConfig = useCallback((resolution, requestedWindow) => {
    const config = MAX_FETCH_CONFIG[resolution] || MAX_FETCH_CONFIG["1d"];
    const defaultWindow = DEFAULT_WINDOW_BY_RESOLUTION[resolution] ?? 180;
    const windowSize =
      Number.isFinite(requestedWindow) && requestedWindow > 0
        ? Math.min(
            requestedWindow,
            config.days * (resolution === "1h" ? 24 : 1)
          )
        : defaultWindow;

    const daysParam =
      resolution === "1h"
        ? Math.max(1, Math.ceil(windowSize / 24))
        : Math.max(1, Math.round(windowSize));

    return {
      days: Math.min(config.days, daysParam),
      interval: config.interval,
      windowSize,
    };
  }, []);

  const fetchCoinGeckoPrices = useCallback(
    async (assetId, resolution, windowSize) => {
      const { days, interval } = resolveFetchConfig(resolution, windowSize);
      const searchParams = new URLSearchParams({
        vs_currency: "eur",
        days: String(days),
        interval,
      });

      const url = `https://api.coingecko.com/api/v3/coins/${assetId}/market_chart?${searchParams.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: COINGECKO_HEADERS,
      });

      if (!response.ok) {
        throw new Error(
          `CoinGecko request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const mapped = mapCoinGeckoPricesToOHLC(data.prices || []);
      if (!Array.isArray(mapped) || !mapped.length) {
        throw new Error("CoinGecko returned empty price data");
      }
      return mapped;
    },
    [resolveFetchConfig]
  );

  const getCachedPrices = useCallback(
    async (assetId, resolution, windowSize) => {
      const cacheKey = `${assetId}|${resolution}`;
      const cached = priceCache.get(cacheKey);
      if (cached && cached.length) {
        return cached;
      }

      const fresh = await fetchCoinGeckoPrices(assetId, resolution, windowSize);
      priceCache.set(cacheKey, fresh);
      return fresh;
    },
    [fetchCoinGeckoPrices]
  );

  const resolveWindowSpec = useCallback(
    (opts) => {
      if (!opts) {
        return null;
      }
      const baseKey = buildPriceKey(opts);
      const resolution = opts.dataResolution ?? "1d";
      const rawWindow = Number(opts.historyWindow);
      const { windowSize } = resolveFetchConfig(resolution, rawWindow);
      const normalizedWindow = Math.max(1, Math.round(windowSize));

      return {
        baseKey,
        windowKey: `${baseKey}|${normalizedWindow}`,
        windowSize,
        normalizedWindow,
        asset: opts.asset ?? "bitcoin",
        resolution,
      };
    },
    [resolveFetchConfig]
  );

  // === Fetch price data (CoinGecko with caching) ===
  useEffect(() => {
    if (!activeOptions) return;

    const spec = resolveWindowSpec(activeOptions);
    if (!spec) return;

    const { windowKey, windowSize, normalizedWindow, asset: targetAsset, resolution } =
      spec;

    if (
      priceKeyRef.current === windowKey &&
      storedPrices?.length === normalizedWindow
    ) {
      return;
    }

    let cancelled = false;

    async function ensurePrices() {
      try {
        const series = await getCachedPrices(targetAsset, resolution, windowSize);
        if (cancelled) return;
        priceKeyRef.current = windowKey;
        const limited = series.slice(-Math.min(series.length, normalizedWindow));
        setStoredPrices(limited);
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching prices:", error);
          setError("Failed to load price data. Please try again later.");
        }
      }
    }

    ensurePrices();

    return () => {
      cancelled = true;
    };
  }, [activeOptions, storedPrices, resolveWindowSpec, getCachedPrices]);

  useEffect(() => {
    if (!storedPrices || !storedPrices.length) return;
    if (!pendingRunRef.current) return;

    const runOptions = pendingRunRef.current;
    const runSpec = resolveWindowSpec(runOptions);
    if (!runSpec) {
      return;
    }
    if (priceKeyRef.current !== runSpec.windowKey) {
      return;
    }

    pendingRunRef.current = null;
    runSimulationWithOptions(runOptions, storedPrices);
  }, [storedPrices, runSimulationWithOptions, resolveWindowSpec]);

  // Ensure we display the price/indicator plot once prices load even before a backtest run
  useEffect(() => {
    if (storedPrices && storedPrices.length > 0 && visiblePricePoints === 0) {
      // show full series by default so indicator curves are visible
      setVisiblePricePoints(storedPrices.length);
    }
  }, [storedPrices, visiblePricePoints]);

  // === Setup Web Worker ===
  useEffect(() => {
    // Create a new worker instance when the component mounts.
    const worker = new BacktestWorker();
    workerRef.current = worker;

    // Define what to do when a message is received from the worker.
    worker.onmessage = (event) => {
      const { status, data } = event.data;
      if (status === "complete") {
        runInProgressRef.current = false;
        setProgress(1);
        // If worker returned errors/warnings as part of 'complete', surface them as non-fatal notices
        if (data?.errors || data?.error) {
          setWorkerNotice({
            type: "error",
            messages: data.errors || [data.error],
          });
          setIsLoading(false);
          return;
        }
        if (data?.warnings) {
          setWorkerNotice({ type: "warning", messages: data.warnings });
        } else {
          setWorkerNotice(null);
        }
        startTransition(() => {
          setStats(data);
          setIsLoading(false);
          if (typeof onRunStateChange === "function") {
            onRunStateChange({
              isLoading: false,
              progress: 1,
              hasStats: true,
              hasPrices: Boolean(storedPrices && storedPrices.length > 0),
              completed: true,
            });
          }
        });
      } else if (status === "error") {
        runInProgressRef.current = false;
        // Non-fatal: show notice but don't unmount the UI
        setWorkerNotice({ type: "error", messages: [data] });
        setIsLoading(false); // Stop loading
      } else if (status === "progress") {
        // update progress indicator (worker may send { progress: 0..1 } )
        const p = data?.progress ?? data?.percent ?? 0;
        setProgress(typeof p === "number" ? p : 0);
        // we intentionally do not clear runInProgressRef until 'complete' or 'error'
      }
    };

    // Cleanup: Terminate the worker when the component unmounts.
    return () => {
      worker.terminate();
    };
  }, []); // Empty dependency array ensures this runs only once.

  // === The function to trigger the backtest ===
  const handleRunBacktest = useCallback(() => {
    if (!workerRef.current || runInProgressRef.current) {
      return;
    }

    const nextOptions = options;
    if (!nextOptions) return;

    const nextSpec = resolveWindowSpec(nextOptions);
    const nextKey = nextSpec?.windowKey;
    const hasPricesForRun =
      storedPrices &&
      storedPrices.length > 0 &&
      priceKeyRef.current === nextKey &&
      storedPrices.length === (nextSpec?.normalizedWindow ?? storedPrices.length);

    pendingRunRef.current = nextOptions;
    setActiveOptions(nextOptions);

    if (hasPricesForRun) {
      runSimulationWithOptions(nextOptions, storedPrices);
    } else {
      setIsLoading(true);
      setProgress(0);
      setError(null);
      setVisiblePricePoints(0);
      setVisibleEquityPoints(0);
      setWorkerNotice(null);
    }
  }, [options, storedPrices, runSimulationWithOptions, resolveWindowSpec]);

  useEffect(() => {
    if (typeof onRegisterRunHandler === "function") {
      onRegisterRunHandler(handleRunBacktest);
      return () => onRegisterRunHandler(null);
    }
    return undefined;
  }, [handleRunBacktest, onRegisterRunHandler]);

  useEffect(() => {
    if (typeof onRunStateChange === "function") {
      onRunStateChange({
        isLoading,
        progress,
        hasStats: Boolean(stats),
        hasPrices: Boolean(storedPrices && storedPrices.length > 0),
      });
    }
  }, [isLoading, progress, stats, storedPrices, onRunStateChange]);

  // === Animate chart reveal for price and equity ===
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

  // Memoize trades array to prevent unnecessary re-renders
  const trades = useMemo(() => stats?.trades || [], [stats]);

  // Calculate effective window used in backtest
  const maxWindow = useMemo(
    () => Math.max(1, (storedPrices?.length || 1) - 1),
    [storedPrices]
  );
  // If lookback is not provided by Demo, fall back to maxWindow (visualization)
  const numericLookback =
    lookback != null && !Number.isNaN(Number(lookback))
      ? Number(lookback)
      : undefined;

  const effectiveLookback = Math.min(numericLookback ?? maxWindow, maxWindow);

  // Calculate indicator for visualization only if connected
  // Derive indicator type from the inputIndicatorNode (fallback to 30d_high)
  const indicatorType = useMemo(() => {
    const inputIndicator = activeOptions?.nodes?.find(
      (n) => n.type === "inputIndicatorNode"
    );
    const raw = inputIndicator?.data?.indicator;
    if (!raw) return "30d_high";
    // Normalize a few legacy/display values to internal ids
    const map = {
      SMA: "sma",
      EMA: "ema",
      RSI: "rsi",
      ATR: "atr",
      rolling_high: "30d_high",
      rolling_low: "30d_low",
      rollingHigh: "30d_high",
      rollingLow: "30d_low",
    };
    return map[raw] || String(raw).toLowerCase();
  }, [activeOptions?.nodes]);

  // Get the indicator series from the *simulation results* (the worker).
  // This ensures the chart *always* matches the simulation.
  const indicatorSeries = useMemo(() => {
    if (!stats?.dataSeries) return null;

    // Find the output name of the indicator (e.g., "indicator_output")
    // This is the key used in the dataSeries map.
    const inputIndicator = activeOptions?.nodes?.find(
      (n) => n.type === "inputIndicatorNode"
    );
    const indicatorName = inputIndicator?.data?.outputParamName;

    if (!indicatorName) return null;

    return stats.dataSeries[indicatorName] || null;
  }, [stats, activeOptions?.nodes]);

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
  // Quick lookup maps for marking price points with entry/exit/profit flags
  const tradeIndexMaps = useMemo(() => {
    const entrySet = new Set();
    const entryMeta = new Map();
    const exitMap = new Map(); // exitIndex -> { profit: boolean|null, profitValue: number|null }
    if (Array.isArray(trades) && storedPrices) {
      for (const t of trades) {
        const ei = t.entryIndex;
        const xi = t.exitIndex;
        if (typeof ei === "number") {
          entrySet.add(ei);
          const quantity = Number.isFinite(t.quantity) ? t.quantity : null;
          entryMeta.set(ei, { quantity });
        }
        if (typeof xi === "number") {
          let profitValue = Number.isFinite(t.profit) ? t.profit : null;
          let profitFlag = profitValue != null ? profitValue > 0 : null;

          if (profitValue == null) {
            try {
              const entryPrice =
                typeof ei === "number" && storedPrices[ei]?.live_price != null
                  ? Number(storedPrices[ei].live_price)
                  : null;
              const exitPrice =
                storedPrices[xi]?.live_price != null
                  ? Number(storedPrices[xi].live_price)
                  : null;
              if (entryPrice != null && exitPrice != null) {
                profitFlag = exitPrice - entryPrice > 0;
              }
            } catch {
              profitFlag = null;
            }
          }

          exitMap.set(xi, { profit: profitFlag, profitValue });
        }
      }
    }
    return { entrySet, entryMeta, exitMap };
  }, [trades, storedPrices]);

  // Prepare chart data for price chart
  const priceChartData = useMemo(() => {
    if (!storedPrices) return [];
    return storedPrices.slice(0, visiblePricePoints).map((p, i) => {
      const dataPoint = {
        index: i,
        time: i + 1, // day number (numeric)
        price: Number(p.live_price),
      };

      // Add indicator if available
      if (indicatorSeries && indicatorSeries[i] != null) {
        dataPoint.indicator = indicatorSeries[i];
        // also expose as "inputIndicator" for a dedicated plotted curve
        dataPoint.inputIndicator = indicatorSeries[i];
      }

      // annotate entry/exit flags using tradeIndexMaps
      if (tradeIndexMaps) {
        dataPoint.isEntry = tradeIndexMaps.entrySet.has(i);
        if (dataPoint.isEntry) {
          const entryDetails = tradeIndexMaps.entryMeta.get(i);
          if (entryDetails?.quantity != null) {
            dataPoint.entryQuantity = entryDetails.quantity;
            dataPoint.assetSymbol = assetSymbol;
            dataPoint.entryDisplay = `Entry: ${cryptoFormatter.format(
              entryDetails.quantity
            )}${assetSymbol}`;
          } else {
            dataPoint.entryDisplay = "Entry";
          }
        }
        const exitMeta = tradeIndexMaps.exitMap.get(i);
        if (exitMeta) {
          dataPoint.isExit = true;
          dataPoint.exitProfit = !!exitMeta.profit;
          dataPoint.exitProfitValue = exitMeta.profitValue ?? null;
          if (exitMeta.profitValue != null) {
            const formatted = profitFormatter.format(
              Math.abs(exitMeta.profitValue)
            );
            const sign = exitMeta.profitValue >= 0 ? "" : "-";
            const prefix = exitMeta.profit ? "Profit" : "Loss";
            dataPoint.exitDisplay = `${prefix}: ${sign}${formatted}€`;
          } else {
            dataPoint.exitDisplay = exitMeta.profit ? "Profit" : "Loss";
          }
        } else {
          dataPoint.isExit = false;
        }
      }

      return dataPoint;
    });
  }, [
    storedPrices,
    visiblePricePoints,
    indicatorSeries,
    tradeIndexMaps,
    assetSymbol,
    cryptoFormatter,
    profitFormatter,
  ]);

  // Prepare equity chart data
  const equityChartData = useMemo(() => {
    if (!stats?.equitySeries) return [];
    return stats.equitySeries
      .slice(0, visibleEquityPoints)
      .map((equity, i) => ({
        index: i,
        time: i + 1,
        equity: Number(equity),
      }));
  }, [stats, visibleEquityPoints]);

  // Prepare trade markers data for chart (entry/exit triangles)
  const tradeMarkers = useMemo(() => {
    if (!storedPrices) return { entries: [], exits: [] };
    const entries = [];
    const exits = [];

    trades.forEach((t) => {
      const ei = t.entryIndex;
      const exitI = t.exitIndex;
      if (
        typeof ei === "number" &&
        ei >= 0 &&
        ei < storedPrices.length &&
        storedPrices[ei]?.live_price != null
      ) {
        entries.push({
          index: ei,
          time: ei + 1,
          price: Number(storedPrices[ei].live_price),
        });
      }

      if (
        typeof exitI === "number" &&
        exitI >= 0 &&
        exitI < storedPrices.length &&
        storedPrices[exitI]?.live_price != null
      ) {
        const exitPrice = Number(storedPrices[exitI].live_price);
        let profitFlag = null;
        if (Number.isFinite(t.profit)) {
          profitFlag = t.profit > 0;
        } else if (typeof ei === "number") {
          const entryPrice =
            storedPrices[ei]?.live_price != null
              ? Number(storedPrices[ei].live_price)
              : null;
          if (entryPrice != null) {
            profitFlag = exitPrice - entryPrice > 0;
          }
        }
        exits.push({
          index: exitI,
          time: exitI + 1,
          price: exitPrice,
          profit: profitFlag,
        });
      }
    });

    return { entries, exits };
  }, [trades, storedPrices]);

  // Get min/max for Y-axis domains (with padding)
  const { priceMin, priceMax, pricePadding } = useMemo(() => {
    if (!storedPrices) return { priceMin: 0, priceMax: 1, pricePadding: 0 };
    const priceValues = storedPrices.map((p) => Number(p.live_price));
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

  // Asset label for display
  const assetLabel = assetSymbol;

  // Formatters for chart axes and tooltips
  const formatPrice = useCallback((value) => {
    if (value == null) return "";
    return `€${value.toFixed(0)}`;
  }, []);

  // Assumes equity is normalized (1.0 = 0% return)
  const formatEquity = useCallback((value) => {
    if (value == null) return "";
    // Convert normalized equity (starting at 1.0) to percentage return
    const returnPercent = (value - 1) * 100;
    return `${returnPercent >= 0 ? "+" : ""}${returnPercent.toFixed(1)}%`;
  }, []);

  // Render priority:
  // 1) Error, 2) No price data, 3) No stats & not loading (show initial run), 4) Full UI
  if (error) {
    return <div className="backtest-unavailable">Error: {error}</div>;
  }

  if (!storedPrices || storedPrices.length === 0) {
    return <div className="backtest-unavailable">Backtest unavailable</div>;
  }

  // If we have prices but no stats yet and we're not loading, allow manual run
  if (!stats && !isLoading) {
    return (
      <div className="backtest-unavailable backtest-waiting">
        <p>Backtest results will appear here after you run the simulation.</p>
      </div>
    );
  }

  const { totalReturn, winRate, avgDuration, maxDrawdown } = stats || {};

  return (
    <div className="backtest-panel">
      <div className="backtest-header">
        <div
          className="backtest-title-row"
          style={{ alignItems: "center", gap: 12 }}
        >
          <h3>Demo Strategy — {assetLabel} (1y)</h3>
          {/* {(isLoading || (progress > 0 && progress < 1)) && (
            <div className="progress-wrap" style={{ marginLeft: "auto" }}>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>
                {Math.round(progress * 100)}%
              </div>
            </div>
          )} */}
        </div>
        <div className="backtest-params-grid">
          <div className="param-block">
            <div className="param-label">Lookback Window</div>
            <div className="param-value">{effectiveLookback}</div>
          </div>
          <div className="param-block">
            <div className="param-label">Stop Loss</div>
            <div className="param-value">{stopLossPercent}%</div>
          </div>
          <div className="param-block">
            <div className="param-label">Fee</div>
            <div className="param-value">{feePercent}%</div>
          </div>
          <div className="param-block">
            <div className="param-label">Asset</div>
            <div className="param-value">{assetLabel}</div>
          </div>
        </div>
      </div>

      {/* Show non-fatal worker notices (errors / warnings) */}
      {workerNotice && (
        <div className={`worker-notice ${workerNotice.type}`}>
          {Array.isArray(workerNotice.messages) &&
            workerNotice.messages.map((m, i) => (
              <div key={i} className="worker-notice-line">
                {String(m)}
              </div>
            ))}
        </div>
      )}

      {/* Charts Row Container */}
      <div className="backtest-charts-row">
        {/* Price Chart */}
        <div className="backtest-chart-container">
          <div className="chart-title">Price & Indicators</div>
          <div className="chart-legend">
            <div className="legend-item">
              <span
                className="legend-line"
                style={{ background: "#60a5fa" }}
              ></span>
              <span>Price</span>
            </div>

            {indicatorSeries && (
              <div className="legend-item">
                <span
                  className="legend-line"
                  style={{ background: "#f59e0b" }}
                ></span>
                <span>{indicatorLabel}</span>
              </div>
            )}

            <div className="legend-item">
              <span className="legend-triangle-up" style={{ color: "#10b981" }}>
                ▲
              </span>
              <span>Entry</span>
            </div>

            <div className="legend-item">
              <span
                className="legend-triangle-down"
                style={{ color: "#ef4444" }}
              >
                ▼
              </span>
              <span>Exit</span>
            </div>
          </div>
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
                interval={Math.max(1, Math.floor(storedPrices.length / 8))}
                height={35}
                label={{
                  value: xAxisUnitLabel,
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

              {/* Trade entry markers - Green triangles pointing up */}
              {tradeMarkers.entries.map((entry, idx) => (
                <ReferenceDot
                  key={`entry-${idx}`}
                  x={entry.time}
                  y={entry.price}
                  r={0}
                  fill="#10b981"
                  stroke="#000000"
                  strokeWidth={0}
                  isFront={true}
                  shape={(props) => (
                    <g>
                      <polygon
                        points={`${props.cx},${props.cy - 5} ${props.cx - 5},${
                          props.cy + 5
                        } ${props.cx + 5},${props.cy + 5}`}
                        fill="#10b981"
                        stroke="#000000"
                        strokeWidth={1}
                      />
                    </g>
                  )}
                />
              ))}

              {/* Trade exit markers - Red triangles pointing down */}
              {tradeMarkers.exits.map((exit, idx) => (
                <ReferenceDot
                  key={`exit-${idx}`}
                  x={exit.time}
                  y={exit.price}
                  r={0}
                  fill="#ef4444"
                  stroke="#000000"
                  strokeWidth={0}
                  isFront={true}
                  shape={(props) => (
                    <g>
                      <polygon
                        points={`${props.cx},${props.cy + 5} ${props.cx - 5},${
                          props.cy - 5
                        } ${props.cx + 5},${props.cy - 5}`}
                        fill="#ef4444"
                        stroke="#000000"
                        strokeWidth={1}
                      />
                    </g>
                  )}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Equity Chart */}
        <div className="backtest-chart-container">
          <div className="chart-title">Equity Curve</div>
          <div className="chart-legend">
            <div className="legend-item">
              <span
                className="legend-line"
                style={{ background: "#10b981" }}
              ></span>
              <span>Equity</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
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
                interval={Math.max(
                  1,
                  Math.floor((stats?.equitySeries?.length || 1) / 8)
                )}
                height={35}
                label={{
                  value: xAxisUnitLabel,
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
    </div>
  );
}

BacktestView.propTypes = {
  options: PropTypes.object,
  onRegisterRunHandler: PropTypes.func,
  onRunStateChange: PropTypes.func,
};

BacktestView.propTypes = {
  options: PropTypes.shape({
    asset: PropTypes.string,
    lookback: PropTypes.number,
    feePercent: PropTypes.number,
    graph: PropTypes.object,
    nodes: PropTypes.array,
    edges: PropTypes.array,
    parameters: PropTypes.array,
  }),
  externalControl: PropTypes.bool,
};
