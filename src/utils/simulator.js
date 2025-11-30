import { calculateIndicator, calcMaxDrawdown } from "./indicators.js";

const DEFAULT_INITIAL_CAPITAL = 10000;
const DEFAULT_FEE_PERCENT = 0.05;

export function runSimulation(blueprint, prices, options = {}) {
  const warnings = [];

  if (!blueprint || typeof blueprint !== "object") {
    return { error: "Invalid strategy blueprint.", warnings };
  }

  const feeFraction =
    coerceNumber(options.feePercent, DEFAULT_FEE_PERCENT) / 100;
  const initialCapital = coerceNumber(
    options.initialCapital,
    DEFAULT_INITIAL_CAPITAL
  );

  const normalizedPrices = sanitizePrices(prices);
  if (normalizedPrices.length === 0) {
    return { error: "No price data provided", warnings };
  }

  const liveSeries = normalizedPrices.map((point) => point.live_price);
  const dataSeries = buildDataSeries(
    blueprint.dataProducers || [],
    normalizedPrices,
    liveSeries,
    warnings
  );

  let cash = initialCapital;
  let position = 0;
  let entryPrice = null;
  let currentPosition = null;
  const trades = [];
  const equitySeries = [];

  for (let i = 0; i < liveSeries.length; i++) {
    const livePrice = liveSeries[i];
    if (!Number.isFinite(livePrice)) {
      warnings.push(`Price series contains invalid value at index ${i}.`);
      continue;
    }

    const context = { i, dataSeries, entryPrice };

    if (!position) {
      const action = executeSubgraph(blueprint.entryGraph, context);
      if (action?.type === "buy" && cash > 0) {
        const requestedNotional = resolveAmountFromNode(action?.node);
        const spendableCash =
          Number.isFinite(requestedNotional) && requestedNotional > 0
            ? Math.min(requestedNotional, cash)
            : cash;

        const investable = spendableCash * (1 - feeFraction);
        if (investable > 0) {
          const quantity = investable / livePrice;
          if (quantity > 0) {
            position = quantity;
            cash = Math.max(0, cash - spendableCash);
            entryPrice = livePrice;
            currentPosition = {
              entryIndex: i,
              entryPrice: livePrice,
              entryNotional: investable,
              quantity,
              initialQuantity: quantity,
            };
          }
        }
      }
    } else {
      const action = executeSubgraph(blueprint.inTradeGraph, context);
      if (action?.type === "sell" && currentPosition) {
        const requestedPercent = resolveAmountFromNode(action.node);
        const normalizedPercent = Number.isFinite(requestedPercent)
          ? Math.min(Math.max(requestedPercent, 0), 100)
          : 100;
        if (normalizedPercent > 0) {
          const fractionToSell = normalizedPercent / 100;
          const totalQuantity = currentPosition.quantity;
          const initialQuantity =
            currentPosition.initialQuantity ?? totalQuantity;
          const quantityToSell = Math.min(
            initialQuantity * fractionToSell,
            totalQuantity
          );
          if (quantityToSell > 0) {
            const exitNotional = quantityToSell * livePrice * (1 - feeFraction);
            const basisFraction =
              totalQuantity > 0
                ? currentPosition.entryNotional *
                  (quantityToSell / totalQuantity)
                : 0;
            cash += exitNotional;
            currentPosition.quantity = Math.max(
              totalQuantity - quantityToSell,
              0
            );
            position = currentPosition.quantity;
            currentPosition.entryNotional = Math.max(
              currentPosition.entryNotional - basisFraction,
              0
            );
            if (currentPosition.initialQuantity == null) {
              currentPosition.initialQuantity = totalQuantity;
            }
            const baseQuantity =
              currentPosition.initialQuantity ||
              initialQuantity ||
              totalQuantity;
            const actualPercentSold = baseQuantity
              ? Math.min(
                  Math.max((quantityToSell / baseQuantity) * 100, 0),
                  100
                )
              : normalizedPercent;

            trades.push({
              entryIndex: currentPosition.entryIndex,
              entryPrice: currentPosition.entryPrice,
              entryNotional: basisFraction,
              quantity: quantityToSell,
              exitIndex: i,
              exitPrice: livePrice,
              exitNotional,
              profit: exitNotional - basisFraction,
              sellPercent: actualPercentSold,
            });

            if (currentPosition.quantity <= 1e-12 || position <= 1e-12) {
              currentPosition = null;
              position = 0;
              entryPrice = null;
            }
          }
        }
      }
    }

    const equity = cash + position * livePrice;
    equitySeries.push(equity);
  }

  if (currentPosition && currentPosition.quantity > 0) {
    const lastPrice = liveSeries[liveSeries.length - 1];
    const quantity = currentPosition.quantity;
    const exitNotional = quantity * lastPrice * (1 - feeFraction);
    cash += exitNotional;
    const baseQuantity = currentPosition.initialQuantity || quantity;
    trades.push({
      entryIndex: currentPosition.entryIndex,
      entryPrice: currentPosition.entryPrice,
      entryNotional: currentPosition.entryNotional,
      quantity,
      exitIndex: liveSeries.length - 1,
      exitPrice: lastPrice,
      exitNotional,
      profit: exitNotional - currentPosition.entryNotional,
      sellPercent: baseQuantity
        ? Math.min(Math.max((quantity / baseQuantity) * 100, 0), 100)
        : 100,
    });
    position = 0;
    currentPosition = null;
    entryPrice = null;
  }

  const normalizedEquity = equitySeries.map((value) => value / initialCapital);
  const closedTrades = trades.filter((trade) => trade.exitIndex != null);

  const totalReturn = normalizedEquity.length
    ? normalizedEquity[normalizedEquity.length - 1] - 1
    : 0;
  const stats = summarizeTrades(closedTrades);

  return {
    equitySeries: normalizedEquity,
    trades: closedTrades,
    totalReturn,
    winRate: stats.winRate,
    avgDuration: stats.avgDuration,
    maxDrawdown: calcMaxDrawdown(normalizedEquity),
    warnings: warnings.length ? warnings : null,
    dataSeries: Object.fromEntries(dataSeries),
  };
}

