/**
 * Parses the raw node and edge data from ReactFlow into a structured,
 * executable StrategyBlueprint. This is the "compilation" step.
 */

export function parseGraph(nodes, edges) {
  if (!nodes || nodes.length === 0) {
    throw new Error("Parser received no nodes.");
  }

  // --- Identify Data Producers ---
  const dataProducers = nodes
    .filter((n) => ["inputIndicatorNode", "inputPriceNode"].includes(n.type))
    .map((node) => {
      if (node.type === "inputIndicatorNode") {
        return {
          nodeId: node.id,
          type: "indicator",
          indicatorType: node.data.indicator || "SMA",
          lookback: node.data.lookbackVariable?.parameterData?.value || 30,
          outputParamName: findOutputParameterName(node.id, nodes, edges),
        };
      }
      if (node.type === "inputPriceNode") {
        return {
          nodeId: node.id,
          type: "price",
          format: node.data.format || "close", // This determines which price (O,H,L,C) to use
          outputParamName: findOutputParameterName(node.id, nodes, edges),
        };
      }
    })
    .filter(Boolean); // Filter out any undefined results

  // --- Identify Logic Graphs (Entry vs. In-Trade) ---

  // The "In a trade" block defines our in-trade logic
  const inTradeBlock = nodes.find(
    (n) => n.type === "blockNode" && n.data.label === "In a trade"
  );
  const inTradeGraph = {
    entryNodeIds: [],
    nodes: [],
    edges: [],
  };

  if (inTradeBlock) {
    // Find all nodes graphically contained within the block
    const blockRect = {
      x: inTradeBlock.position.x,
      y: inTradeBlock.position.y,
      width: inTradeBlock.width || 400, // Provide fallbacks
      height: inTradeBlock.height || 500,
    };
    const childNodes = nodes.filter(
      (n) =>
        n.id !== inTradeBlock.id &&
        n.position.x >= blockRect.x &&
        n.position.y >= blockRect.y &&
        n.position.x <= blockRect.x + blockRect.width &&
        n.position.y <= blockRect.y + blockRect.height
    );
    const childNodeIds = new Set(childNodes.map((n) => n.id));

    inTradeGraph.nodes = childNodes;
    inTradeGraph.edges = edges.filter(
      (e) => childNodeIds.has(e.source) && childNodeIds.has(e.target)
    );
    // Entry points are the 'If' nodes inside the block
    inTradeGraph.entryNodeIds = childNodes
      .filter((n) => n.type === "ifNode")
      .map((n) => n.id);
    // Provide an entryNodeId field (singular or array) for runtime execution
    inTradeGraph.entryNodeId =
      inTradeGraph.entryNodeIds.length === 1
        ? inTradeGraph.entryNodeIds[0]
        : inTradeGraph.entryNodeIds;
  }

  // The entry logic is everything upstream of the 'buy' action
  const buyNode = nodes.find((n) => n.type === "buyNode");
  if (!buyNode) {
    throw new Error("Strategy is missing a 'Buy' node.");
  }
  const entryGraph = findUpstreamGraph(buyNode.id, nodes, edges);

  return {
    dataProducers,
    entryGraph,
    inTradeGraph,
  };
}

// --- Parser Helper Functions ---

function findOutputParameterName(startNodeId, nodes, edges) {
  const connectedEdge = edges.find((e) => e.source === startNodeId);
  if (!connectedEdge) return null;
  const setParameterNode = nodes.find(
    (n) => n.id === connectedEdge.target && n.type === "setParameterNode"
  );
  return setParameterNode?.data?.parameterName || null;
}

function findUpstreamGraph(startNodeId, nodes, edges) {
  const upstreamNodes = new Map();
  const upstreamEdges = new Set();
  const queue = [startNodeId];
  const reverseEdgeMap = new Map();
  edges.forEach((edge) => {
    if (!reverseEdgeMap.has(edge.target)) reverseEdgeMap.set(edge.target, []);
    reverseEdgeMap.get(edge.target).push(edge);
  });

  while (queue.length > 0) {
    const currentNodeId = queue.shift();
    if (upstreamNodes.has(currentNodeId)) continue;

    const node = nodes.find((n) => n.id === currentNodeId);
    if (node) {
      upstreamNodes.set(currentNodeId, node);
      const incomingEdges = reverseEdgeMap.get(currentNodeId) || [];
      incomingEdges.forEach((edge) => {
        upstreamEdges.add(edge);
        if (!upstreamNodes.has(edge.source)) {
          queue.push(edge.source);
        }
      });
    }
  }

  // Find the 'If' node that is the main entry condition for the buy action
  const entryIfNode = [...upstreamNodes.values()].find(
    (n) => n.type === "ifNode"
  );

  return {
    nodes: [...upstreamNodes.values()],
    edges: [...upstreamEdges],
    entryNodeId: entryIfNode?.id,
  };
}
