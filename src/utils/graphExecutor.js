// Graph-based strategy executor
// Dynamically builds and executes trading strategies based on node connections

import { calculateIndicator } from "./backtest";

/**
 * Execute a trading strategy defined by a node graph
 * @param {Array} prices - Price data [{time, close}, ...]
 * @param {Array} nodes - Graph nodes with their data
 * @param {Array} edges - Connections between nodes
 * @param {Object} opts - Options (feePercent, etc.)
 */
export function executeGraphStrategy(prices, nodes, edges, opts = {}) {
  const feePercent = opts.feePercent ?? 0;
  const feeFraction = feePercent / 100;

  if (!prices || prices.length === 0) return null;

  // Build adjacency map for graph traversal
  const edgeMap = new Map();
  edges.forEach((e) => {
    if (!edgeMap.has(e.source)) edgeMap.set(e.source, []);
    edgeMap.get(e.source).push({
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      label: e.label,
    });
  });

  // Find input node (starting point)
  const inputNode = nodes.find((n) => n.type === "inputNode");
  if (!inputNode) {
    console.error("No input node found");
    return null;
  }

  // Find master nodes - these are explicitly marked as master by the user
  const masterNodes = nodes.filter(
    (n) => n.type === "ifNode" && n.data?.isMaster === true
  );

  // Build reachability from master nodes to find their slave trees
  const reachableFromMasters = new Set();
  masterNodes.forEach((master) => {
    const queue = [master.id];

    while (queue.length > 0) {
      const current = queue.shift();
      if (reachableFromMasters.has(current)) continue;
      reachableFromMasters.add(current);

      const outEdges = edgeMap.get(current) || [];
      outEdges.forEach((edge) => {
        if (!reachableFromMasters.has(edge.target)) {
          queue.push(edge.target);
        }
      });
    }
  });

  // Pre-calculate all indicators and store by parameter ID (not node ID)
  // Indicators write their output to parameters, which are then referenced by If nodes
  const indicatorsByParamId = new Map();
  nodes.forEach((node) => {
    if (node.type === "indicatorNode") {
      const window = getVariableValue(node, "window") || 30;
      const indicatorType = node.data?.type || "30d_high";
      const series = calculateIndicator(prices, indicatorType, window);

      // Find the output parameter this indicator writes to
      const outputVar = node.data?.variables?.find((v) => v.label === "output");
      const outputParamId = outputVar?.parameterData?.parameterId;

      if (outputParamId) {
        indicatorsByParamId.set(outputParamId, series);
      }
    }
  });

  // No additional filtering needed - master nodes are the only entry points

  // Initialize backtest state
  const equitySeries = [];
  const trades = [];
  let cash = 1;
  let position = 0;
  let entryPrice = null;
  let inTrade = false;

  // Execute strategy for each price bar
  for (let i = 0; i < prices.length; i++) {
    const context = {
      priceIndex: i,
      currentPrice: prices[i].close,
      entryPrice,
      inTrade,
      indicatorsByParamId,
      nodes,
      edges: edgeMap,
    };

    // Traverse graph starting from master nodes only
    const actions = [];
    masterNodes.forEach((masterNode) => {
      const masterActions = traverseGraph(masterNode.id, context);
      actions.push(...masterActions);
    });

    // Debug logging on first iteration
    if (i === 50) {
      console.log("🔍 Graph execution debug (day 50):");
      console.log(
        "  - Master nodes:",
        masterNodes.map(
          (n) => `${n.id} (${n.type}) isMaster=${n.data?.isMaster}`
        )
      );
      console.log(
        "  - Reachable from masters:",
        Array.from(reachableFromMasters)
      );
      console.log("  - Actions collected:", actions);
      console.log(
        "  - Indicators by param ID:",
        Array.from(indicatorsByParamId.keys())
      );
      console.log("  - In trade:", inTrade);
    }

    // Execute actions (buy/sell signals)
    actions.forEach((action) => {
      if (action.type === "buy" && !inTrade) {
        entryPrice = context.currentPrice;
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
      } else if (action.type === "sell" && inTrade) {
        const proceeds = position * context.currentPrice * (1 - feeFraction);
        cash = proceeds;
        position = 0;
        inTrade = false;
        const lastTrade = trades[trades.length - 1];
        if (lastTrade && lastTrade.exitIndex == null) {
          lastTrade.exitIndex = i;
          lastTrade.exitPrice = context.currentPrice;
        }
        entryPrice = null;
      }
    });

    // Update context after actions
    context.inTrade = inTrade;
    context.entryPrice = entryPrice;

    // Calculate equity
    const equity = inTrade ? position * context.currentPrice : cash;
    equitySeries.push(equity);
  }

  // Close any open position
  if (inTrade && position > 0) {
    const lastClose = prices[prices.length - 1].close;
    const proceeds = position * lastClose * (1 - feeFraction);
    cash = proceeds;
    const lastTrade = trades[trades.length - 1];
    if (lastTrade && lastTrade.exitIndex == null) {
      lastTrade.exitIndex = prices.length - 1;
      lastTrade.exitPrice = lastClose;
    }
  }

  // Calculate statistics
  const totalReturn = cash - 1;
  const closedTrades = trades.filter((t) => t.exitIndex != null);
  let wins = 0;
  let totalDuration = 0;
  for (const t of closedTrades) {
    const pnl = (t.exitPrice - t.entryPrice) / t.entryPrice;
    if (pnl > 0) wins++;
    totalDuration += t.exitIndex - t.entryIndex;
  }
  const winRate = closedTrades.length ? wins / closedTrades.length : 0;
  const avgDuration = closedTrades.length
    ? totalDuration / closedTrades.length
    : 0;

  let peak = -Infinity;
  let maxDd = 0;
  for (const v of equitySeries) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDd) maxDd = dd;
  }

  return {
    equitySeries,
    totalReturn,
    winRate,
    avgDuration,
    trades: closedTrades,
    maxDrawdown: maxDd,
  };
}

