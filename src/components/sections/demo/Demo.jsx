import { useState, useCallback } from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./demo.scss";

const initialNodes = [
  { id: "n1", position: { x: 0, y: 0 }, data: { label: "Node 1" } },
  { id: "n2", position: { x: 0, y: 100 }, data: { label: "Node 2" } },
];
const initialEdges = [{ id: "n1-n2", source: "n1", target: "n2" }];

export default function Demo() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    []
  );
  return (
    <section id="demo" className="demo">
      <div style={{ width: "100%", height: "50vh" }}>
        <ReactFlow
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          preventScrolling={false}
          autoPanOnNodeDrag={false}
          maxZoom={1}
          minZoom={1}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          translateExtent={[
            [0, 0],
            [1200, 800],
          ]}
        />
      </div>

      <div className="divider"></div>
    </section>
  );
}
