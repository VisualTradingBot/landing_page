import { StepEdge } from "@xyflow/react";

// 1. Define initial parameters for the demo strategy.
const initialParameters = [
  {
    id: "param-1",
    label: "lookback",
    value: "30",
    family: "variable",
    source: "user",
  },
  {
    id: "param-2",
    label: "stop_loss_level",
    value: "entry * 0.95",
    family: "variable",
    source: "user",
  },
  {
    id: "param-3",
    label: "live_price",
    value: "close",
    family: "variable",
    source: "system",
  },
  {
    id: "param-4",
    label: "indicator_output",
    value: "indicator_output",
    family: "variable",
    source: "system",
  },
  {
    id: "param-5",
    label: "profit_target",
    value: "entry * 1.10",
    family: "variable",
    source: "user",
  },
  {
    id: "param-6",
    label: "entry_price",
    value: "entry",
    family: "variable",
    source: "system",
  },
];

// Helper to find a parameter by its label for easier wiring.
const getParam = (label) => initialParameters.find((p) => p.label === label);

const bindParam = (label) => {
  const param = getParam(label);
  if (!param) return null;
  return {
    parameterId: param.id,
    label: param.label,
    value: param.value,
    source: param.source || "user",
  };
};

const createVariable = ({
  label,
  id,
  type = "input",
  paramLabel,
  parameterData,
}) => {
  const binding = paramLabel ? bindParam(paramLabel) : null;
  const paramData = parameterData || binding || {};
  const variable = {
    label,
    id,
    type,
    parameterData: paramData,
  };

  if (paramData && paramData.source === "system") {
    variable.paramName = paramData.label;
  }

  return variable;
};

// 2. Pre-configure nodes with data linked to the initial parameters.
// Organized in logical flow: Input → Indicator → Decision Logic → Execution
const initialNodes = [
  {
    id: "inputIndicatorNode",
    type: "inputIndicatorNode",
    position: { x: -200, y: 50 },
    data: (() => {
      const lookbackBinding = bindParam("lookback");
      const indicatorBinding = bindParam("indicator_output");
      return {
        resolution: "1h",
        lookbackUnit: "d",
        indicator: "sma",
        lookback: Number(lookbackBinding?.value) || 30,
        lookbackParamName: lookbackBinding?.label || "lookback",
        lookbackVariable: {
          label: "lookback",
          id: "lookback-input-indicator",
          parameterData: lookbackBinding || {},
        },
        outputParamName: indicatorBinding?.label || "indicator_output",
        parameters: initialParameters,
      };
    })(),
  },
  {
    id: "inputPriceNode",
    type: "inputPriceNode",
    position: { x: -200, y: 300 },
    data: (() => {
      const livePriceBinding = bindParam("live_price");
      return {
        timeFrame: "1h",
        type: "instant",
        format: "close",
        outputParamName: livePriceBinding?.label || "live_price",
        priceParamData: livePriceBinding || {},
        parameters: initialParameters,
      };
    })(),
  },
  {
    id: "setParameterIndicatorNode",
    type: "setParameterNode",
    position: { x: 350, y: 150 },
    data: {
      parameterName: "indicator_output",
      sourceValue: "",
      outputParamName: "indicator_output",
      parameters: initialParameters,
    },
  },
  {
    id: "inputNode",
    type: "inputNode",
    position: { x: -200, y: 550 },
    data: {
      type: "batch",
      asset: "bitcoin",
      dataSource: "synthetic",
      parameters: initialParameters,
    },
  },
  {
    id: "ifNode-1",
    type: "ifNode",
    position: { x: 400, y: 300 },
    data: {
      label: "If Entry",
      parameters: initialParameters,
      isMaster: true,
      variables: [
        createVariable({
          label: "condition-left",
          id: "ifNode-1-left",
          paramLabel: "live_price",
        }),
        createVariable({
          label: "condition-right",
          id: "ifNode-1-right",
          paramLabel: "indicator_output",
        }),
        createVariable({
          label: "operator",
          id: "ifNode-1-operator",
          type: "operator",
          parameterData: { value: ">" },
        }),
      ],
      operator: ">",
    },
  },
  {
    id: "buyNode-1",
    type: "buyNode",
    position: { x: 640, y: 430 },
    data: { label: "Buy", action: "buy", parameters: initialParameters },
  },
  {
    id: "ifNode-2",
    type: "ifNode",
    position: { x: 960, y: 100 },
    data: {
      label: "If Exit (Stop-Loss)",
      parameters: initialParameters,
      variables: [
        createVariable({
          label: "condition-left",
          id: "ifNode-2-left",
          paramLabel: "live_price",
        }),
        createVariable({
          label: "condition-right",
          id: "ifNode-2-right",
          paramLabel: "stop_loss_level",
        }),
        createVariable({
          label: "operator",
          id: "ifNode-2-operator",
          type: "operator",
          parameterData: { value: "<" },
        }),
      ],
      operator: "<",
    },
  },
  {
    id: "sellNode-1",
    type: "sellNode",
    position: { x: 1230, y: 220 },
    data: {
      label: "Sell (Stop-Loss)",
      action: "sell",
      amount: "100",
      parameters: initialParameters,
    },
  },
  {
    id: "ifNode-3",
    type: "ifNode",
    position: { x: 960, y: 330 },
    data: {
      label: "If Exit (Profit)",
      parameters: initialParameters,
      variables: [
        createVariable({
          label: "condition-left",
          id: "ifNode-3-left",
          paramLabel: "live_price",
        }),
        createVariable({
          label: "condition-right",
          id: "ifNode-3-right",
          paramLabel: "profit_target",
        }),
        createVariable({
          label: "operator",
          id: "ifNode-3-operator",
          type: "operator",
          parameterData: { value: ">" },
        }),
      ],
      operator: ">",
    },
  },
  {
    id: "sellNode-2",
    type: "sellNode",
    position: { x: 1230, y: 450 },
    data: {
      label: "Sell (Profit)",
      action: "sell",
      amount: "100",
      parameters: initialParameters,
    },
  },
  {
    id: "recordNode-1",
    type: "recordNode",
    position: { x: 638, y: 610 },
    data: {
      recordType: "entry_price",
      recordValue: "",
      parameters: initialParameters,
    },
  },
  {
    id: "setParameterNode-1",
    type: "setParameterNode",
    position: { x: 960, y: 620 },
    data: {
      parameterName: "entry_price",
      sourceValue: "",
      outputParamName: "entry_price",
      parameters: initialParameters,
      preventInTradeGrouping: true,
    },
  },
  {
    id: "setParameterNode-2",
    type: "setParameterNode",
    position: { x: 160, y: 430 },
    data: {
      parameterName: "live_price",
      sourceValue: "",
      outputParamName: "live_price",
      parameters: initialParameters,
    },
  },
  {
    id: "blockNode-1",
    type: "blockNode",
    position: { x: 930, y: 50 },
    data: {
      label: "In a trade",
      parameters: initialParameters,
      anchorNodeId: "buyNode-1",
    },
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

export { initialNodes, initialEdges, initialParameters, edgeTypes };
