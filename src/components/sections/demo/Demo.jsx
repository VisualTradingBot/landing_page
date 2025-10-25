import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  addEdge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ParameterBlock from "./parameter-block/ParameterBlock";
import BacktestView from "./back-test/BacktestView";

// Nodes
import Execute from "./nodes/execute/Execute";
import If from "./nodes/if/If";
import SetParameter from "./nodes/setParameter/SetParameter";
import Input from "./nodes/input/Input";
import Indicator from "./nodes/indicator/Indicator";
import "./demo.scss";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

// --- START OF CHANGES ---

// 1. Define initial parameters for the demo strategy.
const initialParameters = [
  { id: "param-1", label: "lookback_window", value: "30", family: "variable" },
  {
    id: "param-2",
    label: "stop_loss_level",
    value: "entry * 0.95",
    family: "variable",
  },
  {
    id: "param-5",
    label: "profit_target",
    value: "entry * 1.10",
    family: "variable",
  },
  { id: "param-3", label: "close_price", value: "close", family: "variable" },
  { id: "param-4", label: "indicator_output", value: "", family: "variable" },
  // Separate entry price reference - not affected by multiplications
  {
    id: "param-6",
    label: "entry_price_reference",
    value: "close",
    family: "variable",
  },
];

// Helper to find a parameter by its label for easier wiring.
const getParam = (label) => initialParameters.find((p) => p.label === label);

