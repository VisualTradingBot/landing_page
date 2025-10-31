import { calculateIndicator, calcMaxDrawdown } from "./indicators.js";

/**
 * Runs the backtest simulation using a pre-parsed StrategyBlueprint.
 */
export function runSimulation(blueprint, prices, options = {}) {
  const { feePercent = 0.05 } = options;
  const feeFraction = feePercent / 100;

  const initialCapital = options.initialCapital || 10000;

  if (!prices || prices.length === 0) return null;

  // --- 1. Prepare all data series in advance ---
  const dataSeries = new Map();
  dataSeries.set(
    "close_price",
    prices.map((p) => p.live_price)
  );

  blueprint.dataProducers.forEach((producer) => {
    if (producer.type === "indicator" && producer.outputParamName) {
      const series = calculateIndicator(
        prices,
        producer.indicatorType,
        Number(producer.lookback)
      );
      dataSeries.set(producer.outputParamName, series);
    }
  });

  // --- 2. Initialize Simulation State ---
  let cash = initialCapital;
  let position = 0;
  let inTrade = false;
  let entryPrice = null;

  const equitySeries = [];
  const trades = [];

  // --- 3. Main Simulation Loop ---
  for (let i = 0; i < prices.length; i++) {
    const currentContext = { i, dataSeries, entryPrice };
    const livePrice = dataSeries.get("close_price")[i];

    if (!inTrade) {
      // --- Looking for an entry ---
      const action = executeSubgraph(blueprint.entryGraph, currentContext);
      if (action?.type === "buy") {
        entryPrice = livePrice;
        const cashUsed = cash * (1 - feeFraction);
        position = cashUsed / entryPrice;
        cash = 0;
        inTrade = true;
        trades.push({
          entryIndex: i,
          entryPrice,
          exitIndex: null,
          exitPrice: null,
        });
      }
    } else {
      // --- Managing an open position ---
      const action = executeSubgraph(blueprint.inTradeGraph, currentContext);
      if (action?.type === "sell") {
        const proceeds = position * livePrice * (1 - feeFraction);
        cash = proceeds;
        position = 0;
        inTrade = false;
        const lastTrade = trades[trades.length - 1];
        if (lastTrade && lastTrade.exitIndex == null) {
          lastTrade.exitIndex = i;
          lastTrade.exitPrice = livePrice;
        }
        entryPrice = null;
      }
    }

    // Update equity for the current day
    const currentEquity = cash + position * livePrice;
    equitySeries.push(currentEquity);
  }

  // --- 4. Finalization and Statistics ---
  if (inTrade) {
    // Close any open position at the end
    const lastPrice = prices[prices.length - 1].live_price;
    cash = position * lastPrice * (1 - feeFraction);
    const lastTrade = trades[trades.length - 1];
    if (lastTrade && lastTrade.exitIndex == null) {
      lastTrade.exitIndex = prices.length - 1;
      lastTrade.exitPrice = lastPrice;
    }
  }
  // Normalize equity series to initial capital so UI can treat 1.0 as baseline
  const normalizedEquitySeries = equitySeries.map((v) => v / initialCapital);
  const totalReturn =
    normalizedEquitySeries[normalizedEquitySeries.length - 1] - 1;
  const closedTrades = trades.filter((t) => t.exitIndex != null);
  let wins = 0;
  let totalDuration = 0;
  for (const t of closedTrades) {
    if (t.exitPrice > t.entryPrice) wins++;
    totalDuration += t.exitIndex - t.entryIndex;
  }
  const winRate = closedTrades.length ? wins / closedTrades.length : 0;
  const avgDuration = closedTrades.length
    ? totalDuration / closedTrades.length
    : 0;

  return {
    equitySeries: normalizedEquitySeries,
    trades: closedTrades,
    totalReturn,
    winRate,
    avgDuration,
    maxDrawdown: calcMaxDrawdown(normalizedEquitySeries),
  };
}

// --- Simulator Helper Functions ---

function executeSubgraph(graph, context) {
  // Gracefully handle graphs with no entry point (like an empty "In a trade" block)
  if (!graph || !graph.entryNodeId) {
    return null;
  }

  const { nodes, edges } = graph;
  const entryPoints = Array.isArray(graph.entryNodeId)
    ? graph.entryNodeId
    : [graph.entryNodeId];

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeMap = new Map();
  edges.forEach((edge) => {
    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
    edgeMap.get(edge.source).push(edge);
  });

  // Check each possible entry path (important for the multiple 'If' nodes in the trade block)
  for (const startNodeId of entryPoints) {
    let currentNodeId = startNodeId;
    const visited = new Set(); // Prevent infinite loops within a single path traversal

    while (currentNodeId && !visited.has(currentNodeId)) {
      visited.add(currentNodeId);
      const node = nodeMap.get(currentNodeId);
      if (!node) break;

      if (node.type === "ifNode") {
        const result = evaluateIfCondition(node, context);
        // THIS IS THE CORRECTED LOGIC
        const expectedHandleId = result
          ? `${node.id}-true`
          : `${node.id}-false`;
        const nextEdge = (edgeMap.get(node.id) || []).find(
          (e) => e.sourceHandle === expectedHandleId
        );
        currentNodeId = nextEdge ? nextEdge.target : null;
      } else if (["buyNode", "sellNode"].includes(node.type)) {
        // We found a terminal action. Return it immediately.
        return { type: node.type.replace("Node", "") };
      } else {
        // Not a decision or action node, just follow the path. Assumes a single output.
        const nextEdge = (edgeMap.get(node.id) || [])[0];
        currentNodeId = nextEdge ? nextEdge.target : null;
      }
    }
  }

  return null; // No action was triggered in any of the paths
}

function resolveValue(paramData, context) {
  if (!paramData || !paramData.label) return null;
  const { label, value } = paramData;
  const { i, dataSeries, entryPrice } = context;

  // If the parameter label directly matches a prepared data series, use it.
  if (dataSeries.has(label)) {
    const series = dataSeries.get(label);
    return series && series[i] != null ? series[i] : null;
  }

  // If the parameter's value references a known series key, support that too.
  if (typeof value === "string") {
    const v = value.trim();
    // Common aliases
    if (v === "close" || v === "price") {
      if (dataSeries.has("close_price")) {
        const series = dataSeries.get("close_price");
        return series && series[i] != null ? series[i] : null;
      }
    }

    if (dataSeries.has(v)) {
      const series = dataSeries.get(v);
      return series && series[i] != null ? series[i] : null;
    }
  }

  if (typeof value === "string" && value.includes("entry")) {
    if (entryPrice === null) return null;
    // Super simple expression evaluator for "entry * number"
    try {
      // Use Function constructor for safe evaluation
      const func = new Function("entry", `return ${value}`);
      return func(entryPrice);
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      return null;
    }
  }

  const num = parseFloat(value);
  return !isNaN(num) ? num : null;
}

function evaluateIfCondition(node, context) {
  const [leftVar, rightVar, opVar] = node.data.variables;
  const leftVal = resolveValue(leftVar.parameterData, context);
  const rightVal = resolveValue(rightVar.parameterData, context);
  const operator = opVar.parameterData;

  if (leftVal === null || rightVal === null) return false;

  switch (operator) {
    case ">":
      return leftVal > rightVal;
    case "<":
      return leftVal < rightVal;
    case "==":
      return leftVal === rightVal;
    case ">=":
      return leftVal >= rightVal;
    case "<=":
      return leftVal <= rightVal;
    default:
      return false;
  }
}
