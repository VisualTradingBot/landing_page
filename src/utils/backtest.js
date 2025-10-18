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
  const window = opts.window || 30; // lookback for highest
  // stopLossPercent: e.g., 5 means 5% stop. Convert to multiplier
  const stopLossPercent = opts.stopLossPercent ?? (100 * (1 - (opts.stopLossMultiplier || 0.95)));
  const stopLossMultiplier = 1 - stopLossPercent / 100;
  const feePercent = opts.feePercent || 0; // expressed as percent, e.g., 0.05 means 0.05%
  const feeFraction = feePercent / 100;

  if (!prices || prices.length <= window) {
    return null;
  }

  const equitySeries = [];
  const equityDates = [];

  let cash = 1; // start equity normalized to 1
  let position = 0; // number of units (shares)
  let entryPrice = null;
  let inTrade = false;

  const trades = [];

  for (let i = 0; i < prices.length; i++) {
    const day = prices[i];
    const close = Number(day.close);
    equityDates.push(day.time || i);

    // compute highest of previous `window` closes (exclude current)
    if (i >= window) {
      let highest = -Infinity;
      for (let j = i - window; j < i; j++) {
        if (prices[j].close > highest) highest = prices[j].close;
      }

      // Entry condition
      if (!inTrade && close > highest) {
        // Buy with all cash, account for fee on entry
        entryPrice = close;
        const cashUsed = cash * (1 - feeFraction);
        position = cashUsed / entryPrice;
        cash = 0;
        inTrade = true;
        trades.push({ entryIndex: i, entryPrice, exitIndex: null, exitPrice: null });
      }

      // Exit condition (stop-loss based on entry)
      if (inTrade && close < entryPrice * stopLossMultiplier) {
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
  const winRate = closedTrades.length ? (wins / closedTrades.length) : 0;
  const avgDuration = closedTrades.length ? (totalDuration / closedTrades.length) : 0;

  const peakToTrough = calcMaxDrawdown(equitySeries);

  return {
    equitySeries,
    equityDates,
    totalReturn,
    winRate,
    avgDuration,
    trades: closedTrades,
    maxDrawdown: peakToTrough,
  };
}

// Helper to convert coinGecko prices array [[ts, price], ...] to our format
export function mapCoinGeckoPricesToOHLC(prices) {
  return prices.map((p) => ({ time: new Date(p[0]), close: p[1] }));
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
