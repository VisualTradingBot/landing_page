const IN_TRADE_LABEL = "In a trade";
const DEFAULT_LOOKBACK = 30;

export function parseGraph(nodes = [], edges = []) {
  const sanitizedNodes = Array.isArray(nodes) ? nodes : [];
  const sanitizedEdges = Array.isArray(edges) ? edges : [];

  if (sanitizedNodes.length === 0) {
    return {
      dataProducers: [],
      entryGraph: { nodes: [], edges: [], entryNodeId: null },
      inTradeGraph: { nodes: [], edges: [], entryNodeIds: [], entryNodeId: null },
      errors: ["Parser received no nodes."],
      warnings: [],
    };
  }

  const warnings = [];

  const dataProducers = buildDataProducers(sanitizedNodes, sanitizedEdges, warnings);
  const entryGraph = buildEntryGraph(sanitizedNodes, sanitizedEdges, warnings);
  const inTradeGraph = buildInTradeGraph(sanitizedNodes, sanitizedEdges);

  return {
    dataProducers,
    entryGraph,
    inTradeGraph,
    errors: null,
    warnings: warnings.length ? warnings : null,
  };
}

function buildDataProducers(nodes, edges, warnings) {
  const producers = [];

  nodes
    .filter((node) => node && ["inputIndicatorNode", "inputPriceNode"].includes(node.type))
    .forEach((node) => {
      const data = node.data || {};

      if (node.type === "inputIndicatorNode") {
        const indicator = typeof data.indicator === "string" ? data.indicator : "sma";
        const lookback = coerceNumber(data.lookback, DEFAULT_LOOKBACK);
        const outputKey = inferOutputKey(node, nodes, edges) || "indicator_output";

        if (!data.outputParamName) {
          warnings.push(
            `inputIndicatorNode ${node.id} missing 'outputParamName'; using '${outputKey}'.`
          );
        }

        producers.push({
          nodeId: node.id,
          type: "indicator",
          indicator,
          lookback,
          outputKey,
        });
        return;
      }

      if (node.type === "inputPriceNode") {
        const format = typeof data.format === "string" ? data.format : "close";
        const outputKey = inferOutputKey(node, nodes, edges) || "live_price";

        if (!data.outputParamName) {
          warnings.push(
            `inputPriceNode ${node.id} missing 'outputParamName'; using '${outputKey}'.`
          );
        }

        producers.push({
          nodeId: node.id,
          type: "price",
          format,
          outputKey,
        });
      }
    });

  return producers;
}

function buildEntryGraph(nodes, edges, warnings) {
  const buyNode = nodes.find((n) => n?.type === "buyNode");
  if (!buyNode) {
    warnings.push("Strategy is missing a 'Buy' node.");
    return { nodes: [], edges: [], entryNodeId: null };
  }

  return findUpstreamGraph(buyNode.id, nodes, edges);
}

function buildInTradeGraph(nodes, edges) {
  const block = nodes.find((n) => n?.type === "blockNode" && n.data?.label === IN_TRADE_LABEL);
  if (!block) {
    return {
      nodes: [],
      edges: [],
      entryNodeIds: [],
      entryNodeId: null,
    };
  }

  const blockNodes = collectBlockNodes(block, nodes, edges);
  const nodeIds = new Set(blockNodes.map((n) => n.id));
  const blockEdges = edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  const entryNodeIds = blockNodes.filter((n) => n.type === "ifNode").map((n) => n.id);

  let entryNodeId = null;
  if (entryNodeIds.length === 1) {
    entryNodeId = entryNodeIds[0];
  }

  return {
    nodes: blockNodes,
    edges: blockEdges,
    entryNodeIds,
    entryNodeId,
  };
}

