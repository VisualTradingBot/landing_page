import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  addEdge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import BacktestView from "./back-test/BacktestView";
import Execute from "./nodes/execute/Execute";
import If from "./nodes/if/If";
import SetParameter from "./nodes/setParameter/SetParameter";
import Input from "./nodes/input/Input";
import Indicator from "./nodes/indicator/Indicator";
import "./demo.scss";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

const initialNodes = [
  {
    id: "inputNode",
    type: "inputNode",
    position: { x: 100, y: 0 },
    data: { label: "Input" },
  },
  {
    id: "indicatorNode",
    type: "indicatorNode",
    position: { x: 400, y: 0 },
    data: { label: "Indicator" },
  } /*
  {
    id: "setParameterNode",
    type: "setParameterNode",
    position: { x: 200, y: 400 },
    data: { label: "Set Parameter" },
  },*/,
  {
    id: "ifNode-1",
    type: "ifNode",
    position: { x: 400, y: 200 },
    data: {
      label: "If",
      term1: "close",
      operator: ">",
      term2: "Highest_Price_30d",
    },
  },
  {
    id: "ifNode-2",
    type: "ifNode",
    position: { x: 650, y: 350 },
    data: { label: "If", term1: "close", operator: "<", term2: "entry * 0.95" },
  },
  {
    id: "executeNode-1",
    type: "executeNode",
    position: { x: 650, y: 500 },
    data: { label: "Execute" },
  },
  {
    id: "executeNode-2",
    type: "executeNode",
    position: { x: 950, y: 450 },
    data: { label: "Execute" },
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
  {
    id: "n1-n2",
    source: "inputNode",
    sourceHandle: "inputNode-right",
    target: "indicatorNode",
    targetHandle: "indicatorNode-left",
  },
  {
    id: "n2-n3.1",
    source: "indicatorNode",
    sourceHandle: "indicatorNode-bottom",
    target: "ifNode-1",
    targetHandle: "ifNode-1-top",
  },
  {
    id: "n3.1-n4.1",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-bottom",
    target: "executeNode-1",
    targetHandle: "executeNode-1-left",
  },
  {
    id: "n3.1-n3.2",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-right",
    target: "ifNode-2",
    targetHandle: "ifNode-2-top",
  },
  {
    id: "n3.2-n4.2",
    source: "ifNode-2",
    sourceHandle: "ifNode-2-bottom",
    target: "executeNode-2",
    targetHandle: "executeNode-2-left",
  },
];

export default function Demo() {
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [setEdges]
  );

  // Memoize node types to avoid re-creating components each render
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Compute translateExtent based on container size so the draggable area feels correct
  const containerRef = useRef(null);
  const [translateExtent, setTranslateExtent] = useState([
    [0, 0],
    [1200, 800],
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateExtent() {
      // Use container width/height or fallback to defaults
      const width = el.clientWidth || 1200;
      const height = el.clientHeight || 800;
      // Allow extra padding so nodes near edges aren't clipped
      setTranslateExtent([
        [0, 0],
        [Math.max(1200, width), Math.max(800, height)],
      ]);
    }

    updateExtent();
    const ro = new ResizeObserver(updateExtent);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Run validation checks only when nodes or edges change
  useEffect(() => {
    nodes.forEach((node) => {
      if (!node || !node.position) return;
      if (isNaN(node.position.x) || isNaN(node.position.y)) {
        console.warn("Invalid position in node:", node);
      }
    });

    edges.forEach((edge) => {
      if (!edge) return;
      if (
        !nodes.find((n) => n.id === edge.source) ||
        !nodes.find((n) => n.id === edge.target)
      ) {
        console.warn("Edge refers to missing node:", edge);
      }
    });
  }, [nodes, edges]);

  return (
    <section id="demo" className="demo">
      <div ref={containerRef} style={{ width: "100%", height: "50vh" }}>
        <ReactFlow
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }} // DO NOT REMOVE THE ZOOM PROPERTY, EVERYTHING WILL GO TO HELL FOR SOME UNKNOWN REASON
          nodes={nodes}
          nodeTypes={memoizedNodeTypes}
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
          translateExtent={translateExtent}
        >
          <Panel position="top-left">
            <div className="parameter-table">
              <h1>Parameters</h1>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      <div className="divider"></div>

      {/* Backtest visualization */}
      <div className="backtest">
        <BacktestView />
      </div>
    </section>
  );
}
