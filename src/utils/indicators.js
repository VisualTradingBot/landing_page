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
const SYNTHETIC_CONFIG = {
  "1d": {
    min: 7,
    max: 365,
    stepMs: 24 * 60 * 60 * 1000,
    defaultInterval: 180,
    sharedVolatility: 0.02,
    id: "daily",
  },
  "1h": {
    min: 24,
    max: 4320,
    stepMs: 60 * 60 * 1000,
    defaultInterval: 48,
    sharedVolatility: 0.0125,
    id: "hourly",
  },
  "1m": {
    min: 1,
    max: 24,
    stepMs: 60 * 1000,
    defaultInterval: 6,
    sharedVolatility: 0.004,
    id: "minutely",
  },
};

const DEFAULT_START_PRICES = {
  bitcoin: 20000,
  ethereum: 1400,
};

const ASSET_VOLATILITY = {
  bitcoin: 1,
  ethereum: 1.15,
};

function createSeededRandom(seed) {
  if (!Number.isFinite(seed)) {
    return Math.random;
  }
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSyntheticPrices(options = {}) {
  const { resolution = "1d", interval, startPrices = {}, seed } = options;

  const config = SYNTHETIC_CONFIG[resolution] || SYNTHETIC_CONFIG["1d"];
  const boundsInterval = {
    min: config.min,
    max: config.max,
  };
  const rawInterval = Number(interval);
  let normalizedInterval;
  if (Number.isFinite(rawInterval)) {
    normalizedInterval = Math.min(
      Math.max(rawInterval, boundsInterval.min),
      boundsInterval.max
    );
  } else {
    normalizedInterval = config.defaultInterval;
  }

  const points =
    resolution === "1m"
      ? Math.max(2, Math.round(normalizedInterval * 60))
      : Math.max(2, Math.round(normalizedInterval));

  const rng = createSeededRandom(seed ?? Date.now());
  const sharedShockScale = config.sharedVolatility;
  const startTime = Date.now() - config.stepMs * (points - 1);

  const assetMap = { ...DEFAULT_START_PRICES, ...startPrices };
  const results = {};

  Object.entries(assetMap).forEach(([assetKey, initialPriceRaw]) => {
    const basePrice = Number(initialPriceRaw);
    const startPrice =
      Number.isFinite(basePrice) && basePrice > 0
        ? basePrice
        : DEFAULT_START_PRICES[assetKey] || 1000;
    const assetVol = ASSET_VOLATILITY[assetKey] || 1;
    const series = [];
    let price = startPrice;

    for (let i = 0; i < points; i++) {
      const sharedShock = rng() - 0.5;
      const idiosyncraticShock = rng() - 0.5;
      const drift =
        resolution === "1d" ? 0.0006 : resolution === "1h" ? 0.0002 : 0.00005;
      const shock =
        drift +
        sharedShock * sharedShockScale +
        idiosyncraticShock * sharedShockScale * 0.6 * assetVol;
      price = Math.max(1, price * (1 + shock));
      const time = new Date(startTime + i * config.stepMs);
      series.push({ time, live_price: Number(price.toFixed(2)) });
    }

    results[assetKey] = series;
  });

  return results;
}

// Calculate various technical indicators
export function calculateIndicator(prices, type, window) {
  const series = new Array(prices.length).fill(null);

  switch (type) {
    case "30d_high":
      // Use progressive lookback for early days, full window after
      for (let i = 0; i < prices.length; i++) {
        let highest = -Infinity;
        const startIdx = Math.max(0, i - window + 1); // <-- FIX 1
        for (let j = startIdx; j <= i; j++) {
          // <-- FIX 2 (<= i)
          if (prices[j].live_price > highest) highest = prices[j].live_price;
        }
        series[i] = highest; // <-- FIX 3 (remove if(i>0))
      }
      break;

    case "30d_low":
      // Use progressive lookback for early days
      for (let i = 0; i < prices.length; i++) {
        let lowest = Infinity;
        const startIdx = Math.max(0, i - window + 1); // <-- FIX 1
        for (let j = startIdx; j <= i; j++) {
          // <-- FIX 2 (<= i)
          if (prices[j].live_price < lowest) lowest = prices[j].live_price;
        }
        series[i] = lowest; // <-- FIX 3 (remove if(i>0))
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
        const period = window; // Respect the user-defined window
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
            // Proxy TR since we only have close prices:
            const tr = Math.abs(
              prices[j].live_price - prices[j - 1].live_price
            );
            sum += tr;
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
