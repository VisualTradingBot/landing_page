import "./setParameter.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

export default function SetParameter({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const [parameterName, setParameterName] = useState(data?.parameterName || "entry_price");

  const getParameterColor = (paramName) => {
    const label = paramName.toLowerCase();
    if (label.includes('close') || label.includes('close price')) {
      return 'green';
    }
    if (label.includes('indicator') || label.includes('output')) {
      return 'dark-blue';
    }
    if (label.includes('entry') || label.includes('entry price')) {
      return 'pink';
    }
    return 'default';
  };

  const parameterColor = getParameterColor(parameterName);

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