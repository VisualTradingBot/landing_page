import "./inputPrice.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import bitcoinLogo from "../../../../../assets/images/bitcoin.png";
import ethereumLogo from "../../../../../assets/images/etherium.png";
import { useAsset } from "../../AssetContext";
import { DEFAULT_ASSET } from "../../defaults";

export default function InputPrice({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const { selectedAsset } = useAsset();
  const payloadRef = useRef(null);

  // State for the form fields
  const [timeFrame, setTimeFrame] = useState(data?.timeFrame || "1h");
  const [type, setType] = useState(data?.type || "instant");
  const [format, setFormat] = useState(data?.format || "close");

  // Parameter system for output price
  // eslint-disable-next-line no-unused-vars
  const [priceVariable, setPriceVariable] = useState(() => ({
    label: "price_output",
    id: `price-${Date.now()}`,
    parameterData: data?.priceParamData || {},
  }));

  // Asset image mapping
  const assetImages = {
    bitcoin: bitcoinLogo,
    ethereum: ethereumLogo,
  };

  const currentAsset = selectedAsset || DEFAULT_ASSET;
  const assetImage = assetImages[currentAsset] || bitcoinLogo;

  const handleTimeFrameChange = (event) => {
    const value = event.target.value;
    setTimeFrame(value);
    if (id) {
      updateNodeData(id, { timeFrame: value });
    }
  };

  const handleTypeChange = (event) => {
    const value = event.target.value;
    setType(value);
    if (id) {
      updateNodeData(id, { type: value });
    }
  };

  const handleFormatChange = (event) => {
    const value = event.target.value;
    setFormat(value);
    if (id) {
      updateNodeData(id, { format: value });
    }
  };

  // Update node data and keep output parameter name in sync with node configuration
  useEffect(() => {
    if (!id || !updateNodeData) return;

    const explicitOutput =
      typeof data?.outputParamName === "string"
        ? data.outputParamName.trim()
        : "";
    const outputParamName = explicitOutput || "live_price";

    // Prepare canonical data structure for parser
    const updatedData = {
      timeFrame,
      type,
      format,
      outputParamName,
      parameters: data?.parameters, // Preserve parameter bindings
      priceParamData: priceVariable.parameterData,
    };

    const { parameters: _ignoredParameters, ...rest } = updatedData;
    const payloadSignature = JSON.stringify(rest);
    if (payloadRef.current !== payloadSignature) {
      payloadRef.current = payloadSignature;
      updateNodeData(id, updatedData);
    }
  }, [
    id,
    updateNodeData,
    timeFrame,
    type,
    format,
    priceVariable,
    data?.outputParamName,
    data?.parameters,
  ]);

  return (
    <NodeDefault id={id} title="Input-Price">
      <div className="input-price-container">
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

        {/* Time Frame Field */}
        <div className="field-row">
          <label className="field-label">Time Frame:</label>
          <select
            value={timeFrame}
            onChange={handleTimeFrameChange}
            className="field-select"
          >
            <option value="1m">1 minute</option>
            <option value="1h">1 hour</option>
            <option value="1d">1 day</option>
          </select>
        </div>

        {/* Type Field */}
        <div className="field-row">
          <label className="field-label">Type:</label>
          <select
            value={type}
            onChange={handleTypeChange}
            className="field-select"
          >
            <option value="instant">Instant</option>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
            <option value="stop_limit">Stop Limit</option>
          </select>
        </div>

        {/* Format Field */}
        <div className="field-row">
          <label className="field-label">Format:</label>
          <select
            value={format}
            onChange={handleFormatChange}
            className="field-select"
          >
            <option value="close">Close</option>
            <option value="open">Open</option>
            <option value="high">High</option>
            <option value="low">Low</option>
            <option value="volume">Volume</option>
            <option value="ohlc">OHLC</option>
          </select>
        </div>
      </div>
    </NodeDefault>
  );
}

InputPrice.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
