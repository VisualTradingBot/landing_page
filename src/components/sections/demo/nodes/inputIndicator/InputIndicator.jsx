import "./inputIndicator.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect, useCallback, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import bitcoinLogo from "../../../../../assets/images/bitcoin.png";
import ethereumLogo from "../../../../../assets/images/etherium.png";
import { useAsset } from "../../AssetContext";
import { DEFAULT_ASSET } from "../../defaults";

export default function InputIndicator({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const { selectedAsset } = useAsset();

  const payloadRef = useRef(null);

  // State for the form fields
  const [resolution, setResolution] = useState(data?.resolution || "1h");
  const [lookbackUnit, setLookbackUnit] = useState(data?.lookbackUnit || "d");
  // indicator stored as internal id (e.g. 'sma', 'ema', '30d_high')
  const [indicator, setIndicator] = useState(data?.indicator || "sma");

  // Parameter system for lookback window
  const defaultLookbackVar = {
    label: "lookback",
    id: `lookback-${Date.now()}`,
    parameterData: {},
  };
  const [lookbackVariable, setLookbackVariable] = useState(() => {
    return data?.lookbackVariable || defaultLookbackVar;
  });
  // parameters provided by graph; kept on node data but not used locally

  // Drag and drop handlers
  const [dragOverZone, setDragOverZone] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverZone(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOverZone(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOverZone(false);

    try {
      const dragData = JSON.parse(
        e.dataTransfer.getData("application/reactflow")
      );
      if (dragData && dragData.family === "variable") {
        setLookbackVariable((prev) => ({
          ...prev,
          parameterData: {
            parameterId: dragData.id,
            label: dragData.label,
            value: dragData.value,
            source: dragData.source || "user",
          },
          paramName:
            (dragData.source || "user") === "system"
              ? dragData.label
              : undefined,
        }));
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  }, []);

  const handleParameterDragStart = useCallback(
    (e) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      const payload = lookbackVariable.parameterData;
      if (!payload || !payload.label) return;
      e.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({
          label: payload.label,
          value: payload.value,
          family: "variable",
          id: payload.parameterId,
          source: payload.source || "user",
        })
      );
    },
    [lookbackVariable.parameterData]
  );

  const handleParameterDragEnd = useCallback(() => {
    // Clear the parameter when dragged away
    setLookbackVariable((prev) => ({
      ...prev,
      parameterData: {},
      paramName: undefined,
    }));
  }, []);

  const handleParameterDoubleClick = useCallback(() => {
    // Clear the parameter when double-clicked
    setLookbackVariable((prev) => ({
      ...prev,
      parameterData: {},
      paramName: undefined,
    }));
  }, []);

  // Asset image mapping
  const assetImages = {
    bitcoin: bitcoinLogo,
    ethereum: ethereumLogo,
    btc: bitcoinLogo,
    eth: ethereumLogo,
  };

  const currentAsset = selectedAsset || DEFAULT_ASSET;
  const assetImage = assetImages[currentAsset] || bitcoinLogo;

  // Update node data when lookback variable changes
  useEffect(() => {
    if (!id || !updateNodeData) return;

    const explicitOutput =
      typeof data?.outputParamName === "string"
        ? data.outputParamName.trim()
        : "";
    const outputParamName = explicitOutput || "indicator_output";

    // Prepare canonical data structure for parser
    const paramData = lookbackVariable.parameterData || {};
    const rawLookback =
      paramData.value ?? lookbackVariable.paramName ?? paramData.label;
    const parsedLookback = Number(rawLookback);
    const lookbackValue = Number.isFinite(parsedLookback)
      ? parsedLookback
      : rawLookback;

    const updatedData = {
      indicator,
      resolution,
      lookbackUnit,
      lookback: lookbackValue ?? 30,
      outputParamName,
      // Keep a reference to the parameter mapping for later resolution
      lookbackParamName:
        lookbackVariable.paramName || lookbackVariable.parameterData.label,
      lookbackVariable,
      parameters: data?.parameters, // Preserve parameter bindings
    };

    const { parameters: _ignoredParameters, ...rest } = updatedData;
    const payloadSignature = JSON.stringify(rest);
    if (payloadRef.current !== payloadSignature) {
      payloadRef.current = payloadSignature;
      updateNodeData(id, updatedData);
    }
  }, [
    lookbackVariable,
    resolution,
    lookbackUnit,
    indicator,
    id,
    updateNodeData,
    data?.outputParamName,
    data?.parameters,
  ]);

  // Sync with global parameter updates emitted by ParameterBlock
  useEffect(() => {
    const handler = (ev) => {
      const params = ev?.detail || ev;
      if (!params || !lookbackVariable?.parameterData?.parameterId) return;
      const pid = lookbackVariable.parameterData.parameterId;
      const match = Array.isArray(params)
        ? params.find((p) => p.id === pid)
        : null;
      if (match) {
        // Only update if label/value changed
        const newLabel = match.label;
        const newValue = match.value;
        const newSource = match.source;
        const cur = lookbackVariable.parameterData || {};
        if (
          cur.label !== newLabel ||
          cur.value !== newValue ||
          cur.source !== newSource
        ) {
          const nextParamData = {
            ...cur,
            label: newLabel,
            value: newValue,
          };

          if (newSource) {
            nextParamData.source = newSource;
          }

          const updated = {
            ...lookbackVariable,
            parameterData: nextParamData,
            paramName:
              (newSource || "user") === "system" ? newLabel : undefined,
          };
          setLookbackVariable(updated);
          try {
            updateNodeData(id, { lookbackVariable: updated });
          } catch {
            /* ignore */
          }
        }
      }
    };

    window.addEventListener("parametersUpdated", handler);
    return () => window.removeEventListener("parametersUpdated", handler);
  }, [lookbackVariable, id, updateNodeData]);

  const handleResolutionChange = (event) => {
    const value = event.target.value;
    setResolution(value);
    updateNodeData(id, { resolution: value });
  };

  const handleLookbackUnitChange = (event) => {
    const value = event.target.value;
    setLookbackUnit(value);
    updateNodeData(id, { lookbackUnit: value });
  };

  const handleIndicatorChange = (event) => {
    const value = event.target.value;
    setIndicator(value);
    updateNodeData(id, { indicator: value });
  };

  return (
    <NodeDefault
      id={id}
      title="Input-Indicator"
      right={{ active: true, type: "source" }}
      explanation="The Input-Indicator node calculates technical indicators (SMA, EMA, RSI, Bollinger Bands, ATR, Rolling High/Low) based on price data. It outputs the indicator value as a parameter that can be used in conditions or other nodes. The lookback window determines how many periods to use for calculation."
    >
      <div className="input-indicator-container">
        {/* Asset Display */}
        <div className="field-row asset-row">
          <label className="field-label">Asset:</label>
          <div className="asset-display">
            <img
              src={assetImage}
              alt={currentAsset}
              className="asset-image"
              onError={(e) => {
                // Fallback to emoji if image fails to load
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "inline";
              }}
            />
            <span className="asset-fallback" style={{ display: "none" }}>
              {currentAsset === "bitcoin" ? "₿" : "🔷"}
            </span>
          </div>
        </div>

        {/* Resolution Field */}
        <div className="field-row locked">
          <label className="field-label">Resolution:</label>
          <div className="field-control field-control--locked">
            <select
              value={resolution}
              onChange={handleResolutionChange}
              className="field-select"
              disabled
            >
              <option value="1m">1 minute</option>
              <option value="1h">1 hour</option>
              <option value="1d" default>
                1 day
              </option>
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

        {/* Lookback Window Field */}
        <div className="field-row">
          <label className="field-label">Lookback Window:</label>
          <div className="lookback-container">
            <div className="lookback-parameter-field">
              {lookbackVariable.parameterData &&
              Object.keys(lookbackVariable.parameterData).length > 0 ? (
                <div
                  className="parameter-connected"
                  draggable
                  onDragStart={handleParameterDragStart}
                  onDragEnd={handleParameterDragEnd}
                  onDoubleClick={handleParameterDoubleClick}
                >
                  {lookbackVariable.parameterData.label}
                </div>
              ) : (
                <div
                  className={`parameter-placeholder ${
                    dragOverZone ? "drag-over" : ""
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  Drag parameter
                </div>
              )}
            </div>
            <select
              value={lookbackUnit}
              onChange={handleLookbackUnitChange}
              className="field-select lookback-unit"
              disabled
            >
              <option value="m">minute</option>
              <option value="h" default>
                hour
              </option>
              <option value="d">day</option>
            </select>
          </div>
        </div>

        {/* Indicator Field */}
        <div className="field-row">
          <label className="field-label">Indicator:</label>
          <select
            value={indicator}
            onChange={handleIndicatorChange}
            className="field-select"
          >
            <option value="30d_low">Rolling Low</option>
            <option value="30d_high">Rolling High</option>
            <option value="sma">SMA (Simple Moving Average)</option>
            <option value="ema">EMA (Exponential Moving Average)</option>
            <option value="rsi">RSI (Relative Strength Index)</option>
            <option value="bollinger_upper">Bollinger Upper Band</option>
            <option value="bollinger_lower">Bollinger Lower Band</option>
            <option value="atr">ATR (Average True Range)</option>
          </select>
        </div>
      </div>
    </NodeDefault>
  );
}

InputIndicator.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
