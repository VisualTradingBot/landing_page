import "./buy.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import bitcoinLogo from "../../../../../assets/images/bitcoin.png";
import ethereumLogo from "../../../../../assets/images/etherium.png";
import { useAsset } from "../../AssetContext";

export default function Buy({ data, id, onToggleInTrade, isInTradeCollapsed }) {
  const { updateNodeData } = useReactFlow();
  const { selectedAsset } = useAsset();
  const [action, setAction] = useState("buy");
  const [type, setType] = useState(data?.type || "market");
  const [amount, setAmount] = useState(data?.amount || "10000");

  // Parameter system for amount
  const [amountVariable, setAmountVariable] = useState(() => ({
    label: "buy_amount",
    id: `amount-${Date.now()}`,
    parameterData: {
      source: "user",
      ...((data?.amountParamData && {
        ...data.amountParamData,
      }) || { value: "10000" }),
    },
  }));

  // Asset image mapping
  const assetImages = {
    bitcoin: bitcoinLogo,
    ethereum: ethereumLogo,
    btc: bitcoinLogo,
    eth: ethereumLogo,
  };

  const currentAsset = selectedAsset || "bitcoin";
  const assetImage = assetImages[currentAsset] || bitcoinLogo;

  // Ensure action is always "buy"
  useEffect(() => {
    if (action !== "buy") {
      setAction("buy");
      updateNodeData(id, { action: "buy" });
    }
  }, [action, id, updateNodeData]);

  const handleTypeChange = (event) => {
    const value = event.target.value;
    setType(value);
    updateNodeData(id, { type: value });
  };

  const handleAmountChange = (event) => {
    const value = event.target.value;
    // Remove any non-numeric characters except dots
    const numericValue = value.replace(/[^\d.]/g, "");
    setAmount(numericValue);

    const currentParamData = amountVariable.parameterData || {};
    // Update both direct amount and parameter data
    setAmountVariable((prev) => ({
      ...prev,
      parameterData: {
        ...prev.parameterData,
        value: numericValue,
        source: prev.parameterData?.source || "user",
      },
    }));

    if (id) {
      updateNodeData(id, {
        amount: numericValue,
        amountNumber: parseFloat(numericValue) || 0,
        amountParamData: {
          ...currentParamData,
          value: numericValue,
          source: currentParamData.source || "user",
        },
      });
    }
  };

  // Listen for parameter updates
  useEffect(() => {
    const handleParameterUpdate = (event) => {
      const params = Array.isArray(event?.detail)
        ? event.detail
        : Array.isArray(event)
        ? event
        : null;
      if (!params) return;

      const targetId = amountVariable?.parameterData?.parameterId;
      const targetLabel =
        amountVariable?.parameterData?.label || amountVariable?.paramName;
      if (!targetId && !targetLabel) return;

      const amountParam = params.find((p) => {
        if (targetId && p.id === targetId) return true;
        if (!targetId && targetLabel) {
          return p.label === targetLabel;
        }
        return false;
      });
      if (!amountParam) return;

      const newValue = amountParam.value;
      setAmount(newValue);
      setAmountVariable((prev) => ({
        ...prev,
        parameterData: {
          ...prev.parameterData,
          parameterId: amountParam.id,
          label: amountParam.label,
          value: newValue,
          source: amountParam.source || prev.parameterData?.source || "user",
        },
      }));
      if (id) {
        updateNodeData(id, {
          amount: newValue,
          amountNumber: parseFloat(newValue) || 0,
          amountParamData: {
            parameterId: amountParam.id,
            label: amountParam.label,
            value: newValue,
            source: amountParam.source || "user",
          },
        });
      }
    };

    window.addEventListener("parametersUpdated", handleParameterUpdate);
    return () =>
      window.removeEventListener("parametersUpdated", handleParameterUpdate);
  }, [amountVariable, id, updateNodeData]);

  // Format number with thousands separators
  const formatAmount = (value) => {
    if (!value) return "";
    // Remove any existing formatting
    const numericValue = value.replace(/\./g, "");
    // Add thousands separators
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Get display value (formatted) vs actual value (unformatted)
  const displayAmount = formatAmount(amount);
  const handleToggleCollapse = () => {
    if (typeof onToggleInTrade === "function") {
      onToggleInTrade();
    }
  };

  return (
    <NodeDefault
      id={id}
      title="Buy"
      left={{ active: true, type: "target" }}
      bottom={{ active: true, type: "source" }}
    >
      {/* Purple exclamation mark indicator */}
      <div className="buy-indicator">
        <button
          type="button"
          className={`buy-toggle ${
            isInTradeCollapsed ? "collapsed" : "expanded"
          }`}
          onClick={handleToggleCollapse}
          aria-pressed={isInTradeCollapsed}
          aria-label={
            isInTradeCollapsed ? "Show in-trade block" : "Hide in-trade block"
          }
        >
          !
        </button>
      </div>

      <div className="buy-container">
        <div className="asset-display">
          <span className="asset-label">Asset:</span>
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

        <div className="type-field">
          <label className="type-label">Type:</label>
          <select
            value={type}
            onChange={handleTypeChange}
            className="type-select"
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
            <option value="stop_limit">Stop Limit</option>
          </select>
        </div>

        <div className="amount-field">
          <label className="amount-label">Amount:</label>
          <div className="amount-input-container">
            <input
              type="text"
              value={displayAmount}
              onChange={handleAmountChange}
              placeholder="Enter amount in dollars"
              className="amount-input"
            />
            <span className="amount-suffix">$</span>
          </div>
        </div>
      </div>
    </NodeDefault>
  );
}

Buy.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
  onToggleInTrade: PropTypes.func,
  isInTradeCollapsed: PropTypes.bool,
};
