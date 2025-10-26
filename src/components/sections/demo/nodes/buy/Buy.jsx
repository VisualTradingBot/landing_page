import "./buy.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import bitcoinLogo from "../../../../../assets/images/bitcoin.png";
import ethereumLogo from "../../../../../assets/images/etherium.png";

export default function Buy({ data, id }) {
  const { updateNodeData, getNodes } = useReactFlow();
  const [action, setAction] = useState("buy");
  const [type, setType] = useState(data?.type || "market");
  const [amount, setAmount] = useState(data?.amount || "10000");

  // Asset image mapping
  const assetImages = {
    bitcoin: bitcoinLogo,
    ethereum: ethereumLogo,
    btc: bitcoinLogo,
    eth: ethereumLogo
  };

  // Get asset from input node
  const getAssetFromInput = () => {
    const nodes = getNodes();
    const inputNode = nodes.find((n) => n.type === "inputNode");
    return inputNode?.data?.asset || "bitcoin";
  };

  const currentAsset = getAssetFromInput();
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
    const numericValue = value.replace(/[^\d.]/g, '');
    setAmount(numericValue);
    updateNodeData(id, { amount: numericValue });
  };

  // Format number with thousands separators
  const formatAmount = (value) => {
    if (!value) return '';
    // Remove any existing formatting
    const numericValue = value.replace(/\./g, '');
    // Add thousands separators
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Get display value (formatted) vs actual value (unformatted)
  const displayAmount = formatAmount(amount);

  return (
    <NodeDefault
      id={id}
      title="Buy"
      left={{ active: true, type: "target" }}
      bottom={{ active: true, type: "source" }}
    >
      {/* Purple exclamation mark indicator */}
      <div className="buy-indicator">
        <span className="exclamation-mark">!</span>
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
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'inline';
            }}
          />
          <span className="asset-fallback" style={{ display: 'none' }}>
            {currentAsset === 'bitcoin' ? '₿' : '🔷'}
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
};
