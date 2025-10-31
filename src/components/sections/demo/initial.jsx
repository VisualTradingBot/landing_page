export { initialNodes, initialEdges, initialParameters, edgeTypes };
import { StepEdge } from "@xyflow/react";

// 1. Define initial parameters for the demo strategy.
const initialParameters = [
  { id: "param-1", label: "lookback", value: "30", family: "variable" },
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
    label: "entry_price",
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
    id: "inputIndicatorNode",
    type: "inputIndicatorNode",
    position: { x: -200, y: 50 },
    data: {
      resolution: "1h",
      lookbackUnit: "d",
      indicator: "sma",
      lookbackVariable: {
        label: "lookback",
        id: "lookback-input-indicator",
        parameterData: {
          parameterId: "param-1",
          label: "lookback",
          value: "30",
        },
      },
    },
  },
  {
    id: "inputPriceNode",
    type: "inputPriceNode",
    position: { x: -200, y: 300 },
    data: {
      timeFrame: "1h",
      type: "instant",
      format: "close",
    },
  },
  {
    id: "setParameterIndicatorNode",
    type: "setParameterNode",
    position: { x: 350, y: 150 },
    data: { parameterName: "indicator_output", sourceValue: "" },
  },
  {
    id: "inputNode",
    type: "inputNode",
    position: { x: -200, y: 550 },
    data: {
      label: "Test Parameters",
      parameters: initialParameters,
      type: "batch",
    },
  },
  // Analysis Layer
  // Decision Logic Layer - Entry Decision
  {
    id: "ifNode-1",
    type: "ifNode",
    position: { x: 400, y: 300 },
    data: {
      label: "If Entry",
      parameters: initialParameters,
      isMaster: true, // Mark as master node
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
  // Execution Layer - Entry Action
  {
    id: "buyNode-1",
    type: "buyNode",
    position: { x: 640, y: 430 },
    data: { label: "Buy", action: "buy" },
  },
  // Decision Logic Layer - Exit Decisions
  {
    id: "ifNode-2",
    type: "ifNode",
    position: { x: 960, y: 100 },
    draggable: false,
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
    id: "sellNode-1",
    type: "sellNode",
    position: { x: 1230, y: 220 },
    draggable: false,
    data: { label: "Sell (Stop-Loss)", action: "sell", amount: "100" },
  },
  {
    id: "ifNode-3",
    type: "ifNode",
    position: { x: 960, y: 330 },
    draggable: false,
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
    id: "sellNode-2",
    type: "sellNode",
    position: { x: 1230, y: 450 },
    draggable: false,
    data: { label: "Sell (Profit)", action: "sell", amount: "100" },
  },
  // Record blocks
  {
    id: "recordNode-1",
    type: "recordNode",
    position: { x: 638, y: 610 },
    data: { recordType: "entry_price", recordValue: "" },
  },
  // Set Parameter block for entry_price (connected to Record)
  {
    id: "setParameterNode-1",
    type: "setParameterNode",
    position: { x: 960, y: 620 },
    data: { parameterName: "entry_price", sourceValue: "" },
  },
  // Set Parameter block for close_price
  {
    id: "setParameterNode-2",
    type: "setParameterNode",
    position: { x: 160, y: 430 },
    data: { parameterName: "close_price", sourceValue: "" },
  },
  {
    id: "blockNode-1",
    type: "blockNode",
    position: { x: 930, y: 50 },
    data: { label: "In a trade" },
  },
];

// Edge types for ReactFlow - use step edges instead of smooth
const edgeTypes = {
  default: StepEdge,
  step: StepEdge,
  // Custom step edge with shorter initial segment
  shortStep: (props) => (
    <StepEdge
      {...props}
      pathOptions={{
        offset: 2, // Very small offset for shorter initial segment
        borderRadius: 0,
      }}
    />
  ),
  // Apply shortStep to existing edge types
  dataFlow: (props) => (
    <StepEdge
      {...props}
      pathOptions={{
        offset: 1,
        borderRadius: 0,
      }}
    />
  ),
  execution: (props) => (
    <StepEdge
      {...props}
      pathOptions={{
        offset: 1,
        borderRadius: 0,
      }}
    />
  ),
};

const initialEdges = [
  // Data flow connection (Input-Indicator → Set Parameter Indicator)
  {
    id: "input-indicator-to-setparam",
    source: "inputIndicatorNode",
    sourceHandle: "inputIndicatorNode-right",
    target: "setParameterIndicatorNode",
    targetHandle: "setParameterIndicatorNode-left",
    type: "dataFlow",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Data flow connection (Input-Price → Set Parameter)
  {
    id: "input-price-to-setparam",
    source: "inputPriceNode",
    sourceHandle: "inputPriceNode-right",
    target: "setParameterNode-2",
    targetHandle: "setParameterNode-2-left",
    type: "dataFlow",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Data flow connection (Record → Set Parameter)
  {
    id: "record-to-setparam",
    source: "recordNode-1",
    sourceHandle: "recordNode-1-right",
    target: "setParameterNode-1",
    targetHandle: "setParameterNode-1-left",
    type: "dataFlow",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Entry decision - True path
  {
    id: "n3.1-n4.1",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-true",
    target: "buyNode-1",
    targetHandle: "buyNode-1-left",
    type: "execution",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Stop-loss decision - True path
  {
    id: "n3.2-n4.2",
    source: "ifNode-2",
    sourceHandle: "ifNode-2-true",
    target: "sellNode-1",
    targetHandle: "sellNode-1-left",
    type: "execution",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Profit decision - True path
  {
    id: "n3.3-n4.3",
    source: "ifNode-3",
    sourceHandle: "ifNode-3-true",
    target: "sellNode-2",
    targetHandle: "sellNode-2-left",
    type: "execution",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Buy to Record connection
  {
    id: "buy-record",
    source: "buyNode-1",
    sourceHandle: "buyNode-1-bottom",
    target: "recordNode-1",
    targetHandle: "recordNode-1-top",
    type: "dataFlow",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Record to Set Parameter connection
  {
    id: "record-setparam",
    source: "recordNode-1",
    sourceHandle: "recordNode-1-right",
    target: "setParameterNode-1",
    targetHandle: "setParameterNode-1-left",
    type: "dataFlow",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
];
