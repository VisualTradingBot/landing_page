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
  { id: "param-3", label: "close_price", value: "close", family: "variable" },
  { id: "param-4", label: "indicator_output", value: "", family: "variable" },
];

// Helper to find a parameter by its label for easier wiring.
const getParam = (label) => initialParameters.find((p) => p.label === label);

// 2. Pre-configure nodes with data linked to the initial parameters.
const initialNodes = [
  {
    id: "inputNode",
    type: "inputNode",
    position: { x: 50, y: 50 },
    data: {
      label: "Input",
      parameters: initialParameters,
    },
  },
  {
    id: "indicatorNode",
    type: "indicatorNode",
    position: { x: 400, y: 100 },
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
  {
    id: "ifNode-1",
    type: "ifNode",
    position: { x: 400, y: 300 },
    data: {
      label: "If Entry",
      parameters: initialParameters,
      variables: [
        {
          label: "var-1",
          id: `var-if1-left`,
          parameterData: {
            parameterId: getParam("close_price").id,
            ...getParam("close_price"),
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
  {
    id: "ifNode-2",
    type: "ifNode",
    position: { x: 650, y: 450 },
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
    id: "executeNode-1",
    type: "executeNode",
    position: { x: 350, y: 600 },
    data: { label: "Execute Buy", action: "buy" },
  },
  {
    id: "executeNode-2",
    type: "executeNode",
    position: { x: 800, y: 550 },
    data: { label: "Execute Sell", action: "sell" },
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
    id: "n3.1-n4.1",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-bottom",
    target: "executeNode-1",
    targetHandle: "executeNode-1-left",
    label: "True",
  },
  {
    id: "n3.1-n3.2",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-right",
    target: "ifNode-2",
    targetHandle: "ifNode-2-top",
    label: "False",
  },
  {
    id: "n3.2-n4.2",
    source: "ifNode-2",
    sourceHandle: "ifNode-2-bottom",
    target: "executeNode-2",
    targetHandle: "executeNode-2-left",
    label: "True",
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
    [0, 0],
    [1200, 800],
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateExtent() {
      const width = el.clientWidth || 1200;
      const height = el.clientHeight || 800;
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
      lookback: 30,
      stopLossPercent: 5,
      feePercent: 0.05,
    };

    const edgeMap = new Map();
    edges.forEach((e) => {
      if (!edgeMap.has(e.source)) edgeMap.set(e.source, []);
      edgeMap.get(e.source).push(e.target);
    });

    const reachable = new Set();
    const stack = ["inputNode", "indicatorNode"];
    while (stack.length) {
      const cur = stack.pop();
      if (reachable.has(cur)) continue;
      reachable.add(cur);
      const nexts = edgeMap.get(cur) || [];
      nexts.forEach((n) => stack.push(n));
    }

    const inputNode = nodes.find((n) => n.id === "inputNode");
    const useSynthetic = inputNode?.data?.dataSource !== "real";

    const actions = { firstIfTrue: "buy", secondIfTrue: "sell" };
    const if1 = nodes.find((n) => n.id === "ifNode-1");
    const if2 = nodes.find((n) => n.id === "ifNode-2");
    const e1Edge = edges.find(
      (e) => e.source === if1?.id && e.target?.startsWith("executeNode")
    );
    const e2Edge = edges.find(
      (e) => e.source === if2?.id && e.target?.startsWith("executeNode")
    );
    const exec1 = nodes.find((n) => n.id === (e1Edge && e1Edge.target));
    const exec2 = nodes.find((n) => n.id === (e2Edge && e2Edge.target));
    if (exec1?.data?.action) actions.firstIfTrue = exec1.data.action;
    if (exec2?.data?.action) actions.secondIfTrue = exec2.data.action;

    const indicator = nodes.find((n) => n.id === "indicatorNode");
    const indicatorParamIds = [];
    let indicatorWindow = null;
    let indicatorType = "30d_high"; // default
    if (indicator?.data?.variables) {
      indicator.data.variables.forEach((v) => {
        const pid = v?.parameterData?.parameterId;
        if (pid && v.label === "output") indicatorParamIds.push(pid);
        if (v.label === "window") {
          const raw = v?.parameterData?.value;
          const n = Number(raw);
          if (!Number.isNaN(n) && n > 0) indicatorWindow = n;
        }
      });
    }
    // Get indicator type from node data
    if (indicator?.data?.type) {
      indicatorType = indicator.data.type;
    }

    const extractIfComparison = (ifNode) => {
      if (!ifNode?.data?.variables) return null;
      const vars = ifNode.data.variables;
      const leftPid = vars[0]?.parameterData?.parameterId || null;
      const rightPid = vars[1]?.parameterData?.parameterId || null;
      const opParam = vars[2]?.parameterData;
      let operator = ">";
      if (opParam && typeof opParam === "object" && opParam.parameterId) {
        operator = null;
      } else if (typeof opParam === "string" && opParam) {
        operator = opParam;
      }
      return {
        nodeId: ifNode.id,
        leftParamId: leftPid,
        rightParamId: rightPid,
        operator,
      };
    };

    const ifComparisons = [];
    const c1 = extractIfComparison(if1);
    if (c1) ifComparisons.push(c1);
    const c2 = extractIfComparison(if2);
    if (c2) ifComparisons.push(c2);

    const paramValues = {};
    parameters.forEach((p) => {
      const num = Number(p.value);
      paramValues[p.id] = Number.isNaN(num) ? p.value : num;
    });

    ifComparisons.forEach((c) => {
      if (c && c.operator == null) {
        const node = nodes.find((n) => n.id === c.nodeId);
        const opVar = node?.data?.variables?.[2];
        const opPid = opVar?.parameterData?.parameterId;
        const raw = opPid ? paramValues[opPid] : null;
        if (typeof raw === "string") c.operator = raw.trim();
        if (!c.operator) c.operator = ">";
      }
    });

    if (indicatorWindow != null) opts.lookback = indicatorWindow;

    if (inputNode?.data?.variables) {
      inputNode.data.variables.forEach((v) => {
        const pid = v?.parameterData?.parameterId;
        if (!pid) return;
        const label = String(v.label || "").toLowerCase();
        const raw = paramValues[pid];
        if (label === "asset" && typeof raw === "string") {
          const val = raw.toLowerCase();
          if (["bitcoin", "btc"].includes(val)) opts.asset = "bitcoin";
          else if (["ethereum", "eth"].includes(val)) opts.asset = "ethereum";
        }
        if (label === "fee") {
          const n = Number(raw);
          if (!Number.isNaN(n) && n >= 0) opts.feePercent = n;
        }
      });
    }

    if (inputNode?.data?.asset) {
      if (!opts.asset) opts.asset = inputNode.data.asset;
    }

    // --- START OF CHANGES ---
    // 4. Derive stop-loss percentage from parameters for visualization purposes.
    let stopLossParamValue = null;
    if (if2?.data?.variables) {
      const rightPid = if2.data.variables[1]?.parameterData?.parameterId;
      if (rightPid) {
        stopLossParamValue = paramValues[rightPid];
      }
    }

    if (typeof stopLossParamValue === "string") {
      const match = stopLossParamValue.match(/entry\s*\*\s*([0-9]*\.?[0-9]+)/);
      if (match && match[1]) {
        const multiplier = parseFloat(match[1]);
        opts.stopLossPercent = parseFloat(((1 - multiplier) * 100).toFixed(2));
      }
    }
    // --- END OF CHANGES ---

    const resolveExecAction = (execNode) => {
      if (!execNode?.data?.variables) return null;
      const v = execNode.data.variables.find(
        (x) => String(x.label).toLowerCase() === "action"
      );
      const pid = v?.parameterData?.parameterId;
      if (pid && typeof paramValues[pid] === "string") {
        const s = paramValues[pid].toLowerCase();
        if (s === "buy" || s === "sell") return s;
      }
      return execNode?.data?.action || null;
    };
    const a1 = resolveExecAction(exec1);
    const a2 = resolveExecAction(exec2);
    if (a1) actions.firstIfTrue = a1;
    if (a2) actions.secondIfTrue = a2;

    opts.graph = {
      actions,
      indicatorParamIds,
      indicatorType,
      ifComparisons,
      paramValues,
    };
    opts.useSynthetic = useSynthetic;

    return opts;
  }, [nodes, edges, parameters]);

  return (
    <section id="demo" className="demo">
      <div ref={containerRef} style={{ width: "100%", height: "50vh" }}>
        <ReactFlow
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
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
          <Panel position="bottom-left">
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
