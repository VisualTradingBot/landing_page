// External libraries
import {
  ReactFlow,
  ReactFlowProvider,
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
import DemoTutorial from "./tutorial/DemoTutorial";
import { TUTORIAL_STORAGE_KEY } from "./tutorial/tutorialSteps";

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
import IntroductionMask from "./mask/IntroductionMask";
import "./demo.scss";

// Initial data and edge types
import {
  initialNodes,
  initialEdges,
  initialParameters,
  edgeTypes,
} from "./initial.jsx";

export default function Demo() {
  // === State for parameters and graph ===
  const [parameters, setParameters] = useState(initialParameters); // List of user-defined parameters
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes); // Graph nodes
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges); // Graph edges
  const [selectedAsset, setSelectedAsset] = useState("bitcoin"); // Currently selected asset

  // === Tutorial state ===
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [hasShownTutorial, setHasShownTutorial] = useState(false);
  const demoSectionRef = useRef(null);

  // === Modal state ===
  const [showParameterModal, setShowParameterModal] = useState(false); // Show add parameter modal
  const [parameterModalType, setParameterModalType] = useState(""); // 'parameter' or 'custom'
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Show delete confirmation modal
  const [parameterIndexToDelete, setParameterIndexToDelete] = useState(null); // Index of parameter to delete

  // === ReactFlow event handlers ===
  // Add a new edge to the graph
  const handleConnect = useCallback(
    (connectionParams) =>
      setEdges((currentEdges) => addEdge(connectionParams, currentEdges)),
    [setEdges]
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

  // === Asset selection handler ===
  const handleAssetChange = useCallback((asset) => {
    setSelectedAsset(asset);
  }, []);

  // === Node types for ReactFlow ===
  const nodeTypes = useMemo(
    () => ({
      buyNode: (props) => <Buy {...props} />,
      sellNode: (props) => <Sell {...props} />,
      recordNode: Record,
      setParameterNode: SetParameter,
      ifNode: If,
      inputNode: (props) => (
        <Input {...props} onAssetChange={handleAssetChange} />
      ),
      inputIndicatorNode: (props) => <InputIndicator {...props} />,
      inputPriceNode: (props) => <InputPrice {...props} />,
      blockNode: Block,
    }),
    [handleAssetChange]
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
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          parameters: parameters,
        },
      }))
    );
  }, [parameters, setNodes]);

  // === Backtest options for BacktestView ===
  const backtestOptions = useMemo(() => {
    const opts = {
      asset: "bitcoin",
      feePercent: 0.05,
      useGraphExecutor: true,
    };

    // Find input node to determine data source and asset
    const inputNode = nodes.find((n) => n.type === "inputNode");
    const useSynthetic = inputNode?.data?.dataSource !== "real";

    if (inputNode?.data?.asset) {
      opts.asset = inputNode.data.asset;
    }

    opts.useSynthetic = useSynthetic;
    opts.nodes = nodes;
    opts.edges = edges;

    // Default lookback value for visualization
    if (!opts.lookback) opts.lookback = 30;

    return opts;
  }, [nodes, edges]);

  // === Tutorial handlers ===
  const handleTutorialStart = useCallback(() => {
    setIsTutorialActive(true);
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setIsTutorialActive(false);
    setHasShownTutorial(true);
  }, []);

  // === Check if tutorial has been completed on mount ===
  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
    if (completed) {
      setHasShownTutorial(true);
    }
  }, []);

  return (
    <AssetContext.Provider value={{ selectedAsset, setSelectedAsset }}>
      <section
        id="demo"
        className={`demo ${isTutorialActive ? "tutorial-active" : ""}`}
        ref={demoSectionRef}
      >
        <ReactFlowProvider>
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
              preventScrolling={isTutorialActive}
              autoPanOnNodeDrag={!isTutorialActive}
              maxZoom={1.2}
              minZoom={0.6}
              panOnDrag={!isTutorialActive}
              panOnScroll={false}
              zoomOnScroll={!isTutorialActive}
              zoomOnPinch={!isTutorialActive}
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

            {/* Tutorial component */}
            {!hasShownTutorial && (
              <DemoTutorial
                nodes={nodes}
                isTutorialActive={isTutorialActive}
                onTutorialComplete={handleTutorialComplete}
                onTutorialStart={handleTutorialStart}
              />
            )}
          </div>
        </ReactFlowProvider>

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