function buildDataSeries(producers, normalizedPrices, liveSeries, warnings) {
  const series = new Map();
  series.set("live_price", liveSeries);
  series.set("close_price", liveSeries);

  producers.forEach((producer) => {
    if (!producer || typeof producer !== "object") return;

    if (producer.type === "price") {
      const key = pickOutputKey(producer, "live_price");
      if (!series.has(key)) {
        series.set(key, liveSeries);
      }
      return;
    }

    if (producer.type === "indicator") {
      const key = pickOutputKey(producer, `indicator_${producer.nodeId}`);
      const source = producer.indicator || "sma";
      const lookback = Math.max(
        1,
        Math.floor(coerceNumber(producer.lookback, 30))
      );
      const indicatorSeries = calculateIndicator(
        normalizedPrices,
        source,
        lookback
      );
      if (!indicatorSeries || indicatorSeries.length !== liveSeries.length) {
        warnings.push(
          `Indicator '${source}' on node ${producer.nodeId} returned unexpected length.`
        );
      }
      series.set(key, indicatorSeries);
    }
  });

  return series;
}

function executeSubgraph(graph, context) {
  if (!graph) {
    return null;
  }

  const entryRoots =
    graph.entryNodeId != null ? graph.entryNodeId : graph.entryNodeIds;

  if (entryRoots == null) {
    return null;
  }

  const entryPoints = Array.isArray(entryRoots) ? entryRoots : [entryRoots];
  const nodeMap = new Map((graph.nodes || []).map((node) => [node.id, node]));
  const edgeMap = new Map();
  (graph.edges || []).forEach((edge) => {
    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, []);
    edgeMap.get(edge.source).push(edge);
  });

  for (const startId of entryPoints) {
    let currentId = startId;
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = nodeMap.get(currentId);
      if (!node) break;

      if (node.type === "ifNode") {
        const isTrue = evaluateIfCondition(node, context);
        const expectedHandle = isTrue ? `${node.id}-true` : `${node.id}-false`;
        const edge = (edgeMap.get(node.id) || []).find(
          (item) => item.sourceHandle === expectedHandle
        );
        currentId = edge ? edge.target : null;
        continue;
      }

      if (node.type === "buyNode") {
        return { type: "buy", node };
      }

      if (node.type === "sellNode") {
        return { type: "sell", node };
      }

      const nextEdge = (edgeMap.get(node.id) || [])[0];
      currentId = nextEdge ? nextEdge.target : null;
    }
  }

  return null;
}

