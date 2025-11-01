// External libraries
import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

// Context
import { AssetContext } from "./AssetContext";

// Components
import ParameterBlock from "./parameter-block/ParameterBlock";
import BacktestView from "./back-test/BacktestView";

// Node components
import Buy from "./nodes/buy/Buy";
import Sell from "./nodes/sell/Sell";
import Record from "./nodes/record/Record";
import SetParameter from "./nodes/setParameter/SetParameter";
import If from "./nodes/if/If";
import Input from "./nodes/input/Input";
import InputIndicator from "./nodes/inputIndicator/InputIndicator";
import InputPrice from "./nodes/inputPrice/InputPrice";
import Block from "./nodes/block/Block";

// Styles
import "./demo.scss";

// Initial data and edge types
import {
  initialNodes,
  initialEdges,
  initialParameters,
  edgeTypes,
} from "./initial.jsx";
import {
  DEFAULT_ASSET,
  DEFAULT_LOOKBACK,
  DEFAULT_FEE_PERCENT,
} from "./defaults";

export default function Demo() {
  // === State for parameters and graph ===
  const [parameters, setParameters] = useState(initialParameters); // List of user-defined parameters
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes); // Graph nodes
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges); // Graph edges
  const [selectedAsset, setSelectedAsset] = useState(DEFAULT_ASSET); // Currently selected asset

  // === Modal state ===
  const [showParameterModal, setShowParameterModal] = useState(false); // Show add parameter modal
  const [parameterModalType, setParameterModalType] = useState(""); // 'parameter' or 'custom'
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Show delete confirmation modal
  const [parameterIndexToDelete, setParameterIndexToDelete] = useState(null); // Index of parameter to delete

  // === ReactFlow event handlers ===
  // Add a new edge to the graph
  const handleConnect = useCallback(
    (connectionParams) => {
      const { source, sourceHandle } = connectionParams;
      // The sourceHandle is available during the connection event.
      // We can add it to the edge payload to be used by the simulator.
      const edge = { ...connectionParams };
      if (sourceHandle) {
        const sourceNode = nodes.find((n) => n.id === source);
        if (sourceNode && sourceNode.type === "ifNode") {
          edge.sourceHandle = sourceHandle;
        }
      }
      setEdges((currentEdges) => addEdge(edge, currentEdges));
    },
    [setEdges, nodes]
  );

  // Remove edge on double-click
  const handleEdgeDoubleClick = useCallback(
    (event, edge) => {
      setEdges((currentEdges) => currentEdges.filter((e) => e.id !== edge.id));
    },
    [setEdges]
  );

  // === Modal handlers ===
  const openParameterModal = useCallback((type) => {
    setParameterModalType(type);
    setShowParameterModal(true);
  }, []);

  const openDeleteModal = useCallback((index) => {
    setParameterIndexToDelete(index);
    setShowDeleteModal(true);
  }, []);

  const closeParameterModal = useCallback(() => {
    setShowParameterModal(false);
    setParameterModalType("");
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setParameterIndexToDelete(null);
  }, []);

  // === Parameter handlers ===
  const removeParameter = useCallback((index) => {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addParameter = useCallback((newParam) => {
    setParameters((prev) => [...prev, newParam]);
  }, []);

  const confirmDeleteParameter = useCallback(() => {
    if (parameterIndexToDelete !== null) {
      removeParameter(parameterIndexToDelete);
    }
    closeDeleteModal();
  }, [parameterIndexToDelete, removeParameter, closeDeleteModal]);

  // === Node types for ReactFlow ===
  const nodeTypes = useMemo(
    () => ({
      buyNode: (props) => <Buy {...props} />,
      sellNode: (props) => <Sell {...props} />,
      recordNode: Record,
      setParameterNode: SetParameter,
      ifNode: If,
      inputNode: (props) => <Input {...props} />,
      inputIndicatorNode: (props) => <InputIndicator {...props} />,
      inputPriceNode: (props) => <InputPrice {...props} />,
      blockNode: Block,
    }),
    []
  );

  // === ReactFlow viewport extent ===
  const containerRef = useRef();
  const [translateExtent, setTranslateExtent] = useState([
    [1920, 1080],
    [0, 0],
  ]);

  // Dynamically update the viewport extent based on container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateExtent() {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setTranslateExtent([
        [-2.5 * width, -1.5 * height],
        [1.5 * width, 1.5 * height],
      ]);
    }

    updateExtent();
    const ro = new ResizeObserver(updateExtent);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Warn if nodes or edges are in an invalid state (for debugging)
  useEffect(() => {
    nodes.forEach((node) => {
      if (!node || !node.position) return;
      if (isNaN(node.position.x) || isNaN(node.position.y)) {
        console.warn("Invalid position in node:", node);
      }
    });

    edges.forEach((edge) => {
      if (!edge) return;
      if (
        !nodes.find((n) => n.id === edge.source) ||
        !nodes.find((n) => n.id === edge.target)
      ) {
        console.warn("Edge refers to missing node:", edge);
      }
    });
  }, [nodes, edges]);

  // Update all nodes with the latest parameters when parameters change
  useEffect(() => {
    // Only update nodes if the parameters array is not already present on the node.data
    setNodes((prevNodes) => {
      let changed = false;
      const next = prevNodes.map((node) => {
        // Fast path: same reference (most common)
        if (node.data && node.data.parameters === parameters) return node;

        // If parameters deeply equal to existing, keep node as-is
        const existing = node.data && node.data.parameters;
        const existingJson = existing ? JSON.stringify(existing) : null;
        const newJson = parameters ? JSON.stringify(parameters) : null;
        if (existingJson === newJson) return node;

        changed = true;
        return {
          ...node,
          data: {
            ...node.data,
            parameters: parameters,
          },
        };
      });

      return changed ? next : prevNodes;
    });
  }, [parameters, setNodes]);

  // === Backtest options for BacktestView ===
  // Create lightweight signatures of nodes/edges that exclude layout/position
  // so backtestOptions doesn't recompute when the user moves nodes around.
  const nodesSignature = useMemo(() => {
    try {
      return JSON.stringify(
        nodes.map((n) => ({ id: n.id, type: n.type, data: n.data }))
      );
    } catch {
      return String(nodes.length);
    }
  }, [nodes]);

  const edgesSignature = useMemo(() => {
    try {
      return JSON.stringify(
        edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
        }))
      );
    } catch {
      return String(edges.length);
    }
  }, [edges]);

  // Parse the signatures back into lightweight structures for computing
  // options. This avoids referencing the full `nodes`/`edges` arrays inside
  // the main backtestOptions useMemo so position-only changes won't force
  // recomputation.
  const nodeMetaById = useMemo(() => {
    const map = new Map();
    nodes.forEach((node) => {
      map.set(node.id, {
        position: node.position || null,
        width: node.width,
        height: node.height,
      });
    });
    return map;
  }, [nodes]);

  const logicalNodes = useMemo(() => {
    try {
      const parsed = JSON.parse(nodesSignature);
      return parsed.map((node) => {
        const meta = nodeMetaById.get(node.id);
        if (!meta) return node;
        return {
          ...node,
          position: meta.position,
          width: meta.width,
          height: meta.height,
        };
      });
    } catch {
      return [];
    }
  }, [nodesSignature, nodeMetaById]);

  const logicalEdges = useMemo(() => {
    try {
      return JSON.parse(edgesSignature);
    } catch {
      return [];
    }
  }, [edgesSignature]);

  const backtestOptions = useMemo(() => {
    const opts = {
      asset: DEFAULT_ASSET,
      feePercent: DEFAULT_FEE_PERCENT,
      useGraphExecutor: true,
    };
    // Find input node to determine data source and asset using the
    // position-agnostic logical nodes.
    const inputNode = logicalNodes.find((n) => n.type === "inputNode");
    const useSynthetic = inputNode?.data?.dataSource !== "real";

    if (inputNode?.data?.asset) {
      opts.asset = inputNode.data.asset;
    }

    opts.useSynthetic = useSynthetic;
    // Expose the logical nodes/edges (no layout/position data) to keep the
    // backtest payload stable when users move nodes around in the editor.
    opts.nodes = logicalNodes;
    opts.edges = logicalEdges;
    opts.parameters = parameters;

    // Derive lookback from inputIndicator node (prefers explicit numeric value,
    // then bound parameter wiring). Fallback to parameter labeled 'lookback'
    // on the input node, then finally default to 30.
    try {
      const inputIndicator = logicalNodes.find(
        (n) => n.type === "inputIndicatorNode"
      );
      let computedLookback = undefined;

      if (inputIndicator) {
        // 1) prefer a canonical numeric lookback on the node
        const lb = inputIndicator.data?.lookback;
        if (lb != null && lb !== "") computedLookback = Number(lb);

        // 2) then prefer a bound parameter value if present
        const lbVar = inputIndicator.data?.lookbackVariable?.parameterData;
        if (lbVar && lbVar.value != null && String(lbVar.value).trim() !== "") {
          const num = Number(lbVar.value);
          if (!Number.isNaN(num)) computedLookback = num;
        }
      }

      // 3) fallback: check top-level input node parameters for a parameter named 'lookback'
      if (computedLookback == null) {
        const inputNode = logicalNodes.find((n) => n.type === "inputNode");
        const paramLookback = inputNode?.data?.parameters?.find(
          (p) => String(p.label).toLowerCase() === "lookback"
        )?.value;
        if (paramLookback != null && String(paramLookback).trim() !== "") {
          const num2 = Number(paramLookback);
          if (!Number.isNaN(num2)) computedLookback = num2;
        }
      }

      // 4) default
      opts.lookback =
        computedLookback != null && !Number.isNaN(Number(computedLookback))
          ? Number(computedLookback)
          : 30;
    } catch {
      opts.lookback = 30;
    }

    return opts;
  }, [logicalNodes, logicalEdges, parameters]);

  // Debug: log backtestOptions whenever it recomputes

  return (
    <AssetContext.Provider value={{ selectedAsset, setSelectedAsset }}>
      <section id="demo" className="demo">
        {/* === Drag-and-drop algorithm builder === */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "75vh",
            minHeight: "650px",
            position: "relative",
            background: "transparent",
          }}
        >
          <ReactFlow
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            nodes={nodes}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onEdgeDoubleClick={handleEdgeDoubleClick}
            defaultEdgeOptions={{ type: "shortStep" }}
            connectionLineType="step"
            connectionLineStyle={{
              strokeWidth: 3,
              stroke: "#000000",
              strokeDasharray: "5,5",
            }}
            preventScrolling={false}
            autoPanOnNodeDrag={true}
            maxZoom={1.2}
            minZoom={0.6}
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            fitView={false}
            translateExtent={translateExtent}
          >
            <ParameterBlock
              handleRemoveParameter={removeParameter}
              handleAddParameter={addParameter}
              parameters={parameters}
              setParameters={setParameters}
              onShowModal={openParameterModal}
              onShowDeleteModal={openDeleteModal}
            />
          </ReactFlow>
        </div>

        <div className="divider"></div>

        {/* === Backtest results section === */}
        <div className="backtest">
          <BacktestView
            options={backtestOptions}
            externalControl
            useSynthetic={backtestOptions.useSynthetic}
          />
        </div>

        {/* === Add Parameter / Custom Parameter Modal === */}
        {showParameterModal && (
          <div
            className="fullscreen-modal-overlay"
            onClick={closeParameterModal}
          >
            <div
              className="fullscreen-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="fullscreen-modal-header">
                <h2>
                  {parameterModalType === "parameter"
                    ? "Add Parameter"
                    : "Add Custom Parameter"}
                </h2>
                <button
                  className="fullscreen-modal-close"
                  onClick={closeParameterModal}
                >
                  ×
                </button>
              </div>
              <div className="fullscreen-modal-body">
                <div className="coming-soon-content">
                  <h3>Coming Soon</h3>
                  <p>
                    {parameterModalType === "parameter"
                      ? "This feature will allow you to add parameters from the library to your strategy."
                      : "This feature will allow you to create custom parameters for your strategy."}
                  </p>
                  <div className="feature-preview">
                    <h4>Planned Features:</h4>
                    <ul>
                      <li>Parameter library with pre-built options</li>
                      <li>Custom parameter creation wizard</li>
                      <li>Parameter validation and testing</li>
                      <li>Import/export parameter sets</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="fullscreen-modal-footer">
                <button
                  className="fullscreen-modal-btn fullscreen-modal-btn-primary"
                  onClick={closeParameterModal}
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === Delete Confirmation Modal === */}
        {showDeleteModal && (
          <div className="fullscreen-modal-overlay" onClick={closeDeleteModal}>
            <div
              className="fullscreen-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="fullscreen-modal-header">
                <h2>Delete Parameter</h2>
                <button
                  className="fullscreen-modal-close"
                  onClick={closeDeleteModal}
                >
                  ×
                </button>
              </div>
              <div className="fullscreen-modal-body">
                <div className="delete-confirmation-content">
                  <h3>Delete Parameter</h3>
                  <p>
                    This action cannot be undone. The parameter will be
                    permanently removed from your strategy.
                  </p>
                  {parameterIndexToDelete !== null && (
                    <div className="parameter-preview">
                      <strong>Parameter:</strong>{" "}
                      {parameters[parameterIndexToDelete]?.label}
                      <br />
                      <strong>Value:</strong>{" "}
                      {parameters[parameterIndexToDelete]?.value}
                    </div>
                  )}
                </div>
              </div>
              <div className="fullscreen-modal-footer">
                <button
                  className="fullscreen-modal-btn fullscreen-modal-btn-secondary"
                  onClick={closeDeleteModal}
                >
                  Cancel
                </button>
                <button
                  className="fullscreen-modal-btn fullscreen-modal-btn-danger"
                  onClick={confirmDeleteParameter}
                >
                  Delete Parameter
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </AssetContext.Provider>
  );
}
