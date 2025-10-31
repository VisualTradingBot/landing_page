// Make sure you create these two files with the modular logic from the previous answer.
import { parseGraph } from "../utils/parser";
import { runSimulation } from "../utils/simulator";
// We don't need to generate prices here anymore.
// import { generateSyntheticPrices } from "../utils/indicators";

// Listen for messages from the main React app
self.onmessage = (event) => {
  console.log("Worker received a message!");
  // Destructure the data sent from BacktestView.jsx
  const { nodes, edges, prices, feePercent } = event.data;

  // Basic validation
  if (!nodes || !edges || !prices) {
    self.postMessage({
      status: "error",
      data: "Worker did not receive necessary data.",
    });
    return;
  }

  try {
    // Step 1: Parse the visual graph into an executable blueprint.
    const strategyBlueprint = parseGraph(nodes, edges);

    // Step 2: Get the price data.
    // The data is now passed directly from the main thread. No need to generate it.
    const historicalData = prices;

    // Optional: Send a progress update back to the UI
    self.postMessage({ status: "progress", data: "Simulation started..." });

    // Step 3: Run the simulation. This is the heavy part.
    // Pass the blueprint, data, and any other options.
    const results = runSimulation(strategyBlueprint, historicalData, {
      feePercent,
    });

    // Step 4: When done, send the complete results back to the React component.
    self.postMessage({ status: "complete", data: results });
  } catch (error) {
    // If something goes wrong, send an error message back.
    console.error("Error in backtest worker:", error);
    self.postMessage({ status: "error", data: error.message });
  }
};
