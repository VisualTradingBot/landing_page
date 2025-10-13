import "./indicator.scss";
import NodeDefault from "../nodeDefault";
import { useReactFlow, useNodeConnections, useNodesData } from "@xyflow/react";

export default function Indicator() {
  const { updateNodeData } = useReactFlow();

  const handleChange = (event) => {
    updateNodeData("indicatorNode", { type: event.target.value });
  };

  const getConnection = useNodeConnections();
  const sourceData = useNodesData(getConnection?.[0].source);
  console.log("Input node source data:", sourceData);

  return (
    <NodeDefault
      title="Indicator Node"
      bottom={{ active: true, type: "source" }}
      top={{ active: true, type: "target" }}
    >
      <div className="switch-case">
        <select onChange={handleChange}>
          <option value="" disabled selected>
            Select your option:
          </option>
          <option value="average">Average</option>
          <option value="sum">Sum</option>
          <option value="min">Min</option>
          <option value="max">Max</option>
          <option value="count">Count</option>
        </select>
        <p>{sourceData?.data.input}</p>
      </div>
    </NodeDefault>
  );
}
