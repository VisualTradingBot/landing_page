export const tutorialSteps = [
  {
    id: 1,
    title: "Input & Set Parameters",
    description:
      "These nodes gather market data and calculate technical indicators. Input-Indicator and Input-Price nodes select the asset, timeframe, and compute values. The Set Parameter nodes store outputs for reuse throughout your strategy.",
    nodeIds: [
      "inputIndicatorNode",
      "inputPriceNode",
      "setParameterNode-indicator",
      "setParameterNode-price",
    ],
    type: "graph",
    position: "right",
  },
  {
    id: 2,
    title: "Entry Logic",
    description:
      "The If node checks conditions to enter trades, and the Buy node executes the purchase when conditions are met. The Record node captures the entry price, which the Set Parameter stores for later reference in exit conditions.",
    nodeIds: [
      "ifNode-1",
      "buyNode-1",
      "recordNode-1",
      "setParameterNode-entry",
    ],
    type: "graph",
    position: "right",
  },
  {
    id: 3,
    title: "In Trade Section",
    description:
      "The 'In a trade' block groups all nodes that execute while a position is open. This includes exit conditions like stop-loss and profit targets, which automatically close positions based on your strategy rules.",
    nodeIds: [
      "blockNode-1",
      "ifNode-2",
      "sellNode-1",
      "ifNode-3",
      "sellNode-2",
    ],
    type: "graph",
    position: "right",
    expandInTrade: true,
  },
  {
    id: 4,
    title: "Backtesting Settings",
    description:
      "Configure your backtest parameters here: select the cryptocurrency asset (BTC, ETH, etc.), choose the data resolution (1 Day, 4 Hour, etc.), set the history window for how far back to test, and adjust the trading fee percentage.",
    selector: ".backtest-dataset-sidebar",
    type: "settings",
    position: "left",
  },
  {
    id: 5,
    title: "Parameter Dashboard",
    description:
      "The parameter dashboard shows all available parameters in your strategy. These include auto-generated parameters from data nodes and manually created parameters. You can drag parameters to connect them to nodes.",
    selector: ".parameters-dropdown",
    type: "parameter",
    position: "right",
  },
  {
    id: 6,
    title: "Run Backtest",
    description:
      "Click this button to execute your strategy against historical data. The backtest will simulate trades based on your rules and show how the strategy would have performed over the selected time period.",
    selector: ".run-backtest-button",
    type: "button",
    position: "bottom",
  },
  {
    id: 7,
    title: "Backtest Results",
    description:
      "View your strategy's performance with interactive charts showing price action, entry/exit points, and equity curves. Performance statistics help you evaluate the strategy's profitability and risk metrics.",
    selector: ".backtest",
    type: "backtest",
    position: "right",
  },
];

export const TUTORIAL_STORAGE_KEY = "demo-tutorial-completed";
export const INTRODUCTION_MASK_SHOWN_KEY = "demo-introduction-mask-shown";
