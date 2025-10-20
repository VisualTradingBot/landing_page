import "./execute.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState } from "react";
import { useReactFlow } from "@xyflow/react";

export default function Execute({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const [selectType, setSelectType] = useState(data?.action || "");

  const handleChange = (event) => {
    const value = event.target.value;
    setSelectType(value);
    updateNodeData(id, { action: value });
  };

  return (
    <NodeDefault
      id={id}
      title={data.label}
      left={{ active: true, type: "target" }}
    >
      <div
        className="hint-line"
        title="Bind an 'action' parameter with value 'buy' or 'sell' to override the dropdown."
      >
        <span className="hint-icon">i</span>
        Action
      </div>
      <div className="switch-case">
        <select onChange={handleChange} value={selectType}>
          <option value="" disabled>
            Select your option:
          </option>
          <option value="buy">buy</option>
          <option value="sell">sell</option>
        </select>
      </div>
    </NodeDefault>
  );
}

Execute.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