function evaluateIfCondition(node, context) {
  const variables = node?.data?.variables || [];
  const left = resolveValue(variables[0], context);
  const right = resolveValue(variables[1], context);
  const operator = node?.data?.operator || variables[2]?.value;

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false;
  }

  switch (operator) {
    case ">":
      return left > right;
    case "<":
      return left < right;
    case ">=":
      return left >= right;
    case "<=":
      return left <= right;
    case "==":
      return left === right;
    default:
      return false;
  }
}

function resolveValue(variable, context) {
  if (!variable) return NaN;
  const { i, dataSeries, entryPrice } = context;

  const parameterData = variable.parameterData || {};

  const effectiveParamName =
    variable.paramName ||
    parameterData.paramName ||
    (parameterData.source === "system" ? parameterData.label : undefined);

  if (effectiveParamName) {
    const series = dataSeries.get(effectiveParamName);
    const value = series ? series[i] : undefined;
    if (Number.isFinite(value)) {
      return value;
    }
  }

  const rawValue =
    variable.value !== undefined
      ? variable.value
      : parameterData.value !== undefined
      ? parameterData.value
      : undefined;

  if (typeof rawValue === "number") {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (trimmed === "entry" || trimmed === "entry_price") {
      return Number.isFinite(entryPrice) ? entryPrice : NaN;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    if (trimmed.includes("entry_price") || trimmed.includes("entry")) {
      if (!Number.isFinite(entryPrice)) return NaN;
      const safe = trimmed
        .replace(/entry_price/g, entryPrice.toString())
        .replace(/entry/g, entryPrice.toString());
      if (!/^[0-9+\-*/ ().]+$/.test(safe)) return NaN;
      try {
        return Function(`return ${safe}`)();
      } catch {
        return NaN;
      }
    }
  }

  return NaN;
}

function summarizeTrades(trades) {
  if (!trades.length) {
    return { winRate: 0, avgDuration: 0 };
  }

  let wins = 0;
  let totalDuration = 0;
  trades.forEach((trade) => {
    if (trade.exitPrice > trade.entryPrice) {
      wins += 1;
    }
    totalDuration += trade.exitIndex - trade.entryIndex;
  });

  return {
    winRate: wins / trades.length,
    avgDuration: totalDuration / trades.length,
  };
}

function sanitizePrices(prices) {
  if (!Array.isArray(prices)) {
    return [];
  }

  const sanitized = [];
  prices.forEach((point) => {
    if (!point) return;
    const value = Number(point.live_price ?? point.close ?? point.price);
    if (!Number.isFinite(value)) return;
    sanitized.push({ ...point, live_price: value });
  });
  return sanitized;
}

function pickOutputKey(producer, fallback) {
  const key = producer.outputKey || producer.outputParamName;
  if (typeof key === "string" && key.trim().length) {
    return key.trim();
  }
  return fallback;
}

function coerceNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function resolveAmountFromNode(node) {
  if (!node || !node.data) return NaN;
  const data = node.data;
  const candidates = [
    data.amountNumber,
    data.amount,
    data.amountParamData?.value,
  ];

  for (const candidate of candidates) {
    if (candidate == null) continue;
    const value = typeof candidate === "string" ? candidate.trim() : candidate;
    if (value === "") continue;
    const sanitized =
      typeof value === "string" ? value.replace(/[^0-9.-]+/g, "") : value;
    const numeric = Number(sanitized);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return NaN;
}