// 2. Pre-configure nodes with data linked to the initial parameters.
// Organized in logical flow: Input → Indicator → Decision Logic → Execution
const initialNodes = [
  // Data Input Layer
  {
    id: "inputNode",
    type: "inputNode",
    position: { x: -200, y: 0 },
    data: {
      label: "Input",
      parameters: initialParameters,
    },
  },
  // Analysis Layer
  {
    id: "indicatorNode",
    type: "indicatorNode",
    position: { x: 50, y: 200 },
    data: {
      label: "Indicator",
      parameters: initialParameters,
      variables: [
        {
          label: "output",
          id: `var-indicator-output`,
          parameterData: {
            parameterId: getParam("indicator_output").id,
            ...getParam("indicator_output"),
          },
        },
        {
          label: "window",
          id: `var-indicator-window`,
          parameterData: {
            parameterId: getParam("lookback_window").id,
            ...getParam("lookback_window"),
          },
        },
      ],
    },
  },
  // Decision Logic Layer - Entry Decision
  {
    id: "ifNode-1",
    type: "ifNode",
    position: { x: 300, y: 20 },
    data: {
      label: "If Entry",
      parameters: initialParameters,
      isMaster: true, // Mark as master node
      variables: [
        {
          label: "var-1",
          id: `var-if1-left`,
          parameterData: {
            parameterId: getParam("entry_price_reference").id,
            ...getParam("entry_price_reference"),
          },
        },
        {
          label: "var-2",
          id: `var-if1-right`,
          parameterData: {
            parameterId: getParam("indicator_output").id,
            ...getParam("indicator_output"),
          },
        },
        { label: "operator", id: `var-if1-op`, parameterData: ">" },
      ],
    },
  },
  // Execution Layer - Entry Action
  {
    id: "executeNode-1",
    type: "executeNode",
    position: { x: 580, y: 180 },
    data: { label: "Execute Buy", action: "buy" },
  },
  // Decision Logic Layer - Exit Decisions
  {
    id: "ifNode-2",
    type: "ifNode",
    position: { x: 780, y: 150 },
    data: {
      label: "If Exit (Stop-Loss)",
      parameters: initialParameters,
      variables: [
        {
          label: "var-1",
          id: `var-if2-left`,
          parameterData: {
            parameterId: getParam("close_price").id,
            ...getParam("close_price"),
          },
        },
        {
          label: "var-2",
          id: `var-if2-right`,
          parameterData: {
            parameterId: getParam("stop_loss_level").id,
            ...getParam("stop_loss_level"),
          },
        },
        { label: "operator", id: `var-if2-op`, parameterData: "<" },
      ],
    },
  },
  {
    id: "executeNode-2",
    type: "executeNode",
    position: { x: 1000, y: 320 },
    data: { label: "Execute Sell (Stop-Loss)", action: "sell" },
  },
  {
    id: "ifNode-3",
    type: "ifNode",
    position: { x: 1200, y: 280 },
    data: {
      label: "If Exit (Profit)",
      parameters: initialParameters,
      variables: [
        {
          label: "var-1",
          id: `var-if3-left`,
          parameterData: {
            parameterId: getParam("close_price").id,
            ...getParam("close_price"),
          },
        },
        {
          label: "var-2",
          id: `var-if3-right`,
          parameterData: {
            parameterId: getParam("profit_target").id,
            ...getParam("profit_target"),
          },
        },
        { label: "operator", id: `var-if3-op`, parameterData: ">" },
      ],
    },
  },
  {
    id: "executeNode-3",
    type: "executeNode",
    position: { x: 1430, y: 450 },
    data: { label: "Execute Sell (Profit)", action: "sell" },
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
  // Data flow connection (Input → Indicator)
  {
    id: "n1-n2",
    source: "inputNode",
    sourceHandle: "inputNode-right",
    target: "indicatorNode",
    targetHandle: "indicatorNode-left",
    type: "dataFlow",
    animated: true,
    style: {
      stroke: "var(--accent)",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Entry decision - True path
  {
    id: "n3.1-n4.1",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-bottom",
    target: "executeNode-1",
    targetHandle: "executeNode-1-left",
    label: "True",
    type: "execution",
    animated: true,
    style: {
      stroke: "var(--accent)",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
    labelStyle: {
      fill: "var(--accent)",
      fontWeight: 600,
    },
  },
  // Entry decision - False path
  {
    id: "n3.1-n3.2",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-right",
    target: "ifNode-2",
    targetHandle: "ifNode-2-top",
    label: "False",
    type: "logic",
    animated: true,
    style: {
      stroke: "var(--accent)",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
    labelStyle: {
      fill: "var(--accent)",
      fontWeight: 600,
    },
  },
  // Stop-loss decision - True path
  {
    id: "n3.2-n4.2",
    source: "ifNode-2",
    sourceHandle: "ifNode-2-bottom",
    target: "executeNode-2",
    targetHandle: "executeNode-2-left",
    label: "True",
    type: "execution",
    animated: true,
    style: {
      stroke: "var(--accent)",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
    labelStyle: {
      fill: "var(--accent)",
      fontWeight: 600,
    },
  },
  // Stop-loss decision - False path
  {
    id: "n3.2-n3.3",
    source: "ifNode-2",
    sourceHandle: "ifNode-2-right",
    target: "ifNode-3",
    targetHandle: "ifNode-3-top",
    label: "False",
    type: "logic",
    animated: true,
    style: {
      stroke: "var(--accent)",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
    labelStyle: {
      fill: "var(--accent)",
      fontWeight: 600,
    },
  },
  // Profit decision - True path
  {
    id: "n3.3-n4.3",
    source: "ifNode-3",
    sourceHandle: "ifNode-3-bottom",
    target: "executeNode-3",
    targetHandle: "executeNode-3-left",
    label: "True",
    type: "execution",
    animated: true,
    style: {
      stroke: "var(--accent)",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
    labelStyle: {
      fill: "var(--accent)",
      fontWeight: 600,
    },
  },
];

export default function Demo() {
  const [parameters, setParameters] = useState(initialParameters);
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [setEdges]
  );

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  const containerRef = useRef(null);
  const [translateExtent, setTranslateExtent] = useState([
    [-400, -200],
    [1600, 800],
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateExtent() {
      const width = el.clientWidth || 1400;
      const height = el.clientHeight || 600;
      setTranslateExtent([
        [-400, -200],
        [Math.max(1600, width + 200), Math.max(800, height + 200)],
      ]);
    }

    updateExtent();
    const ro = new ResizeObserver(updateExtent);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const handleAddParameter = useCallback(() => {
    const newParameter = {
      label: "parameter" + (parameters.length + 1),
      value: "value" + (parameters.length + 1),
      family: "variable",
      id: `${+new Date()}`,
    };

    setParameters((prev) => [...prev, newParameter]);
  }, [parameters, setParameters]);

  const handleRemoveParameter = useCallback(
    (index) => {
      setParameters((prev) => prev.filter((_, i) => i !== index));
    },
    [setParameters]
  );

  // Update nodes when parameters change
  // This ensures nodes receive the updated parameters array, and individual node components
  // (like VariableFieldStandalone) will handle updating their own parameterData
  useEffect(() => {
    _setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          parameters: parameters,
        },
      }))
    );
  }, [parameters, _setNodes]);

  const backtestOptions = useMemo(() => {
    const opts = {
      asset: "bitcoin",
      feePercent: 0.05,
      useGraphExecutor: true,
    };

    // Find input node to determine data source and asset
    const inputNode = nodes.find((n) => n.type === "inputNode");
    const useSynthetic = inputNode?.data?.dataSource !== "real";

    if (inputNode?.data?.asset) {
      opts.asset = inputNode.data.asset;
    }

    opts.useSynthetic = useSynthetic;
    opts.nodes = nodes;
    opts.edges = edges;

    // Extract lookback and indicator info for visualization only
    const indicator = nodes.find((n) => n.type === "indicatorNode");
    if (indicator?.data?.variables) {
      const windowVar = indicator.data.variables.find(
        (v) => v.label === "window"
      );
      const windowValue = windowVar?.parameterData?.value;
      const n = Number(windowValue);
      if (!Number.isNaN(n) && n > 0) {
        opts.lookback = n;
      }
    }
    if (!opts.lookback) opts.lookback = 30;

    // Get indicator type for visualization
    const indicatorType = indicator?.data?.type || "30d_high";
    opts.graph = { indicatorType };

    return opts;
  }, [nodes, edges]);

  return (
    <section id="demo" className="demo">
      <div ref={containerRef} style={{ width: "100%", height: "75vh", minHeight: "650px", position: "relative", background: "transparent" }}>
        <ReactFlow
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          nodes={nodes}
          nodeTypes={memoizedNodeTypes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          preventScrolling={false}
          autoPanOnNodeDrag={true}
          maxZoom={1.2}
          minZoom={0.6}
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          translateExtent={translateExtent}
          fitView={false}
        >
          <Panel position="top-center">
            <ParameterBlock
              handleRemoveParameter={handleRemoveParameter}
              handleAddParameter={handleAddParameter}
              parameters={parameters}
              setParameters={setParameters}
            />
          </Panel>
        </ReactFlow>
      </div>

      <div className="divider"></div>

      <div className="backtest">
        <BacktestView
          options={backtestOptions}
          externalControl
          useSynthetic={backtestOptions.useSynthetic}
        />
      </div>
    </section>
  );
}
