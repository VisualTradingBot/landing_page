import "./inputIndicator.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import bitcoinLogo from "../../../../../assets/images/bitcoin.png";
import ethereumLogo from "../../../../../assets/images/etherium.png";
import { useAsset } from "../../AssetContext";

export default function InputIndicator({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const { selectedAsset } = useAsset();
  
  // State for the form fields
  const [resolution, setResolution] = useState(data?.resolution || "1h");
  const [lookbackWindow, setLookbackWindow] = useState(data?.lookbackWindow || "30");
  const [lookbackUnit, setLookbackUnit] = useState(data?.lookbackUnit || "d");
  const [indicator, setIndicator] = useState(data?.indicator || "SMA");

  // Asset image mapping
  const assetImages = {
    bitcoin: bitcoinLogo,
    ethereum: ethereumLogo,
    btc: bitcoinLogo,
    eth: ethereumLogo
  };

  const currentAsset = selectedAsset || "bitcoin";
  const assetImage = assetImages[currentAsset] || bitcoinLogo;

  const handleResolutionChange = (event) => {
    const value = event.target.value;
    setResolution(value);
    updateNodeData(id, { resolution: value });
  };

  const handleLookbackChange = (event) => {
    const value = event.target.value;
    setLookbackWindow(value);
    updateNodeData(id, { lookbackWindow: value });
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
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'inline';
              }}
            />
            <span className="asset-fallback" style={{ display: 'none' }}>
              {currentAsset === 'bitcoin' ? '₿' : '🔷'}
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
            <input
              type="text"
              value={lookbackWindow}
              onChange={handleLookbackChange}
              placeholder="30"
              className="field-input lookback-input"
            />
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
            <option value="rolling_low">Rolling Low</option>
            <option value="rolling_high">Rolling High</option>
            <option value="SMA">SMA (Simple Moving Average)</option>
            <option value="EMA">EMA (Exponential Moving Average)</option>
            <option value="RSI">RSI (Relative Strength Index)</option>
            <option value="bollinger_upper">Bollinger Upper Band</option>
            <option value="bollinger_lower">Bollinger Lower Band</option>
            <option value="ATR">ATR (Average True Range)</option>
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
