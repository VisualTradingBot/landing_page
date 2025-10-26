import {
  ReactFlow,
  useEdgesState,
  useNodesState,
  addEdge,
  Panel,
  StepEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import ParameterBlock from "./parameter-block/ParameterBlock";
import BacktestView from "./back-test/BacktestView";

// Nodes
import Buy from "./nodes/buy/Buy";
import Sell from "./nodes/sell/Sell";
import If from "./nodes/if/If";
import SetParameter from "./nodes/setParameter/SetParameter";
import Input from "./nodes/input/Input";
import Indicator from "./nodes/indicator/Indicator";
import "./demo.scss";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

// --- START OF CHANGES ---

// 1. Define initial parameters for the demo strategy.
const initialParameters = [
  { id: "param-1", label: "lookback_window", value: "30", family: "variable" },
  {
    id: "param-2",
    label: "stop_loss_level",
    value: "entry * 0.95",
    family: "variable",
  },
  {
    id: "param-5",
    label: "profit_target",
    value: "entry * 1.10",
    family: "variable",
  },
  { id: "param-3", label: "close_price", value: "close", family: "variable" },
  { id: "param-4", label: "indicator_output", value: "", family: "variable" },
  // Separate entry price reference - not affected by multiplications
  {
    id: "param-6",
    label: "entry_price_reference",
    value: "close",
    family: "variable",
  },
];

// Helper to find a parameter by its label for easier wiring.
const getParam = (label) => initialParameters.find((p) => p.label === label);

// 2. Pre-configure nodes with data linked to the initial parameters.
// Organized in logical flow: Input → Indicator → Decision Logic → Execution
const initialNodes = [
  // Data Input Layer
  {
    id: "inputNode",
    type: "inputNode",
    position: { x: -200, y: 0 },
    data: {
      label: "Input",
      parameters: initialParameters,
    },
  },
  // Analysis Layer
  {
    id: "indicatorNode",
    type: "indicatorNode",
    position: { x: 50, y: 200 },
    data: {
      label: "Indicator",
      parameters: initialParameters,
      variables: [
        {
          label: "output",
          id: `var-indicator-output`,
          parameterData: {
            parameterId: getParam("indicator_output").id,
            ...getParam("indicator_output"),
          },
        },
        {
          label: "window",
          id: `var-indicator-window`,
          parameterData: {
            parameterId: getParam("lookback_window").id,
            ...getParam("lookback_window"),
          },
        },
      ],
    },
  },
  // Decision Logic Layer - Entry Decision
  {
    id: "ifNode-1",
    type: "ifNode",
    position: { x: 300, y: 20 },
    data: {
      label: "If Entry",
      parameters: initialParameters,
      isMaster: true, // Mark as master node
      variables: [
        {
          label: "var-1",
          id: `var-if1-left`,
          parameterData: {
            parameterId: getParam("entry_price_reference").id,
            ...getParam("entry_price_reference"),
          },
        },
        {
          label: "var-2",
          id: `var-if1-right`,
          parameterData: {
            parameterId: getParam("indicator_output").id,
            ...getParam("indicator_output"),
          },
        },
        { label: "operator", id: `var-if1-op`, parameterData: ">" },
      ],
    },
  },
  // Execution Layer - Entry Action
  {
    id: "buyNode-1",
    type: "buyNode",
    position: { x: 580, y: 180 },
    data: { label: "Buy", action: "buy" },
  },
  // Decision Logic Layer - Exit Decisions
  {
    id: "ifNode-2",
    type: "ifNode",
    position: { x: 780, y: 150 },
    data: {
      label: "If Exit (Stop-Loss)",
      parameters: initialParameters,
      variables: [
        {
          label: "var-1",
          id: `var-if2-left`,
          parameterData: {
            parameterId: getParam("close_price").id,
            ...getParam("close_price"),
          },
        },
        {
          label: "var-2",
          id: `var-if2-right`,
          parameterData: {
            parameterId: getParam("stop_loss_level").id,
            ...getParam("stop_loss_level"),
          },
        },
        { label: "operator", id: `var-if2-op`, parameterData: "<" },
      ],
    },
  },
  {
    id: "sellNode-1",
    type: "sellNode",
    position: { x: 1000, y: 320 },
    data: { label: "Sell (Stop-Loss)", action: "sell", amount: "100" },
  },
  {
    id: "ifNode-3",
    type: "ifNode",
    position: { x: 1200, y: 280 },
    data: {
      label: "If Exit (Profit)",
      parameters: initialParameters,
      variables: [
        {
          label: "var-1",
          id: `var-if3-left`,
          parameterData: {
            parameterId: getParam("close_price").id,
            ...getParam("close_price"),
          },
        },
        {
          label: "var-2",
          id: `var-if3-right`,
          parameterData: {
            parameterId: getParam("profit_target").id,
            ...getParam("profit_target"),
          },
        },
        { label: "operator", id: `var-if3-op`, parameterData: ">" },
      ],
    },
  },
  {
    id: "sellNode-2",
    type: "sellNode",
    position: { x: 1430, y: 450 },
    data: { label: "Sell (Profit)", action: "sell", amount: "100" },
  },
];

const nodeTypes = {
  buyNode: Buy,
  sellNode: Sell,
  ifNode: If,
  inputNode: Input,
  indicatorNode: Indicator,
  setParameterNode: SetParameter,
};

// Edge types for ReactFlow - use step edges instead of smooth
const edgeTypes = {
  default: StepEdge,
};

const initialEdges = [
  // Data flow connection (Input → Indicator)
  {
    id: "n1-n2",
    source: "inputNode",
    sourceHandle: "inputNode-right",
    target: "indicatorNode",
    targetHandle: "indicatorNode-left",
    type: "dataFlow",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Entry decision - True path
  {
    id: "n3.1-n4.1",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-true",
    target: "buyNode-1",
    targetHandle: "buyNode-1-left",
    type: "execution",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Entry decision - False path
  {
    id: "n3.1-n3.2",
    source: "ifNode-1",
    sourceHandle: "ifNode-1-false",
    target: "ifNode-2",
    targetHandle: "ifNode-2-top",
    type: "logic",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Stop-loss decision - True path
  {
    id: "n3.2-n4.2",
    source: "ifNode-2",
    sourceHandle: "ifNode-2-true",
    target: "sellNode-1",
    targetHandle: "sellNode-1-left",
    type: "execution",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Stop-loss decision - False path
  {
    id: "n3.2-n3.3",
    source: "ifNode-2",
    sourceHandle: "ifNode-2-false",
    target: "ifNode-3",
    targetHandle: "ifNode-3-top",
    type: "logic",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
  // Profit decision - True path
  {
    id: "n3.3-n4.3",
    source: "ifNode-3",
    sourceHandle: "ifNode-3-true",
    target: "sellNode-2",
    targetHandle: "sellNode-2-left",
    type: "execution",
    animated: true,
    style: {
      stroke: "#000000",
      strokeWidth: 3,
      strokeDasharray: "5,5",
    },
  },
];

export default function Demo() {
  const [parameters, setParameters] = useState(initialParameters);
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'parameter' or 'custom'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [parameterToDelete, setParameterToDelete] = useState(null);

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [setEdges]
  );

  // Handle double-click on edges to remove them
  const onEdgeDoubleClick = useCallback(
    (event, edge) => {
      setEdges((edgesSnapshot) => 
        edgesSnapshot.filter((e) => e.id !== edge.id)
      );
    },
    [setEdges]
  );

  // Modal handlers
  const handleShowModal = useCallback((type) => {
    setModalType(type);
    setShowModal(true);
  }, []);

  const handleShowDeleteModal = useCallback((index) => {
    setParameterToDelete(index);
    setShowDeleteModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setModalType('');
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setParameterToDelete(null);
  }, []);

  const handleRemoveParameter = useCallback((index) => {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddParameter = useCallback((newParam) => {
    setParameters((prev) => [...prev, newParam]);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (parameterToDelete !== null) {
      handleRemoveParameter(parameterToDelete);
    }
    handleCloseDeleteModal();
  }, [parameterToDelete, handleRemoveParameter, handleCloseDeleteModal]);

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  const containerRef = useRef(null);
  const [translateExtent, setTranslateExtent] = useState([
    [-400, -200],
    [1600, 800],
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function updateExtent() {
      const width = el.clientWidth || 1400;
      const height = el.clientHeight || 600;
      setTranslateExtent([
        [-400, -200],
        [Math.max(1600, width + 200), Math.max(800, height + 200)],
      ]);
    }

    updateExtent();
    const ro = new ResizeObserver(updateExtent);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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


  // Update nodes when parameters change
  // This ensures nodes receive the updated parameters array, and individual node components
  // (like VariableFieldStandalone) will handle updating their own parameterData
  useEffect(() => {
    _setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          parameters: parameters,
        },
      }))
    );
  }, [parameters, _setNodes]);

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

    // Extract lookback and indicator info for visualization only
    const indicator = nodes.find((n) => n.type === "indicatorNode");
    if (indicator?.data?.variables) {
      const windowVar = indicator.data.variables.find(
        (v) => v.label === "window"
      );
      const windowValue = windowVar?.parameterData?.value;
      const n = Number(windowValue);
      if (!Number.isNaN(n) && n > 0) {
        opts.lookback = n;
      }
    }
    if (!opts.lookback) opts.lookback = 30;

    // Get indicator type for visualization
    const indicatorType = indicator?.data?.type || "30d_high";
    opts.graph = { indicatorType };

    return opts;
  }, [nodes, edges]);

  return (
    <section id="demo" className="demo">
      <div ref={containerRef} style={{ width: "100%", height: "75vh", minHeight: "650px", position: "relative", background: "transparent" }}>
        <ReactFlow
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          nodes={nodes}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeDoubleClick={onEdgeDoubleClick}
          defaultEdgeOptions={{
            type: 'step',
          }}
          preventScrolling={false}
          autoPanOnNodeDrag={true}
          maxZoom={1.2}
          minZoom={0.6}
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          translateExtent={translateExtent}
          fitView={false}
        >
          <Panel position="top-center">
            <ParameterBlock
              handleRemoveParameter={handleRemoveParameter}
              handleAddParameter={handleAddParameter}
              parameters={parameters}
              setParameters={setParameters}
              onShowModal={handleShowModal}
              onShowDeleteModal={handleShowDeleteModal}
            />
          </Panel>
        </ReactFlow>
      </div>

      <div className="divider"></div>

      <div className="backtest">
        <BacktestView
          options={backtestOptions}
          externalControl
          useSynthetic={backtestOptions.useSynthetic}
        />
      </div>

      {/* Modals - rendered at ReactFlow level */}
      {showModal && (
        <div className="fullscreen-modal-overlay" onClick={handleCloseModal}>
          <div className="fullscreen-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="fullscreen-modal-header">
              <h2>
                {modalType === 'parameter' ? 'Add Parameter' : 'Add Custom Parameter'}
              </h2>
              <button className="fullscreen-modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="fullscreen-modal-body">
              <div className="coming-soon-content">
                <h3>Coming Soon</h3>
                <p>
                  {modalType === 'parameter' 
                    ? 'This feature will allow you to add parameters from the library to your strategy.'
                    : 'This feature will allow you to create custom parameters for your strategy.'
                  }
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
                onClick={handleCloseModal}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fullscreen-modal-overlay" onClick={handleCloseDeleteModal}>
          <div className="fullscreen-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="fullscreen-modal-header">
              <h2>Delete Parameter</h2>
              <button className="fullscreen-modal-close" onClick={handleCloseDeleteModal}>
                ×
              </button>
            </div>
            <div className="fullscreen-modal-body">
              <div className="delete-confirmation-content">
                <h3>Delete Parameter</h3>
                <p>
                  This action cannot be undone. The parameter will be permanently removed from your strategy.
                </p>
                {parameterToDelete !== null && (
                  <div className="parameter-preview">
                    <strong>Parameter:</strong> {parameters[parameterToDelete]?.label}
                    <br />
                    <strong>Value:</strong> {parameters[parameterToDelete]?.value}
                  </div>
                )}
              </div>
            </div>
            <div className="fullscreen-modal-footer">
              <button 
                className="fullscreen-modal-btn fullscreen-modal-btn-secondary"
                onClick={handleCloseDeleteModal}
              >
                Cancel
              </button>
              <button 
                className="fullscreen-modal-btn fullscreen-modal-btn-danger"
                onClick={handleConfirmDelete}
              >
                Delete Parameter
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
