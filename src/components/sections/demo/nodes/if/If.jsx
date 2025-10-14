import "./if.scss";
import PropTypes from "prop-types";
import NodeDefault from "../nodeDefault";
import { useNodesData, useNodeConnections } from "@xyflow/react";

export default function If({ data, id }) {
  const getConnection = useNodeConnections();
  //const sourceData = useNodesData(getConnection?.[0].source);

  return (
    <NodeDefault
      id={id}
      title={data.label}
      top={{ active: true, type: "target" }}
      bottom={{ active: true, type: "source" }}
      right={{ active: true, type: "source" }}
    >
      <div className="condition-row">
        <div>{data.term1}</div>
        <div>{data.operator}</div>
        <div>{data.term2}</div>
      </div>
    </NodeDefault>
  );
}

If.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
