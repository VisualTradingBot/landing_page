import "./if.scss";
import NodeDefault from "../nodeDefault";
import { useNodesData, useNodeConnections } from "@xyflow/react";

export default function If() {
  const getConnection = useNodeConnections();
  const sourceData = useNodesData(getConnection?.[0].source);
  console.log("If node source data:", sourceData);

  return (
    <NodeDefault
      title="If Node"
      top={{ active: true, type: "target" }}
      bottom={{ active: true, type: "source" }}
      right={{ active: true, type: "source" }}
    >
      <div className="box">{sourceData?.data.type}</div>
    </NodeDefault>
  );
}
