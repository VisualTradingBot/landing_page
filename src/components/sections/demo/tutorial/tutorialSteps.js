export const tutorialSteps = [
  {
    id: 1,
    title: "Inputs & Indicators",
    description:
      "These nodes gather market data and calculate technical indicators. The Input node selects the asset and time range, while Indicator nodes compute values like moving averages that inform your trading decisions.",
    nodeIds: ["inputNode", "inputIndicatorNode", "inputPriceNode"],
    type: "graph",
    position: "bottom", // Where to position explanation panel relative to nodes
  },
  {
    id: 2,
    title: "Buy & Sell Actions",
    description:
      "These nodes execute your trading strategy. Buy nodes open positions when entry conditions are met, while Sell nodes close positions based on exit conditions like profit targets or stop-loss levels.",
    nodeIds: ["buyNode-1", "sellNode-1", "sellNode-2"],
    type: "graph",
    position: "bottom",
  },
  {
    id: 3,
    title: "Backtest Results",
    description:
      "The backtest section shows how your strategy performs historically. View price charts with entry/exit markers, equity curves, and performance statistics to evaluate your trading strategy.",
    selector: ".backtest", // CSS selector for backtest section
    type: "backtest",
    position: "top",
  },
];

export const TUTORIAL_STORAGE_KEY = "demo-tutorial-completed";
