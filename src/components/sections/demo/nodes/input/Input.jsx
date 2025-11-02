import "./input.scss";
import NodeDefault from "../nodeDefault";
import { useState, useEffect, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import PropTypes from "prop-types";
import {
  DEFAULT_ASSET,
  DEFAULT_DATA_RESOLUTION,
  DEFAULT_INTERVAL_BY_RESOLUTION,
} from "../../defaults.js";
import { useAsset } from "../../AssetContext";

const RESOLUTION_LIMITS = {
  "1d": { min: 7, max: 365, unit: "days" },
  "1h": { min: 24, max: 4320, unit: "hours" },
  "1m": { min: 1, max: 24, unit: "hours" },
};

const clampInterval = (value, { min, max }) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
};

export default function Input({ id, data }) {
  const { updateNodeData } = useReactFlow();
  const [dataSource, setDataSource] = useState(data?.dataSource || "synthetic");
  const [asset, setAsset] = useState(data?.asset || DEFAULT_ASSET);
  const [type, setType] = useState(data?.type || "batch");
  const initialResolution = data?.resolution || DEFAULT_DATA_RESOLUTION;
  const [resolution, setResolution] = useState(initialResolution);
  const boundsForInitial = RESOLUTION_LIMITS[initialResolution];
  const defaultInterval =
    data?.interval && Number.isFinite(Number(data.interval))
      ? clampInterval(Number(data.interval), boundsForInitial)
      : DEFAULT_INTERVAL_BY_RESOLUTION[initialResolution] ||
        boundsForInitial?.min ||
        30;
  const [historyWindow, setHistoryWindow] = useState(String(defaultInterval));

  const { setSelectedAsset, setDataResolution, setSyntheticInterval } =
    useAsset();

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

    updateNodeData(id, {
      asset,
      dataSource,
      type,
      resolution,
      interval: intervalValue,
    });
  }, [
    asset,
    dataSource,
    type,
    resolution,
    historyWindow,
    intervalBounds,
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
      setSyntheticInterval(clampInterval(numeric, intervalBounds));
    }
  }, [historyWindow, intervalBounds, setSyntheticInterval]);

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
    setHistoryWindow((prev) => {
      const numericPrev = Number(prev);
      if (Number.isFinite(numericPrev)) {
        return clampInterval(numericPrev, bounds);
      }
      return defaultValue;
    });
  };

  const handleHistoryWindowChange = (value) => {
    const cleaned = value.replace(/[^0-9-]/g, "").replace(/(?!^)-/g, "");
    setHistoryWindow(cleaned);
  };

  const clampHistoryWindowDisplay = () => {
    const numeric = Number(historyWindow);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setHistoryWindow(String(intervalBounds.min));
      return;
    }
    const clamped = clampInterval(numeric, intervalBounds);
    setHistoryWindow(String(clamped));
  };

  return (
    <NodeDefault id={id} title="Test Parameters">
      <div className="input-container">
        <div className="field-row">
          <label className="field-label">Data Source:</label>
          <select
            className="field-select"
            value={dataSource}
            onChange={(e) => {
              const value = e.target.value;
              setDataSource(value);
              updateNodeData(id, { dataSource: value });
            }}
          >
            <option value="synthetic">Synthetic</option>
            <option value="real">Real (CoinGecko)</option>
          </select>
        </div>

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
          <select
            className="field-select"
            value={resolution}
            onChange={(e) => {
              const value = e.target.value;
              handleResolutionChange(value);
              updateNodeData(id, { resolution: value });
            }}
          >
            <option value="1d">1 Day</option>
            <option value="1h">1 Hour</option>
            <option value="1m">1 Minute</option>
          </select>
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
          <select
            className="field-select"
            value={type}
            onChange={(e) => {
              const value = e.target.value;
              setType(value);
              updateNodeData(id, { type: value });
            }}
          >
            <option value="batch">Batch</option>
            <option value="stream">Stream</option>
            <option value="realtime">Real-time</option>
          </select>
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
