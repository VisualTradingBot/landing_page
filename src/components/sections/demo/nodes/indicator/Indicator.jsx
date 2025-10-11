import "./indicator.scss";
import NodeDefault from "../nodeDefault";
import { useReactFlow } from "@xyflow/react";

export default function Indicator() {
  const { updateNodeData } = useReactFlow();

  const handleChange = (event) => {
    updateNodeData("indicatorNode", { type: event.target.value });
  };

  return (
    <NodeDefault title="Indicator Node" bottom="ind-bottom" top={true}>
      <select onChange={handleChange}>
        <option value="average">Average</option>
        <option value="sum">Sum</option>
        <option value="min">Min</option>
        <option value="max">Max</option>
        <option value="count">Count</option>
      </select>
    </NodeDefault>
  );
}
