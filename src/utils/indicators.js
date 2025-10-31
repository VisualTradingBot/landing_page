// Helper to convert coinGecko prices array [[ts, price], ...] to our format
export function mapCoinGeckoPricesToOHLC(prices) {
  if (!Array.isArray(prices)) return [];

  const out = prices
    .map((p) => {
      // CoinGecko price points arrive as [timestamp, price]
      const tsMs = p && p[0];
      const time = new Date(tsMs);
      const live_price = Number(p && p[1]);
      return { time, live_price };
    })
    // filter and sort
    .filter(
      (d) =>
        d.time instanceof Date &&
        !Number.isNaN(d.time.getTime()) &&
        typeof d.live_price === "number" &&
        !Number.isNaN(d.live_price)
    )
    .sort((a, b) => a.time - b.time);

  return out;
}

// Simple geometric random walk generator for fallback/demo data
export function generateSyntheticPrices(days = 365, startPrice = 20000) {
  const out = [];
  let price = startPrice;
  for (let i = 0; i < days; i++) {
    const r = (Math.random() - 0.5) * 0.04;
    price = Math.max(1, price * (1 + r));
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    out.push({ time: date, live_price: Number(price.toFixed(2)) });
  }
  return out;
}

// Calculate various technical indicators
export function calculateIndicator(prices, type, window) {
  const series = new Array(prices.length).fill(null);

  switch (type) {
    case "30d_high":
      // Use progressive lookback for early days, full window after
      for (let i = 0; i < prices.length; i++) {
        let highest = -Infinity;
        const startIdx = Math.max(0, i - window);
        for (let j = startIdx; j < i; j++) {
          if (prices[j].live_price > highest) highest = prices[j].live_price;
        }
        // Only set if we have at least one previous day
        if (i > 0) {
          series[i] = highest;
        }
      }
      break;

    case "30d_low":
      // Use progressive lookback for early days
      for (let i = 0; i < prices.length; i++) {
        let lowest = Infinity;
        const startIdx = Math.max(0, i - window);
        for (let j = startIdx; j < i; j++) {
          if (prices[j].live_price < lowest) lowest = prices[j].live_price;
        }
        if (i > 0) {
          series[i] = lowest;
        }
      }
      break;

    case "sma": // Simple Moving Average
      for (let i = 0; i < prices.length; i++) {
        const startIdx = Math.max(0, i - window + 1);
        const actualWindow = i - startIdx + 1;
        let sum = 0;
        for (let j = startIdx; j <= i; j++) {
          sum += prices[j].live_price;
        }
        series[i] = sum / actualWindow;
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
                sum += prices[j].live_price;
              }
              ema = sum / window;
              series[i] = ema;
            }
          } else {
            ema = (prices[i].live_price - ema) * multiplier + ema;
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
            const change = prices[j].live_price - prices[j - 1].live_price;
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
      for (let i = 0; i < prices.length; i++) {
        const startIdx = Math.max(0, i - window + 1);
        const actualWindow = i - startIdx + 1;
        let sum = 0;
        for (let j = startIdx; j <= i; j++) {
          sum += prices[j].live_price;
        }
        const sma = sum / actualWindow;
        let variance = 0;
        for (let j = startIdx; j <= i; j++) {
          variance += Math.pow(prices[j].live_price - sma, 2);
        }
        const stdDev = Math.sqrt(variance / actualWindow);
        series[i] = sma + 2 * stdDev;
      }
      break;

    case "bollinger_lower": // Bollinger Lower Band (SMA - 2*StdDev)
      for (let i = 0; i < prices.length; i++) {
        const startIdx = Math.max(0, i - window + 1);
        const actualWindow = i - startIdx + 1;
        let sum = 0;
        for (let j = startIdx; j <= i; j++) {
          sum += prices[j].live_price;
        }
        const sma = sum / actualWindow;
        let variance = 0;
        for (let j = startIdx; j <= i; j++) {
          variance += Math.pow(prices[j].live_price - sma, 2);
        }
        const stdDev = Math.sqrt(variance / actualWindow);
        series[i] = sma - 2 * stdDev;
      }
      break;

    case "atr": // Average True Range
      {
        for (let i = 1; i < prices.length; i++) {
          const startIdx = Math.max(1, i - window + 1);
          const actualWindow = i - startIdx + 1;
          let sum = 0;
          for (let j = startIdx; j <= i; j++) {
            const h = prices[j].live_price;
            const l = prices[j].live_price;
            const pc = prices[j - 1].live_price;
            sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
          }
          series[i] = sum / actualWindow;
        }
      }
      break;

    default:
      // Default to rolling high with progressive lookback
      for (let i = 0; i < prices.length; i++) {
        let highest = -Infinity;
        const startIdx = Math.max(0, i - window);
        for (let j = startIdx; j < i; j++) {
          if (prices[j].live_price > highest) highest = prices[j].live_price;
        }
        if (i > 0) {
          series[i] = highest;
        }
      }
  }

  return series;
}

export function calcMaxDrawdown(equitySeries) {
  let peak = -Infinity;
  let maxDd = 0;
  for (const v of equitySeries) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}
