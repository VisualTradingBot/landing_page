import { useCallback } from "react";
import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  addEdge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import Execute from "./nodes/execute/Execute";
import If from "./nodes/if/If";
import SetParameter from "./nodes/setParameter/SetParameter";
import Input from "./nodes/input/Input";
import Indicator from "./nodes/indicator/Indicator";
import "./demo.scss";

const initialNodes = [
  {
    id: "inputNode",
    type: "inputNode",
    position: { x: 200, y: 0 },
    data: { label: Input },
  },
  {
    id: "indicatorNode",
    type: "indicatorNode",
    position: { x: 200, y: 200 },
    data: { label: Indicator },
  },
  {
    id: "setParameterNode",
    type: "setParameterNode",
    position: { x: 200, y: 400 },
    data: { label: Execute },
  },
  {
    id: "ifNode",
    type: "ifNode",
    position: { x: 600, y: 200 },
    data: { label: If },
  },
  {
    id: "executeNode",
    type: "executeNode",
    position: { x: 800, y: 400 },
    data: { label: Execute },
  },
];

const nodeTypes = {
  executeNode: Execute,
  ifNode: If,
  inputNode: Input,
  indicatorNode: Indicator,
  setParameterNode: SetParameter,
};
const initialEdges = [
  { id: "n1-n2", source: "inputNode", target: "indicatorNode" },
  { id: "n2-n3", source: "indicatorNode", target: "ifNode" },
  { id: "n3-n4", source: "ifNode", target: "executeNode" },
];

export default function Demo() {
  // eslint-disable-next-line no-unused-vars
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [setEdges]
  );
  return (
    <section id="demo" className="demo">
      <div style={{ width: "100%", height: "50vh" }}>
        <ReactFlow
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodes={nodes}
          nodeTypes={nodeTypes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          preventScrolling={false}
          autoPanOnNodeDrag={false}
          maxZoom={0.9}
          minZoom={0.9}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          translateExtent={[
            [0, 0],
            [1200, 800],
          ]}
        >
          <Panel position="top-left">top-left</Panel>
        </ReactFlow>
      </div>

      <div className="divider"></div>
    </section>
  );
}
