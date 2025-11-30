import { useState, useEffect, useMemo, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useAsset } from "../AssetContext";
import {
  DEFAULT_ASSET,
  DEFAULT_DATA_RESOLUTION,
  DEFAULT_FEE_PERCENT,
  DEFAULT_INTERVAL_BY_RESOLUTION,
  DEFAULT_PORTFOLIO_VALUE,
} from "../defaults";
import "./BacktestDatasetSidebar.scss";

export default function BacktestDatasetSidebar() {
  const reactFlow = useReactFlow();
  const assetContext = useAsset();
  const inputNode = reactFlow?.getNode?.("inputNode") || null;
  const data = inputNode?.data || {};
  const RESOLUTION_LIMITS = useMemo(
    () => ({
      "1d": { min: 1, max: 365, unit: "days" },
      "1h": { min: 1, max: 8760, unit: "hours" },
    }),
    []
  );
  const resolution = data.resolution || DEFAULT_DATA_RESOLUTION;
  const intervalBounds =
    RESOLUTION_LIMITS[resolution] || RESOLUTION_LIMITS["1d"];
  const defaultInterval = String(
    data.interval ??
      DEFAULT_INTERVAL_BY_RESOLUTION[resolution] ??
      intervalBounds.min
  );
  const defaultFee = String(
    data.feePercent ??
      data.feePercentage ??
      assetContext.feePercent ??
      DEFAULT_FEE_PERCENT
  );
  const defaultPortfolio = String(
    data.portfolioValue ??
      assetContext.portfolioValue ??
      DEFAULT_PORTFOLIO_VALUE
  );

  const [formState, setFormState] = useState({
    asset: data.asset || DEFAULT_ASSET,
    interval: defaultInterval,
    fee: defaultFee,
    portfolio: defaultPortfolio,
  });
  const [dirty, setDirty] = useState({
    asset: false,
    interval: false,
    fee: false,
    portfolio: false,
  });
  const [flashing, setFlashing] = useState({});

  useEffect(() => {
    if (!inputNode) return;
    const nodeData = inputNode.data || {};
    const nodeResolution = nodeData.resolution || DEFAULT_DATA_RESOLUTION;
    const bounds = RESOLUTION_LIMITS[nodeResolution] || RESOLUTION_LIMITS["1d"];
    const syncedInterval = String(
      nodeData.interval ??
        DEFAULT_INTERVAL_BY_RESOLUTION[nodeResolution] ??
        bounds.min
    );
    const syncedFee = String(
      nodeData.feePercent ??
        nodeData.feePercentage ??
        assetContext.feePercent ??
        DEFAULT_FEE_PERCENT
    );
    const syncedPortfolio = String(
      nodeData.portfolioValue ??
        assetContext.portfolioValue ??
        DEFAULT_PORTFOLIO_VALUE
    );

    setFormState((prev) => ({
      asset: dirty.asset ? prev.asset : nodeData.asset || DEFAULT_ASSET,
      interval: dirty.interval ? prev.interval : syncedInterval,
      fee: dirty.fee ? prev.fee : syncedFee,
      portfolio: dirty.portfolio ? prev.portfolio : syncedPortfolio,
    }));

    if (!dirty.portfolio) {
      const numericPortfolio = Number(syncedPortfolio);
      if (Number.isFinite(numericPortfolio)) {
        const currentPortfolio = Number(assetContext?.portfolioValue);
        if (currentPortfolio !== numericPortfolio) {
          assetContext?.setPortfolioValue?.(numericPortfolio);
        }
      }
    }
  }, [
    inputNode,
    data.asset,
    data.interval,
    data.feePercent,
    data.feePercentage,
    data.portfolioValue,
    data.resolution,
    assetContext.feePercent,
    assetContext.portfolioValue,
    dirty.asset,
    dirty.interval,
    dirty.fee,
    dirty.portfolio,
    RESOLUTION_LIMITS,
  ]);

  const flashField = useCallback((field) => {
    setFlashing((prev) => ({ ...prev, [field]: true }));
    setTimeout(() => setFlashing((prev) => ({ ...prev, [field]: false })), 600);
  }, []);

  const commitChanges = useCallback(
    (patch) => {
      if (!inputNode) return;
      reactFlow.updateNodeData(inputNode.id, {
        ...inputNode.data,
        ...patch,
      });
    },
    [inputNode, reactFlow]
  );

  const handleAssetChange = (value) => {
    if (!value || value === formState.asset) return;
    const oldValue = formState.asset;
    setDirty((prev) => ({ ...prev, asset: true }));
    setFormState((prev) => ({ ...prev, asset: value }));
    assetContext.setSelectedAsset(value);
    commitChanges({ asset: value });
    setDirty((prev) => ({ ...prev, asset: false }));
    flashField("asset");
    // Track dataset change
    if (typeof window !== "undefined" && window.__demoAnalytics) {
      window.__demoAnalytics.trackDatasetChange("asset", oldValue, value);
    }
  };

  const handleIntervalChange = (value) => {
    const cleaned = value.replace(/[^0-9-]/g, "").replace(/(?!^)-/g, "");
    setDirty((prev) => ({ ...prev, interval: true }));
    setFormState((prev) => ({ ...prev, interval: cleaned }));
  };

  const handleIntervalBlur = () => {
    const oldValue = formState.interval;
    const numeric = Number(formState.interval);
    const clamped =
      Number.isFinite(numeric) && numeric > 0
        ? Math.min(Math.max(numeric, intervalBounds.min), intervalBounds.max)
        : intervalBounds.min;
    const clampedStr = String(clamped);
    if (clampedStr !== formState.interval) {
      setFormState((prev) => ({ ...prev, interval: clampedStr }));
    }
    commitChanges({ interval: clamped });
    assetContext.setHistoryWindow(clamped);
    setDirty((prev) => ({ ...prev, interval: false }));
    flashField("interval");
    // Track dataset change
    if (typeof window !== "undefined" && window.__demoAnalytics && oldValue !== clampedStr) {
      window.__demoAnalytics.trackDatasetChange("interval", oldValue, clampedStr);
    }
  };

  const handleFeeChange = (value) => {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    setDirty((prev) => ({ ...prev, fee: true }));
    setFormState((prev) => ({ ...prev, fee: cleaned }));
  };

  const handleFeeBlur = () => {
    const oldValue = formState.fee;
    const numeric = Number(formState.fee);
    // Clamp fee between 0 and 99%
    const clampedFee = Number.isFinite(numeric) 
      ? Math.min(Math.max(numeric, 0), 99) 
      : DEFAULT_FEE_PERCENT;
    const feeStr = String(clampedFee);
    if (feeStr !== formState.fee) {
      setFormState((prev) => ({ ...prev, fee: feeStr }));
    }
    commitChanges({ feePercent: clampedFee });
    assetContext.setFeePercent(clampedFee);
    setDirty((prev) => ({ ...prev, fee: false }));
    flashField("fee");
    // Track dataset change
    if (typeof window !== "undefined" && window.__demoAnalytics && oldValue !== feeStr) {
      window.__demoAnalytics.trackDatasetChange("fee", oldValue, feeStr);
    }
  };

  const handlePortfolioChange = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    setDirty((prev) => ({ ...prev, portfolio: true }));
    setFormState((prev) => ({ ...prev, portfolio: cleaned }));
  };

  const handlePortfolioBlur = () => {
    const oldValue = formState.portfolio;
    const numeric = Number(formState.portfolio);
    const portfolioValue =
      Number.isFinite(numeric) && numeric > 0
        ? numeric
        : DEFAULT_PORTFOLIO_VALUE;
    const portfolioStr = String(portfolioValue);
    if (portfolioStr !== formState.portfolio) {
      setFormState((prev) => ({ ...prev, portfolio: portfolioStr }));
    }
    commitChanges({ portfolioValue });
    assetContext?.setPortfolioValue?.(portfolioValue);
    setDirty((prev) => ({ ...prev, portfolio: false }));
    flashField("portfolio");
    // Track dataset change
    if (typeof window !== "undefined" && window.__demoAnalytics && oldValue !== portfolioStr) {
      window.__demoAnalytics.trackDatasetChange("portfolio", oldValue, portfolioStr);
    }
  };

  return (
    <div className="backtest-dataset-sidebar">
      <div className="sidebar-header">
        <h3 className="sidebar-title">backtesting settings</h3>
      </div>
      <div className="sidebar-content">
        {!inputNode ? (
          <div className="dataset-empty">Back-test node not found.</div>
        ) : (
          <div className="dataset-form">
            <div className={`dataset-field ${flashing.asset ? "flash" : ""}`}>
              <label htmlFor="sidebar-dataset-asset">Asset</label>
              <select
                id="sidebar-dataset-asset"
                value={formState.asset}
                onChange={(e) => handleAssetChange(e.target.value)}
              >
                <option value="bitcoin">BTC</option>
                <option value="ethereum">ETH</option>
              </select>
            </div>

            <div className="dataset-field locked">
              <label htmlFor="sidebar-dataset-resolution">
                Data Resolution
              </label>
              <div className="field-control field-control--locked">
                <select
                  id="sidebar-dataset-resolution"
                  value={resolution}
                  disabled
                >
                  <option value="1d">1 Day</option>
                  <option value="1h">1 Hour</option>
                </select>
                <span className="field-lock" aria-hidden="true" title="Locked">
                  <svg
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                    focusable="false"
                  >
                    <rect x="3.25" y="7.25" width="9.5" height="7.5" rx="1.5" />
                    <path d="M11 7V5a3 3 0 0 0-6 0v2" />
                    <circle cx="8" cy="10.5" r="0.85" />
                  </svg>
                </span>
              </div>
            </div>

            <div
              className={`dataset-field ${flashing.interval ? "flash" : ""}`}
            >
              <label htmlFor="sidebar-dataset-history">History Window</label>
              <div className="dataset-history-input">
                <input
                  id="sidebar-dataset-history"
                  type="text"
                  value={formState.interval}
                  onChange={(e) => handleIntervalChange(e.target.value)}
                  onBlur={handleIntervalBlur}
                />
                <span>{intervalBounds.unit}</span>
              </div>
            </div>

            <div className="dataset-field locked">
              <label htmlFor="sidebar-dataset-type">Type</label>
              <div className="field-control field-control--locked">
                <select
                  id="sidebar-dataset-type"
                  value={data.type || "realtime"}
                  disabled
                >
                  <option value="realtime">Real-Time</option>
                  <option value="batch">Batch</option>
                  <option value="stream">Stream</option>
                </select>
                <span className="field-lock" aria-hidden="true" title="Locked">
                  <svg
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                    focusable="false"
                  >
                    <rect x="3.25" y="7.25" width="9.5" height="7.5" rx="1.5" />
                    <path d="M11 7V5a3 3 0 0 0-6 0v2" />
                    <circle cx="8" cy="10.5" r="0.85" />
                  </svg>
                </span>
              </div>
            </div>

            <div className={`dataset-field ${flashing.fee ? "flash" : ""}`}>
              <label htmlFor="sidebar-dataset-fee">Fee Percentage</label>
              <div className="dataset-fee-input">
                <input
                  id="sidebar-dataset-fee"
                  type="text"
                  value={formState.fee}
                  onChange={(e) => handleFeeChange(e.target.value)}
                  onBlur={handleFeeBlur}
                />
                <span>%</span>
              </div>
            </div>

            <div
              className={`dataset-field ${flashing.portfolio ? "flash" : ""}`}
            >
              <label htmlFor="sidebar-dataset-portfolio">Portfolio Value</label>
              <div className="dataset-fee-input">
                <input
                  id="sidebar-dataset-portfolio"
                  type="text"
                  value={formState.portfolio}
                  onChange={(e) => handlePortfolioChange(e.target.value)}
                  onBlur={handlePortfolioBlur}
                />
                <span>€</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