function findUpstreamGraph(targetNodeId, nodes, edges) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const reverseEdgeMap = buildReverseEdgeMap(edges);
  const visited = new Set();
  const nodeOrder = [];
  const edgeMap = new Map();
  const queue = [targetNodeId];

  while (queue.length) {
    const currentId = queue.shift();
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = nodeMap.get(currentId);
    if (node) {
      nodeOrder.push(node);
    }

    const incoming = reverseEdgeMap.get(currentId) || [];
    incoming.forEach((edge) => {
      edgeMap.set(edge.id || `${edge.source}->${edge.target}`, edge);
      if (!visited.has(edge.source)) {
        queue.push(edge.source);
      }
    });
  }

  const subgraphNodeIds = new Set(nodeOrder.map((n) => n.id));
  const candidateEntries = nodeOrder.filter((n) => n.type === "ifNode");

  let entryNodeId = null;
  if (candidateEntries.length === 1) {
    entryNodeId = candidateEntries[0].id;
  } else if (candidateEntries.length > 1) {
    entryNodeId = chooseRootCandidate(candidateEntries, reverseEdgeMap, subgraphNodeIds);
  }

  return {
    nodes: nodeOrder,
    edges: Array.from(edgeMap.values()),
    entryNodeId,
  };
}

function chooseRootCandidate(candidates, reverseEdgeMap, scopeIds) {
  for (const candidate of candidates) {
    const incoming = reverseEdgeMap.get(candidate.id) || [];
    const hasParentInsideScope = incoming.some((edge) => scopeIds.has(edge.source));
    if (!hasParentInsideScope) {
      return candidate.id;
    }
  }
  return candidates[0]?.id ?? null;
}

function buildReverseEdgeMap(edges) {
  const reverse = new Map();
  edges.forEach((edge) => {
    if (!edge || typeof edge.target !== "string") return;
    if (!reverse.has(edge.target)) {
      reverse.set(edge.target, []);
    }
    reverse.get(edge.target).push(edge);
  });
  return reverse;
}

function collectBlockNodes(blockNode, nodes, edges) {
  const hasPositions = nodes.some((n) => n?.position && typeof n.position.x === "number");
  if (hasPositions && blockNode?.position) {
    const rect = {
      x: blockNode.position.x,
      y: blockNode.position.y,
      width: blockNode.width || 400,
      height: blockNode.height || 400,
    };
    return nodes.filter((n) => {
      if (!n || n.id === blockNode.id) return false;
      const pos = n.position;
      if (!pos) return false;
      const withinX = pos.x >= rect.x && pos.x <= rect.x + rect.width;
      const withinY = pos.y >= rect.y && pos.y <= rect.y + rect.height;
      return withinX && withinY;
    });
  }

  const adjacency = new Map();
  edges.forEach((edge) => {
    if (!edge) return;
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source).add(edge.target);
    adjacency.get(edge.target).add(edge.source);
  });

  const visited = new Set([blockNode.id]);
  const queue = [blockNode.id];
  while (queue.length) {
    const current = queue.shift();
    const neighbors = adjacency.get(current) || new Set();
    neighbors.forEach((neighbor) => {
      if (visited.has(neighbor)) return;
      visited.add(neighbor);
      queue.push(neighbor);
    });
  }

  visited.delete(blockNode.id);
  return nodes.filter((node) => visited.has(node.id));
}

function inferOutputKey(node, nodes, edges) {
  const direct = node.data?.outputParamName;
  if (typeof direct === "string" && direct.trim().length) {
    return direct.trim();
  }
  return findFirstDownstreamParameter(node.id, nodes, edges);
}

function findFirstDownstreamParameter(startNodeId, nodes, edges) {
  const outgoing = new Map();
  edges.forEach((edge) => {
    if (!edge || typeof edge.source !== "string") return;
    if (!outgoing.has(edge.source)) {
      outgoing.set(edge.source, []);
    }
    outgoing.get(edge.source).push(edge.target);
  });

  const visited = new Set();
  const queue = [startNodeId];
  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);

    const node = nodes.find((n) => n.id === current);
    if (node?.type === "setParameterNode") {
      const paramName = node.data?.parameterName;
      if (typeof paramName === "string" && paramName.trim().length) {
        return paramName.trim();
      }
    }

    const neighbors = outgoing.get(current) || [];
    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    });
  }
  return null;
}

function coerceNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
