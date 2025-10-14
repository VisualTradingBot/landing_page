import "./execute.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState } from "react";
import { useReactFlow } from "@xyflow/react";

export default function Execute({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const [selectType, setSelectType] = useState("");

  const handleChange = (event) => {
    setSelectType(event.target.value);
    updateNodeData("indicatorNode", { type: selectType });
  };

  return (
    <NodeDefault
      id={id}
      title={data.label}
      left={{ active: true, type: "target" }}
    >
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
