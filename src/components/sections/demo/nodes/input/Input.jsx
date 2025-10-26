import "./input.scss";
import NodeDefault from "../nodeDefault";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import PropTypes from "prop-types";

export default function Input({ id, data, onAssetChange }) {
  const { updateNodeData } = useReactFlow();
  const [dataSource, setDataSource] = useState(data?.dataSource || "synthetic");
  const [asset, setAsset] = useState(data?.asset || "bitcoin");
  const [type, setType] = useState(data?.type || "batch");

  useEffect(() => {
    if (updateNodeData && id) {
      updateNodeData(id, { asset, dataSource, type });
    }
  }, [asset, dataSource, type, id, updateNodeData]);

  const handleAssetChange = (newAsset) => {
    setAsset(newAsset);
    if (onAssetChange) {
      onAssetChange(newAsset);
    }
  };

  return (
    <NodeDefault
      id={id}
      title="Test Parameters"
    >
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

        <div className="button-row">
          <button 
            className="run-test-button"
            onClick={() => {
              console.log('Run Test clicked with:', { dataSource, asset, type });
              // TODO: Implement test execution logic
            }}
          >
            Run Test
          </button>
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
