// Make sure you create these two files with the modular logic from the previous answer.
import { parseGraph } from "../utils/parser";
import { runSimulation } from "../utils/simulator";
// We don't need to generate prices here anymore.
// import { generateSyntheticPrices } from "../utils/indicators";

// Listen for messages from the main React app
self.onmessage = (event) => {
  // Destructure the data sent from BacktestView.jsx
  const { nodes, edges, prices, feePercent, parameters } = event.data;

  // Basic validation
  if (!nodes || !edges || !prices) {
    self.postMessage({
      status: "error",
      data: "Worker did not receive necessary data.",
    });
    return;
  }

  try {
    // Prepare a deep copy of nodes so we can resolve parameter bindings without
    // mutating the UI state. The UI provides `parameters` on nodes (Demo.jsx
    // writes them into every node), so use those to resolve param references.
    const nodesCopy =
      typeof structuredClone === "function"
        ? structuredClone(nodes)
        : JSON.parse(JSON.stringify(nodes));

    // Build parameter map from any node that carries a `parameters` array.
    let paramArray = Array.isArray(parameters) ? parameters : null;
    if (!paramArray) {
      for (const n of nodesCopy) {
        if (n?.data?.parameters && Array.isArray(n.data.parameters)) {
          paramArray = n.data.parameters;
          break;
        }
      }
    }
    const paramByLabel = new Map();
    if (paramArray) {
      for (const p of paramArray) {
        if (!p || typeof p.label !== "string") continue;
        // store raw string values
        paramByLabel.set(p.label, p.value);
      }
    }

    // Resolve common bindings on nodesCopy so parser receives canonical fields.
    for (const node of nodesCopy) {
      if (!node.data) node.data = {};

      // SetParameter nodes should expose outputParamName mirroring parameterName
      if (node.type === "setParameterNode") {
        if (!node.data.outputParamName && node.data.parameterName) {
          node.data.outputParamName = node.data.parameterName;
        }
      }

      // InputIndicator: resolve lookback from lookbackParamName if present
      if (node.type === "inputIndicatorNode") {
        const lbName = node.data.lookbackParamName || node.data.lookbackParam;
        if (lbName && paramByLabel.has(lbName)) {
          const raw = paramByLabel.get(lbName);
          const num = Number(raw);
          if (!Number.isNaN(num)) node.data.lookback = num;
        }
        // Ensure outputParamName if a downstream SetParameter exists (parser also searches downstream)
        if (!node.data.outputParamName) {
          // leave it to parser.findOutputParameterName if not set
        }
      }

      // If nodes: normalize variables into canonical { paramName } or { value }
      if (node.type === "ifNode") {
        const vars = node.data.variables || [];
        const normalized = [];
        for (let vi = 0; vi < 3; vi++) {
          const v = vars[vi];
          if (!v) {
            normalized[vi] = null;
            continue;
          }
          // Support legacy drag shape: variable.parameterData
          const paramData = v.parameterData ?? v;
          // If paramData has a label matching a parameter in the block, use its value
          if (
            paramData &&
            typeof paramData === "object" &&
            paramData.label &&
            paramByLabel.has(paramData.label)
          ) {
            const pv = paramByLabel.get(paramData.label);
            // If pv is a reference to a series like 'close' or 'indicator_output', keep as paramName
            if (
              pv === "close" ||
              pv === "price" ||
              pv === "indicator_output" ||
              pv === "entry_price"
            ) {
              normalized[vi] = {
                paramName: pv === "close" ? "close_price" : pv,
              };
            } else {
              // otherwise store literal/expression
              normalized[vi] = { value: pv };
            }
          } else if (paramData && typeof paramData === "string") {
            // raw string dropped (operator or expression)
            normalized[vi] = { value: paramData };
          } else if (
            paramData &&
            typeof paramData === "object" &&
            paramData.paramName
          ) {
            normalized[vi] = { paramName: paramData.paramName };
          } else if (
            paramData &&
            typeof paramData === "object" &&
            paramData.value != null
          ) {
            normalized[vi] = { value: paramData.value };
          } else {
            normalized[vi] = null;
          }
        }
        node.data.variables = normalized;
        // If operator is present as a value, also expose node.data.operator
        if (!node.data.operator && normalized[2] && normalized[2].value) {
          node.data.operator = normalized[2].value;
        }
      }

      // Buy/Sell nodes: ensure numeric amountNumber is set if amount exists
      if (node.type === "buyNode" || node.type === "sellNode") {
        if (node.data.amount != null && node.data.amountNumber == null) {
          const n = Number(String(node.data.amount).replace(/[^0-9.-]+/g, ""));
          if (!Number.isNaN(n)) node.data.amountNumber = n;
        }
      }
    }

    // Step 1: Parse the visual graph into an executable blueprint.
    const strategyBlueprint = parseGraph(nodesCopy, edges);

    // Step 2: Get the price data.
    // The data is now passed directly from the main thread. No need to generate it.
    // Normalize price objects into canonical shape; drop entries without usable price
    const historicalData = (prices || [])
      .map((p) => ({
        ...(p || {}),
        live_price: p?.live_price ?? p?.close ?? p?.price ?? null,
      }))
      .filter((p) => p.live_price != null);

    // Optional: Send a progress update back to the UI
    self.postMessage({ status: "progress", data: "Simulation started..." });

    // If parser found errors, return them as part of a complete-but-empty result
    if (strategyBlueprint && strategyBlueprint.errors) {
      self.postMessage({
        status: "complete",
        data: {
          errors: strategyBlueprint.errors,
          warnings: strategyBlueprint.warnings || null,
        },
      });
      return;
    }

    // Step 3: Run the simulation. This is the heavy part.
    // Pass the blueprint, data, and any other options.
    const results = runSimulation(strategyBlueprint, historicalData, {
      feePercent,
    });

    // If simulator returned an error object, return it inside `data` rather than throwing
    if (results && results.error) {
      self.postMessage({
        status: "complete",
        data: { error: results.error, warnings: results.warnings || null },
      });
      return;
    }

    // Step 4: When done, send the complete results back to the React component.
    self.postMessage({ status: "complete", data: results });
  } catch (error) {
    // If something goes wrong, send an error message back.
    console.error("Error in backtest worker:", error);
    // Post an error but keep it non-fatal for the UI (BacktestView should handle gracefully)
    self.postMessage({
      status: "error",
      data: String(error && error.message ? error.message : error),
    });
  }
};
