import "./sell.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import bitcoinLogo from "../../../../../assets/images/bitcoin.png";
import ethereumLogo from "../../../../../assets/images/etherium.png";
import { useAsset } from "../../AssetContext";
import { DEFAULT_ASSET } from "../../defaults";

export default function Sell({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const { selectedAsset } = useAsset();
  const [action, setAction] = useState("sell");
  const [amount, setAmount] = useState(data?.amount || "");

  // Parameter system for amount
  const [amountVariable, setAmountVariable] = useState(() => ({
    label: "sell_amount",
    id: `amount-${Date.now()}`,
    parameterData: {
      source: "user",
      ...((data?.amountParamData && {
        ...data.amountParamData,
      }) || { value: "100" }),
    },
  }));

  // Asset image mapping
  const assetImages = {
    bitcoin: bitcoinLogo,
    ethereum: ethereumLogo,
    btc: bitcoinLogo,
    eth: ethereumLogo,
  };

  const currentAsset = selectedAsset || DEFAULT_ASSET;
  const assetImage = assetImages[currentAsset] || bitcoinLogo;

  // Ensure action is always "sell"
  useEffect(() => {
    if (action !== "sell") {
      setAction("sell");
      updateNodeData(id, { action: "sell" });
    }
  }, [action, id, updateNodeData]);

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

  return (
    <NodeDefault id={id} title="Sell" left={{ active: true, type: "target" }}>
      <div className="sell-container">
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

        <div className="amount-field">
          <label className="amount-label">Amount:</label>
          <div className="amount-input-container">
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Enter amount in percentages"
              className="amount-input"
            />
            <span className="amount-suffix">%</span>
          </div>
        </div>
      </div>
    </NodeDefault>
  );
}

Sell.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