/**
 * Traverse graph and collect actions to execute
 */
function traverseGraph(nodeId, context, visited = new Set()) {
  // Prevent infinite loops
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const node = context.nodes.find((n) => n.id === nodeId);
  if (!node) return [];

  const actions = [];

  // Debug logging
  if (context.priceIndex === 50) {
    console.log(`  - Visiting node: ${nodeId} (${node.type})`);
  }

  // Process node based on type
  switch (node.type) {
    case "inputNode":
      // Input passes through to ALL connected nodes
      break;

    case "indicatorNode":
      // Indicators are pre-calculated, just pass through
      break;

    case "ifNode": {
      // Evaluate condition
      const conditionMet = evaluateIfNode(node, context);

      if (context.priceIndex === 50) {
        console.log(`    - If condition result: ${conditionMet}`);
      }

      // Get outgoing edges
      const outEdges = context.edges.get(nodeId) || [];

      // Find "true" and "false" paths
      const truePath = outEdges.find(
        (e) => e.sourceHandle?.includes("bottom") || e.label === "True"
      );
      const falsePath = outEdges.find(
        (e) => e.sourceHandle?.includes("right") || e.label === "False"
      );

      // Follow appropriate path
      if (conditionMet && truePath) {
        const childActions = traverseGraph(truePath.target, context, visited);
        actions.push(...childActions);
      } else if (!conditionMet && falsePath) {
        const childActions = traverseGraph(falsePath.target, context, visited);
        actions.push(...childActions);
      }
      return actions;
    }

    case "executeNode": {
      // Generate action
      const action = node.data?.action || "buy";
      actions.push({ type: action, nodeId });
      return actions;
    }

    case "setParameterNode":
      // Store intermediate values (for future use)
      break;
  }

  // Continue to ALL connected nodes (for non-branching nodes like Input, Indicator)
  const outEdges = context.edges.get(nodeId) || [];
  outEdges.forEach((edge) => {
    const childActions = traverseGraph(edge.target, context, visited);
    actions.push(...childActions);
  });

  return actions;
}

/**
 * Evaluate an If node's condition
 */
function evaluateIfNode(node, context) {
  const vars = node.data?.variables || [];
  if (vars.length < 3) return false;

  // Get left and right values
  const leftValue = resolveValue(vars[0], context);
  const rightValue = resolveValue(vars[1], context);
  const operator = vars[2]?.parameterData || ">";

  // Handle operator as object or string
  const op = typeof operator === "object" ? operator.value || ">" : operator;

  if (context.priceIndex === 50) {
    console.log(`      - Comparing: ${leftValue} ${op} ${rightValue}`);
  }

  // Compare values
  return compare(leftValue, rightValue, op);
}

/**
 * Resolve a variable's value in the current context
 */
function resolveValue(variable, context) {
  const paramData = variable.parameterData;
  if (!paramData || Object.keys(paramData).length === 0) return null;

  const parameterId = paramData.parameterId;
  const value = paramData.value;
  const label = paramData.label?.toLowerCase() || "";

  // Check if this parameter ID is bound to an indicator output
  if (parameterId && context.indicatorsByParamId.has(parameterId)) {
    const series = context.indicatorsByParamId.get(parameterId);
    const indicatorValue = series[context.priceIndex];

    // If indicator has no value (null/undefined), return null to fail comparisons
    if (indicatorValue == null) return null;

    return indicatorValue;
  }

  // Check if it's a reference to close price (with optional expressions)
  if (value === "close" || label.includes("close")) {
    const closePrice = context.currentPrice;

    // Handle expressions like "close * 1.05" or "close * 0.95"
    if (value && typeof value === "string" && value.includes("*")) {
      const closeMatch = value.match(/close\s*\*\s*([0-9.]+)/);
      if (closeMatch) {
        return closePrice * parseFloat(closeMatch[1]);
      }
    }

    // Handle expressions like "close + 100" or "close - 50"
    if (value && typeof value === "string" && value.includes("+")) {
      const addMatch = value.match(/close\s*\+\s*([0-9.]+)/);
      if (addMatch) {
        return closePrice + parseFloat(addMatch[1]);
      }
    }
    if (value && typeof value === "string" && value.includes("-")) {
      const subMatch = value.match(/close\s*-\s*([0-9.]+)/);
      if (subMatch) {
        return closePrice - parseFloat(subMatch[1]);
      }
    }

    return closePrice;
  }

  // Check if it's a reference to entry price
  if (value && typeof value === "string") {
    const entryMatch = value.match(/entry\s*\*\s*([0-9.]+)/);
    if (entryMatch && context.entryPrice != null) {
      return context.entryPrice * parseFloat(entryMatch[1]);
    }
  }

  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num)) return num;

  return null;
}

/**
 * Get a variable value from a node
 */
function getVariableValue(node, variableLabel) {
  const vars = node.data?.variables || [];
  const v = vars.find((x) => x.label === variableLabel);
  if (!v || !v.parameterData) return null;

  const value = v.parameterData.value;
  const num = Number(value);
  return isNaN(num) ? value : num;
}

/**
 * Compare two values with an operator
 */
function compare(a, b, op) {
  if (a == null || b == null) return false;
  switch (op) {
    case ">":
      return a > b;
    case "<":
      return a < b;
    case "==":
      return a === b;
    case ">=":
      return a >= b;
    case "<=":
      return a <= b;
    default:
      return false;
  }
}
