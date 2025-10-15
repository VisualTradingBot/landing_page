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
import IntroductionMask from "./mask/IntroductionMask";
import "./demo.scss";

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
  // eslint-disable-next-line no-unused-vars
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [setEdges]
  );

  // Error check

  nodes.forEach((node) => {
    if (isNaN(node.position.x) || isNaN(node.position.y)) {
      console.warn("Invalid position in node:", node);
    }
  });

  edges.forEach((edge) => {
    if (
      !nodes.find((n) => n.id === edge.source) ||
      !nodes.find((n) => n.id === edge.target)
    ) {
      console.warn("Edge refers to missing node:", edge);
    }
  });

  return (
    <section id="demo" className="demo">
      <div className="demo-container">
        <IntroductionMask targetSectionId="demo" />
        <div className="demo-header">
          <h2 className="demo-title">Demo</h2>
        </div>
        <div style={{ width: "100%", height: "600px" }}>
          <ReactFlow
            defaultViewport={{ x: 50, y: 50, zoom: 0.9 }} // DO NOT REMOVE THE ZOOM PROPERTY, EVERYTHING WILL GO TO HELL FOR SOME UNKNOWN REASON
            nodes={nodes}
            nodeTypes={nodeTypes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            preventScrolling={false}
            autoPanOnNodeDrag={false}
            maxZoom={1.0}
            minZoom={0.5}
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            translateExtent={[
              [-200, -200],
              [1400, 1000],
            ]}
          >
            {/*<Panel position="top-left">
            <div className="parameter-table">
              <h1>Parameters</h1>
            </div>
          </Panel>*/}
          </ReactFlow>
        </div>
      </div>

      <div className="divider"></div>
    </section>
  );
}
