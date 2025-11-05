export const tutorialSteps = [
  {
    id: 1,
    title: "Input & Parameters",
    description:
      "These nodes gather market data and calculate technical indicators. The Input node selects the asset and time range, while Indicator and Price nodes compute values that inform your trading decisions. Parameters are automatically generated from these inputs.",
    nodeIds: ["inputNode", "inputIndicatorNode", "inputPriceNode"],
    type: "graph",
    position: "right",
  },
  {
    id: 2,
    title: "In Trade Section",
    description:
      "The 'In a trade' block groups all nodes that execute while a position is open. This includes exit conditions like stop-loss and profit targets, which automatically close positions based on your strategy rules.",
    nodeIds: ["blockNode-1", "ifNode-2", "ifNode-3", "sellNode-1", "sellNode-2"], // The block node and related nodes
    type: "graph",
    position: "right",
    expandInTrade: true, // Flag to expand the in-trade block
  },
  {
    id: 3,
    title: "Parameter Dashboard",
    description:
      "The parameter dashboard shows all available parameters in your strategy. These include auto-generated parameters from data nodes and manually created parameters. You can drag parameters to connect them to nodes.",
    selector: "[class*='parameters-dropdown']", // CSS selector for ParameterBlock (the dropdown container)
    type: "parameter",
    position: "right",
  },
  {
    id: 4,
    title: "Backtest Results",
    description:
      "The backtest section shows how your strategy performs historically. View price charts with entry/exit markers, equity curves, and performance statistics to evaluate your trading strategy.",
    selector: ".backtest", // CSS selector for backtest section
    type: "backtest",
    position: "right",
  },
];

export const TUTORIAL_STORAGE_KEY = "demo-tutorial-completed";
export const INTRODUCTION_MASK_SHOWN_KEY = "demo-introduction-mask-shown";
