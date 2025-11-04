// Centralized defaults for the demo modules
export const DEFAULT_ASSET = "bitcoin";
export const DEFAULT_LOOKBACK = 30;
export const DEFAULT_FEE_PERCENT = 0.05;
export const DEFAULT_DATA_RESOLUTION = "1d"; // daily candles by default
export const DEFAULT_INTERVAL_BY_RESOLUTION = {
  "1d": 180, // days
  "1h": 48, // hours
  "1m": 6, // hours worth of minute bars
};
export const DEFAULT_SYNTHETIC_INTERVAL =
  DEFAULT_INTERVAL_BY_RESOLUTION[DEFAULT_DATA_RESOLUTION];

export default {
  DEFAULT_ASSET,
  DEFAULT_LOOKBACK,
  DEFAULT_FEE_PERCENT,
  DEFAULT_DATA_RESOLUTION,
  DEFAULT_INTERVAL_BY_RESOLUTION,
  DEFAULT_SYNTHETIC_INTERVAL,
};
