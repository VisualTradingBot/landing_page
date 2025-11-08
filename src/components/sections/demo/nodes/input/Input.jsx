import "./input.scss";
import NodeDefault from "../nodeDefault";
import { useState, useEffect, useMemo, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import PropTypes from "prop-types";
import {
  DEFAULT_ASSET,
  DEFAULT_DATA_RESOLUTION,
  DEFAULT_INTERVAL_BY_RESOLUTION,
  DEFAULT_FEE_PERCENT,
} from "../../defaults.js";
import { useAsset } from "../../AssetContext";

const RESOLUTION_LIMITS = {
  "1d": { min: 7, max: 365, unit: "days" },
  "1h": { min: 24, max: 4320, unit: "hours" },
};

const clampInterval = (value, { min, max }) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
};

export default function Input({ id, data }) {
  const { updateNodeData } = useReactFlow();
  const [asset, setAsset] = useState(data?.asset || DEFAULT_ASSET);
  const [type, setType] = useState(data?.type || "realtime");
  const initialResolution = data?.resolution || DEFAULT_DATA_RESOLUTION;
  const [resolution, setResolution] = useState(initialResolution);
  const boundsForInitial = RESOLUTION_LIMITS[initialResolution];
  const {
    setSelectedAsset,
    setDataResolution,
    setHistoryWindow: setHistoryWindowCtx,
    setFeePercent: setFeePercentCtx,
    feePercent: contextFeePercent,
  } = useAsset();
  const skipContextSyncRef = useRef(false);

  const deriveInitialFeePercent = () => {
    const raw =
      data?.feePercent ??
      data?.feePercentage ??
      contextFeePercent ??
      DEFAULT_FEE_PERCENT;
    return String(raw);
  };

  const [feePercentInput, setFeePercentInput] = useState(
    deriveInitialFeePercent
  );
  const defaultInterval =
    data?.interval && Number.isFinite(Number(data.interval))
      ? clampInterval(Number(data.interval), boundsForInitial)
      : DEFAULT_INTERVAL_BY_RESOLUTION[initialResolution] ||
        boundsForInitial?.min ||
        30;
  const [historyWindow, setHistoryWindowValue] = useState(
    String(defaultInterval)
  );

  const intervalBounds = useMemo(
    () =>
      RESOLUTION_LIMITS[resolution] ||
      RESOLUTION_LIMITS[DEFAULT_DATA_RESOLUTION],
    [resolution]
  );

  useEffect(() => {
    if (!id || !updateNodeData) return;
    const numericInterval = Number(historyWindow);
    const intervalValue =
      Number.isFinite(numericInterval) && numericInterval > 0
        ? clampInterval(numericInterval, intervalBounds)
        : intervalBounds.min;

    const numericFee = Number(feePercentInput);
    updateNodeData(id, {
      asset,
      type,
      resolution,
      interval: intervalValue,
      feePercent: Number.isFinite(numericFee)
        ? numericFee
        : DEFAULT_FEE_PERCENT,
    });
  }, [
    asset,
    type,
    resolution,
    historyWindow,
    intervalBounds,
    feePercentInput,
    id,
    updateNodeData,
  ]);

  useEffect(() => {
    const incomingAsset = data?.asset;
    setAsset(incomingAsset);
  }, [data?.asset, asset]);

  useEffect(() => {
    const incomingResolution = data?.resolution;
    setResolution(incomingResolution);
  }, [data?.resolution, resolution]);

  useEffect(() => {
    let nextFee = null;
    if (data?.feePercent != null) {
      nextFee = data.feePercent;
    } else if (data?.feePercentage != null) {
      nextFee = data.feePercentage;
    }

    if (nextFee == null) return;

    const nextString = String(nextFee);
    setFeePercentInput((prev) => (prev === nextString ? prev : nextString));

    const numeric = Number(nextFee);
    if (Number.isFinite(numeric)) {
      skipContextSyncRef.current = true;
      setFeePercentCtx((prev) => (prev === numeric ? prev : numeric));
    }
  }, [data?.feePercent, data?.feePercentage, setFeePercentCtx]);

  useEffect(() => {
    if (contextFeePercent == null) return;
    if (skipContextSyncRef.current) {
      skipContextSyncRef.current = false;
      return;
    }

    const next = String(contextFeePercent);
    setFeePercentInput((prev) => (prev === next ? prev : next));
  }, [contextFeePercent]);

  useEffect(() => {
    if (asset) {
      setSelectedAsset(asset);
    }
  }, [asset, setSelectedAsset]);

  useEffect(() => {
    if (resolution) {
      setDataResolution(resolution);
    }
  }, [resolution, setDataResolution]);

  useEffect(() => {
    const numeric = Number(historyWindow);
    if (Number.isFinite(numeric) && numeric > 0) {
      setHistoryWindowCtx(clampInterval(numeric, intervalBounds));
    }
  }, [historyWindow, intervalBounds, setHistoryWindowCtx]);

  const handleAssetChange = (newAsset) => {
    setAsset(newAsset);
    setSelectedAsset(newAsset);
  };

  const handleResolutionChange = (value) => {
    const nextResolution = value;
    setResolution(nextResolution);
    const bounds = RESOLUTION_LIMITS[nextResolution];
    const defaultValue =
      DEFAULT_INTERVAL_BY_RESOLUTION[nextResolution] || bounds.min;
    setHistoryWindowValue((prev) => {
      const numericPrev = Number(prev);
      if (Number.isFinite(numericPrev)) {
        return clampInterval(numericPrev, bounds);
      }
      return defaultValue;
    });
  };

  const handleHistoryWindowChange = (value) => {
    const cleaned = value.replace(/[^0-9-]/g, "").replace(/(?!^)-/g, "");
    setHistoryWindowValue(cleaned);
  };

  const clampHistoryWindowDisplay = () => {
    const numeric = Number(historyWindow);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setHistoryWindowValue(String(intervalBounds.min));
      return;
    }
    const clamped = clampInterval(numeric, intervalBounds);
    setHistoryWindowValue(String(clamped));
  };

  const handleFeePercentChange = (value) => {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    setFeePercentInput(cleaned);
    const numeric = Number(cleaned);
    if (Number.isFinite(numeric)) {
      skipContextSyncRef.current = true;
      setFeePercentCtx(numeric);
      updateNodeData(id, { feePercent: numeric });
    }
  };

  return (
    <NodeDefault id={id} title="Back-Test Data-Set">
      <div className="input-container">
        <div className="field-row">
          <label className="field-label">Asset:</label>
          <select
            className="field-select"
            value={asset}
            onChange={(e) => {
              const value = e.target.value;
              handleAssetChange(value);
              updateNodeData(id, { asset: value });
            }}
          >
            <option value="bitcoin">BTC</option>
            <option value="ethereum">ETH</option>
          </select>
        </div>

        <div className="field-row">
          <label className="field-label">Data Resolution:</label>
          <div className="field-control field-control--locked">
            <select
              className="field-select"
              value={resolution}
              onChange={(e) => {
                const value = e.target.value;
                handleResolutionChange(value);
                updateNodeData(id, { resolution: value });
              }}
              disabled
            >
              <option value="1d" default>
                1 Day
              </option>
              <option value="1h">1 Hour</option>
            </select>
            <span
              className="field-lock"
              aria-hidden="true"
              title="Locked parameter"
            >
              <svg
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
                focusable="false"
              >
                <rect
                  x="3.25"
                  y="7.25"
                  width="9.5"
                  height="7.5"
                  rx="1.5"
                />
                <path d="M11 7V5a3 3 0 0 0-6 0v2" />
                <circle cx="8" cy="10.5" r="0.85" />
              </svg>
            </span>
          </div>
        </div>

        <div className="field-row">
          <label className="field-label">History Window:</label>
          <div className="field-history">
            <input
              type="text"
              className="field-input"
              value={historyWindow}
              onChange={(e) => {
                const value = e.target.value;
                handleHistoryWindowChange(value);
              }}
              onBlur={clampHistoryWindowDisplay}
            />
            <span className="field-suffix">{intervalBounds.unit}</span>
          </div>
        </div>

        <div className="field-row">
          <label className="field-label">Type:</label>
          <div className="field-control field-control--locked">
            <select
              className="field-select"
              value={type}
              disabled
              onChange={(e) => {
                const value = e.target.value;
                setType(value);
                updateNodeData(id, { type: value });
              }}
            >
              <option value="batch">Batch</option>
              <option value="stream">Stream</option>
              <option value="realtime" default>
                Real-Time
              </option>
            </select>
            <span
              className="field-lock"
              aria-hidden="true"
              title="Locked parameter"
            >
              <svg
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
                focusable="false"
              >
                <rect
                  x="3.25"
                  y="7.25"
                  width="9.5"
                  height="7.5"
                  rx="1.5"
                />
                <path d="M11 7V5a3 3 0 0 0-6 0v2" />
                <circle cx="8" cy="10.5" r="0.85" />
              </svg>
            </span>
          </div>
        </div>

        <div className="field-row">
          <label className="field-label">Fee percentage:</label>
          <div className="field-history">
            <input
              type="text"
              className="field-input"
              value={feePercentInput}
              onChange={(e) => {
                const value = e.target.value;
                handleFeePercentChange(value);
              }}
            />
            <span className="field-suffix">%</span>
          </div>
        </div>
      </div>
    </NodeDefault>
  );
}

Input.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
  onAssetChange: PropTypes.func,
};
