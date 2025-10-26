import "./sell.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import bitcoinLogo from "../../../../../assets/images/bitcoin.png";
import ethereumLogo from "../../../../../assets/images/etherium.png";
import { useAsset } from "../../AssetContext";

export default function Sell({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const { selectedAsset } = useAsset();
  const [action, setAction] = useState("sell");
  const [amount, setAmount] = useState(data?.amount || "");

  // Asset image mapping
  const assetImages = {
    bitcoin: bitcoinLogo,
    ethereum: ethereumLogo,
    btc: bitcoinLogo,
    eth: ethereumLogo
  };

  const currentAsset = selectedAsset || "bitcoin";
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
    setAmount(value);
    updateNodeData(id, { amount: value });
  };

  return (
    <NodeDefault
      id={id}
      title="Sell"
      left={{ active: true, type: "target" }}
    >
      <div className="sell-container">
        <div className="asset-display">
          <span className="asset-label">Asset:</span>
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
