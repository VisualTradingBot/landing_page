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

  return (
    <NodeDefault
      id={id}
      title="Buy"
      left={{ active: true, type: "target" }}
    >
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
      </div>
    </NodeDefault>
  );
}

Buy.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
