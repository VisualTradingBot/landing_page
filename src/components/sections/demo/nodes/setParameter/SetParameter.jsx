import "./setParameter.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

export default function SetParameter({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const [parameterName, setParameterName] = useState(data?.parameterName || "entry_price");

  const handleParameterNameChange = (event) => {
    const value = event.target.value;
    setParameterName(value);
    updateNodeData(id, { parameterName: value });
  };

  return (
    <NodeDefault
      id={id}
      title="Set Parameter"
      left={{ active: true, type: "target" }}
    >
      <div className="set-parameter-container">
        <div className="parameter-field">
          <label className="parameter-label">Parameter:</label>
          <div className="parameter-input-container">
            <span className="parameter-icon pink"></span>
            <input
              type="text"
              value={parameterName}
              onChange={handleParameterNameChange}
              placeholder="entry_price"
              className="parameter-input"
            />
          </div>
        </div>
      </div>
    </NodeDefault>
  );
}

SetParameter.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};