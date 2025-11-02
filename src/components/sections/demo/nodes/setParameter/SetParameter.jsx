import "./setParameter.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

export default function SetParameter({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const [parameterName, setParameterName] = useState(
    data?.parameterName || "live_price"
  );

  const getParameterColor = (paramName) => {
    const label = paramName.toLowerCase();
    if (label.includes("indicator") || label.includes("output")) {
      return "dark-blue";
    }
    if (label.includes("entry")) {
      return "pink";
    }
    if (label.includes("live")) {
      return "red";
    }
    return "default";
  };

  const parameterColor = getParameterColor(parameterName);

  const handleParameterNameChange = (event) => {
    const value = event.target.value;
    setParameterName(value);
    updateNodeData(id, { parameterName: value });
  };

  // Expose a canonical outputParamName for backend consumption
  useEffect(() => {
    if (updateNodeData && id) {
      updateNodeData(id, {
        parameterName: parameterName,
        outputParamName: parameterName,
      });
    }
  }, [parameterName, id, updateNodeData]);

  return (
    <NodeDefault
      id={id}
      title="Set Parameter"
      left={{ active: true, type: "target" }}
    >
      <div className={`set-parameter-container ${parameterColor}`}>
        <div className="parameter-field">
          <label className="parameter-label">Parameter:</label>
          <div className="parameter-input-container">
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
