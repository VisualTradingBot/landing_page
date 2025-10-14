import "./indicator.scss";
import NodeDefault from "../nodeDefault";
import { useReactFlow, useNodeConnections, useNodesData } from "@xyflow/react";
import { useState } from "react";
import PropTypes from "prop-types";

export default function Indicator({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const [selectType, setSelectType] = useState("");

  const handleChange = (event) => {
    setSelectType(event.target.value);
    updateNodeData("indicatorNode", { type: selectType });
  };

  const getConnection = useNodeConnections();
  //const sourceData = useNodesData(getConnection?.[0].source);

  return (
    <NodeDefault
      id={id}
      title={data.label}
      bottom={{ active: true, type: "source" }}
      left={{ active: true, type: "target" }}
    >
      <div className="switch-case">
        <select onChange={handleChange} value={selectType}>
          <option value="" disabled>
            Select your option:
          </option>
          <option value="average">30-day rolling high</option>
        </select>
      </div>
    </NodeDefault>
  );
}

Indicator.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
