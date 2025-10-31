import "./inputIndicator.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import bitcoinLogo from "../../../../../assets/images/bitcoin.png";
import ethereumLogo from "../../../../../assets/images/etherium.png";
import { useAsset } from "../../AssetContext";
import { VariableFieldStandalone } from "../components";

export default function InputIndicator({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const { selectedAsset } = useAsset();

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
          },
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
      e.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({
          label: lookbackVariable.parameterData.label,
          value: lookbackVariable.parameterData.value,
          family: "variable",
          id: lookbackVariable.parameterData.parameterId,
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
    }));
  }, []);

  const handleParameterDoubleClick = useCallback(() => {
    // Clear the parameter when double-clicked
    setLookbackVariable((prev) => ({
      ...prev,
      parameterData: {},
    }));
  }, []);

  // Asset image mapping
  const assetImages = {
    bitcoin: bitcoinLogo,
    ethereum: ethereumLogo,
    btc: bitcoinLogo,
    eth: ethereumLogo,
  };

  const currentAsset = selectedAsset || "bitcoin";
  const assetImage = assetImages[currentAsset] || bitcoinLogo;

  // Update node data when lookback variable changes
  useEffect(() => {
    if (updateNodeData && id) {
      updateNodeData(id, {
        lookbackVariable,
        resolution,
        lookbackUnit,
        indicator,
      });
    }
  }, [
    lookbackVariable,
    resolution,
    lookbackUnit,
    indicator,
    id,
    updateNodeData,
  ]);

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
        <div className="field-row">
          <label className="field-label">Resolution:</label>
          <select
            value={resolution}
            onChange={handleResolutionChange}
            className="field-select"
          >
            <option value="1m">1 minute</option>
            <option value="1h">1 hour</option>
            <option value="1d">1 day</option>
          </select>
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
            >
              <option value="m">minute</option>
              <option value="h">hour</option>
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
