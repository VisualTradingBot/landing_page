// Simple backtest utilities for a 30-day-high breakout strategy.
// Exports runBreakoutBacktest(prices, options)
// prices: array of { time: number|Date, close: number }

function calcMaxDrawdown(equitySeries) {
  let peak = -Infinity;
  let maxDd = 0;
  for (const v of equitySeries) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export function runBreakoutBacktest(prices, opts = {}) {
  const window = opts.window || 30;
  const stopLossPercent = opts.stopLossPercent ?? 5;
  const stopLossMultiplier = 1 - stopLossPercent / 100;
  const feePercent = opts.feePercent ?? 0;
  const feeFraction = feePercent / 100;

  if (!prices || prices.length <= window) {
    return null;
  }

  const equitySeries = [];

  let cash = 1; // start equity normalized to 1
  let position = 0; // number of units (shares)
  let entryPrice = null;
  let inTrade = false;

  const trades = [];

  for (let i = 0; i < prices.length; i++) {
    const day = prices[i];
    const close = Number(day.close);

    // compute highest of previous `window` closes (exclude current)
    if (i >= window) {
      let highest = -Infinity;
      for (let j = i - window; j < i; j++) {
        if (prices[j].close > highest) highest = prices[j].close;
      }

      // Entry condition: close crosses above previous 30-day high
      if (!inTrade && close > highest) {
        // Buy with all cash, account for fee on entry
        entryPrice = close;
        const cashUsed = cash * (1 - feeFraction);
        position = cashUsed / entryPrice;
        cash = 0;
        inTrade = true;
        trades.push({
          entryIndex: i,
          entryPrice,
          exitIndex: null,
          exitPrice: null,
        });
      }
      // Exit condition (stop-loss): close drops 5% below entry
      else if (inTrade && close < entryPrice * stopLossMultiplier) {
        // Sell everything, account for fee on exit
        const proceeds = position * close * (1 - feeFraction);
        cash = proceeds;
        position = 0;
        inTrade = false;
        const lastTrade = trades[trades.length - 1];
        if (lastTrade && lastTrade.exitIndex == null) {
          lastTrade.exitIndex = i;
          lastTrade.exitPrice = close;
        }
        entryPrice = null;
      }
    }

    // Update equity value for the day
    const equity = inTrade ? position * close : cash;
    equitySeries.push(equity);
  }

  // Close any open position at last price
  if (inTrade && position > 0) {
    const lastClose = prices[prices.length - 1].close;
    const proceeds = position * lastClose * (1 - feeFraction);
    cash = proceeds;
    const lastTrade = trades[trades.length - 1];
    if (lastTrade && lastTrade.exitIndex == null) {
      lastTrade.exitIndex = prices.length - 1;
      lastTrade.exitPrice = lastClose;
    }
    position = 0;
    inTrade = false;
  }

  const totalReturn = cash - 1;

  // compute trade stats
  const closedTrades = trades.filter((t) => t.exitIndex != null);
  let wins = 0;
  let totalDuration = 0;
  for (const t of closedTrades) {
    const pnl = (t.exitPrice - t.entryPrice) / t.entryPrice;
    if (pnl > 0) wins++;
    totalDuration += t.exitIndex - t.entryIndex;
  }
  const winRate = closedTrades.length ? wins / closedTrades.length : 0;
  const avgDuration = closedTrades.length
    ? totalDuration / closedTrades.length
    : 0;

  const peakToTrough = calcMaxDrawdown(equitySeries);

  return {
    equitySeries,
    totalReturn,
    winRate,
    avgDuration,
    trades: closedTrades,
    maxDrawdown: peakToTrough,
  };
}

// Helper to convert coinGecko prices array [[ts, price], ...] to our format
export function mapCoinGeckoPricesToOHLC(prices) {
  if (!Array.isArray(prices)) return [];

  const out = prices
    .map((p) => {
      // p expected as [timestamp, price]
      const ts = Number(p && p[0]);
      let tsMs = ts;
      // If timestamp looks like seconds (10 digits), convert to ms
      if (ts > 0 && ts < 1e12) tsMs = ts * 1000;
      const time = new Date(tsMs);
      const close = Number(p && p[1]);
      return { time, close };
    })
    // filter out invalid entries
    .filter(
      (d) =>
        d.time instanceof Date &&
        !Number.isNaN(d.time.getTime()) &&
        typeof d.close === "number" &&
        !Number.isNaN(d.close)
    )
    // sort by time ascending to ensure monotonic series
    .sort((a, b) => a.time - b.time);

  return out;
}

// Simple geometric random walk generator for fallback/demo data
export function generateSyntheticPrices(days = 365 * 2, startPrice = 20000) {
  const out = [];
  let price = startPrice;
  for (let i = 0; i < days; i++) {
    // daily return ~ N(0, 0.02)
    const r = (Math.random() - 0.5) * 0.04; // +/-2% approx
    price = Math.max(1, price * (1 + r));
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    out.push({ time: date, close: Number(price.toFixed(2)) });
  }
  return out;
}

// Calculate various technical indicators
export function calculateIndicator(prices, type, window) {
  const series = new Array(prices.length).fill(null);

  switch (type) {
    case "30d_high":
      for (let i = window; i < prices.length; i++) {
        let highest = -Infinity;
        for (let j = i - window; j < i; j++) {
          if (prices[j].close > highest) highest = prices[j].close;
        }
        series[i] = highest;
      }
      break;

    case "30d_low":
      for (let i = window; i < prices.length; i++) {
        let lowest = Infinity;
        for (let j = i - window; j < i; j++) {
          if (prices[j].close < lowest) lowest = prices[j].close;
        }
        series[i] = lowest;
      }
      break;

    case "sma": // Simple Moving Average
      for (let i = window; i < prices.length; i++) {
        let sum = 0;
        for (let j = i - window; j < i; j++) {
          sum += prices[j].close;
        }
        series[i] = sum / window;
      }
      break;

    case "ema": // Exponential Moving Average
      {
        const multiplier = 2 / (window + 1);
        let ema = null;
        for (let i = 0; i < prices.length; i++) {
          if (i < window) {
            // Calculate initial SMA for the first window
            if (i === window - 1) {
              let sum = 0;
              for (let j = 0; j < window; j++) {
                sum += prices[j].close;
              }
              ema = sum / window;
              series[i] = ema;
            }
          } else {
            ema = (prices[i].close - ema) * multiplier + ema;
            series[i] = ema;
          }
        }
      }
      break;

    case "rsi": // Relative Strength Index
      {
        const period = Math.min(14, window); // RSI typically uses 14 periods
        for (let i = period; i < prices.length; i++) {
          let gains = 0;
          let losses = 0;
          for (let j = i - period + 1; j <= i; j++) {
            const change = prices[j].close - prices[j - 1].close;
            if (change > 0) gains += change;
            else losses -= change;
          }
          const avgGain = gains / period;
          const avgLoss = losses / period;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          series[i] = 100 - 100 / (1 + rs);
        }
      }
      break;

    case "bollinger_upper": // Bollinger Upper Band (SMA + 2*StdDev)
      for (let i = window; i < prices.length; i++) {
        let sum = 0;
        for (let j = i - window; j < i; j++) {
          sum += prices[j].close;
        }
        const sma = sum / window;
        let variance = 0;
        for (let j = i - window; j < i; j++) {
          variance += Math.pow(prices[j].close - sma, 2);
        }
        const stdDev = Math.sqrt(variance / window);
        series[i] = sma + 2 * stdDev;
      }
      break;

    case "bollinger_lower": // Bollinger Lower Band (SMA - 2*StdDev)
      for (let i = window; i < prices.length; i++) {
        let sum = 0;
        for (let j = i - window; j < i; j++) {
          sum += prices[j].close;
        }
        const sma = sum / window;
        let variance = 0;
        for (let j = i - window; j < i; j++) {
          variance += Math.pow(prices[j].close - sma, 2);
        }
        const stdDev = Math.sqrt(variance / window);
        series[i] = sma - 2 * stdDev;
      }
      break;

    case "atr": // Average True Range
      {
        for (let i = window; i < prices.length; i++) {
          let sum = 0;
          for (let j = i - window + 1; j <= i; j++) {
            if (j > 0) {
              const h = prices[j].close;
              const l = prices[j].close;
              const pc = prices[j - 1].close;
              sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
            }
          }
          series[i] = sum / window;
        }
      }
      break;

    default:
      // Default to rolling high
      for (let i = window; i < prices.length; i++) {
        let highest = -Infinity;
        for (let j = i - window; j < i; j++) {
          if (prices[j].close > highest) highest = prices[j].close;
        }
        series[i] = highest;
      }
  }

  return series;
}

export function runGraphBacktest(prices, graph = {}, opts = {}) {
  const lookbackWindow = opts.lookback || 30;
  const feePercent = opts.feePercent ?? 0;
  const feeFraction = feePercent / 100;

  if (!prices || prices.length <= lookbackWindow) return null;

  const equitySeries = [];

  let cash = 1; // normalized equity
  let position = 0; // units
  let entryPrice = null;
  let inTrade = false;

  const trades = [];

  const action1 = (graph.actions && graph.actions.firstIfTrue) || "buy";
  const action2 = (graph.actions && graph.actions.secondIfTrue) || "sell";

  const indicatorParamIds = Array.isArray(graph.indicatorParamIds)
    ? graph.indicatorParamIds
    : [];
  const ifComparisons = Array.isArray(graph.ifComparisons)
    ? graph.ifComparisons
    : [];
  const paramValues = graph.paramValues || {};

  // Calculate indicator series based on type
  const indicatorType = graph.indicatorType || "30d_high";
  const indicatorSeries = calculateIndicator(
    prices,
    indicatorType,
    lookbackWindow
  );

  const compare = (a, b, op) => {
    if (a == null || b == null) return false;
    switch (op) {
      case ">":
        return a > b;
      case "<":
        return a < b;
      case "==":
        return a === b;
      case ">=":
        return a >= b;
      case "<=":
        return a <= b;
      default:
        return false;
    }
  };

  const resolveParamValue = (pid, i, close) => {
    if (!pid) return null;
    if (indicatorParamIds.includes(pid)) {
      return indicatorSeries[i];
    }
    const raw = paramValues[pid];
    if (raw == null) return null;
    if (typeof raw === "number") return raw;
    const s = String(raw).trim().toLowerCase();
    if (s === "close") return close;
    const m = s.match(/^entry\s*\*\s*([0-9]*\.?[0-9]+)$/);
    if (m) {
      const k = Number(m[1]);
      if (entryPrice != null && !Number.isNaN(k)) return entryPrice * k;
      return null;
    }
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
    return null;
  };

  const if1 =
    ifComparisons.find(
      (c) => c.nodeId && String(c.nodeId).includes("ifNode-1")
    ) ||
    ifComparisons[0] ||
    null;
  const if2 =
    ifComparisons.find(
      (c) => c.nodeId && String(c.nodeId).includes("ifNode-2")
    ) || (ifComparisons.length > 1 ? ifComparisons[1] : null);

  for (let i = 0; i < prices.length; i++) {
    const day = prices[i];
    const close = Number(day.close);

    if (i >= lookbackWindow) {
      const op1 = (if1 && if1.operator) || ">";
      let left1 = if1 ? resolveParamValue(if1.leftParamId, i, close) : null;
      let right1 = if1 ? resolveParamValue(if1.rightParamId, i, close) : null;
      if (left1 == null) left1 = close;
      if (right1 == null) right1 = indicatorSeries[i];

      // Check entry condition
      if (compare(left1, right1, op1)) {
        if (action1 === "buy" && !inTrade) {
          entryPrice = close;
          const cashUsed = cash * (1 - feeFraction);
          position = cashUsed / entryPrice;
          cash = 0;
          inTrade = true;
          trades.push({
            entryIndex: i,
            entryPrice,
            exitIndex: null,
            exitPrice: null,
          });
        } else if (action1 === "sell" && inTrade) {
          const proceeds = position * close * (1 - feeFraction);
          cash = proceeds;
          position = 0;
          inTrade = false;
          const lastTrade = trades[trades.length - 1];
          if (lastTrade && lastTrade.exitIndex == null) {
            lastTrade.exitIndex = i;
            lastTrade.exitPrice = close;
          }
          entryPrice = null;
        }
      }

      // Check exit condition (independent of entry, can trigger same day)
      if (inTrade && if2) {
        const op2 = if2.operator || "<";
        let left2 = resolveParamValue(if2.leftParamId, i, close);
        let right2 = resolveParamValue(if2.rightParamId, i, close);

        if (left2 == null) left2 = close;

        if (compare(left2, right2, op2)) {
          if (action2 === "sell") {
            const proceeds = position * close * (1 - feeFraction);
            cash = proceeds;
            position = 0;
            inTrade = false;
            const lastTrade = trades[trades.length - 1];
            if (lastTrade && lastTrade.exitIndex == null) {
              lastTrade.exitIndex = i;
              lastTrade.exitPrice = close;
            }
            entryPrice = null;
          }
        }
      }
    }

    const equity = inTrade ? position * close : cash;
    equitySeries.push(equity);
  }

  if (inTrade && position > 0) {
    const lastClose = prices[prices.length - 1].close;
    const proceeds = position * lastClose * (1 - feeFraction);
    cash = proceeds;
    const lastTrade = trades[trades.length - 1];
    if (lastTrade && lastTrade.exitIndex == null) {
      lastTrade.exitIndex = prices.length - 1;
      lastTrade.exitPrice = lastClose;
    }
    position = 0;
    inTrade = false;
  }

  const totalReturn = cash - 1;
  const closedTrades = trades.filter((t) => t.exitIndex != null);
  let wins = 0;
  let totalDuration = 0;
  for (const t of closedTrades) {
    const pnl = (t.exitPrice - t.entryPrice) / t.entryPrice;
    if (pnl > 0) wins++;
    totalDuration += t.exitIndex - t.entryIndex;
  }
  const winRate = closedTrades.length ? wins / closedTrades.length : 0;
  const avgDuration = closedTrades.length
    ? totalDuration / closedTrades.length
    : 0;
  const peakToTrough = calcMaxDrawdown(equitySeries);

  return {
    equitySeries,
    totalReturn,
    winRate,
    avgDuration,
    trades: closedTrades,
    maxDrawdown: peakToTrough,
  };
}
