import { parseGraph } from "../src/utils/parser.js";
import { runSimulation } from "../src/utils/simulator.js";
import { generateSyntheticPrices } from "../src/utils/indicators.js";

const initialParameters = [
  { id: "param-3", label: "live_price", value: "close", source: "system" },
  {
    id: "param-4",
    label: "indicator_output",
    value: "indicator_output",
    source: "system",
  },
];

const nodes = [
  {
    id: "inputIndicatorNode",
    type: "inputIndicatorNode",
    position: { x: -200, y: 50 },
    data: {
      indicator: "sma",
      lookback: 30,
      outputParamName: "indicator_output",
      parameters: initialParameters,
    },
  },
  {
    id: "inputPriceNode",
    type: "inputPriceNode",
    position: { x: -200, y: 150 },
    data: {
      format: "close",
      outputParamName: "live_price",
      parameters: initialParameters,
    },
  },
  {
    id: "ifNode-1",
    type: "ifNode",
    position: { x: 100, y: 100 },
    data: {
      operator: ">",
      variables: [
        {
          label: "condition-left",
          id: "v1",
          paramName: "live_price",
          parameterData: {
            parameterId: "param-3",
            label: "live_price",
            source: "system",
          },
        },
        {
          label: "condition-right",
          id: "v2",
          paramName: "indicator_output",
          parameterData: {
            parameterId: "param-4",
            label: "indicator_output",
            source: "system",
          },
        },
        {
          label: "operator",
          id: "v3",
          parameterData: { value: ">" },
        },
      ],
    },
  },
  {
    id: "buyNode-1",
    type: "buyNode",
    position: { x: 250, y: 100 },
    data: { label: "Buy" },
  },
  {
    id: "blockNode-1",
    type: "blockNode",
    position: { x: 400, y: 0 },
    width: 400,
    height: 300,
    data: { label: "In a trade" },
  },
  {
    id: "ifNode-2",
    type: "ifNode",
    position: { x: 450, y: 80 },
    data: {
      operator: "<",
      variables: [
        {
          label: "condition-left",
          id: "v4",
          paramName: "live_price",
          parameterData: {
            parameterId: "param-3",
            label: "live_price",
            source: "system",
          },
        },
        {
          label: "condition-right",
          id: "v5",
          parameterData: { value: "entry * 0.95" },
        },
        {
          label: "operator",
          id: "v6",
          parameterData: { value: "<" },
        },
      ],
    },
  },
  {
    id: "ifNode-3",
    type: "ifNode",
    position: { x: 450, y: 180 },
    data: {
      operator: ">",
      variables: [
        {
          label: "condition-left",
          id: "v7",
          paramName: "live_price",
          parameterData: {
            parameterId: "param-3",
            label: "live_price",
            source: "system",
          },
        },
        {
          label: "condition-right",
          id: "v8",
          parameterData: { value: "entry * 1.05" },
        },
        {
          label: "operator",
          id: "v9",
          parameterData: { value: ">" },
        },
      ],
    },
  },
  {
    id: "sellNode-1",
    type: "sellNode",
    position: { x: 600, y: 80 },
    data: { label: "Sell", amount: "100" },
  },
  {
    id: "sellNode-2",
    type: "sellNode",
    position: { x: 600, y: 180 },
    data: { label: "Sell", amount: "100" },
  },
];

const edges = [
  {
    id: "edge-1",
    source: "ifNode-1",
    target: "buyNode-1",
    sourceHandle: "ifNode-1-true",
    type: "execution",
  },
  {
    id: "edge-2",
    source: "ifNode-2",
    target: "sellNode-1",
    sourceHandle: "ifNode-2-true",
    type: "execution",
  },
  {
    id: "edge-3",
    source: "ifNode-3",
    target: "sellNode-2",
    sourceHandle: "ifNode-3-true",
    type: "execution",
  },
];

const blueprint = parseGraph(nodes, edges);
const prices = generateSyntheticPrices(365, 20000);
const result = runSimulation(blueprint, prices, { feePercent: 0.05 });

console.log({
  dataProducers: blueprint.dataProducers.length,
  entryNodeId: blueprint.entryGraph.entryNodeId,
  inTradeEntryIds: blueprint.inTradeGraph.entryNodeIds,
  trades: result.trades.length,
  firstTrade: result.trades[0],
  totalReturn: result.totalReturn,
  warnings: blueprint.warnings,
});
