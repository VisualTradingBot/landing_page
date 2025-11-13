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
import IntroductionMask from "./tutorial/IntroductionMask";
import DemoTutorial from "./tutorial/DemoTutorial";

// Node components
import Buy from "./nodes/buy/Buy";
import Sell from "./nodes/sell/Sell";
import Record from "./nodes/record/Record";
import If from "./nodes/if/If";
import Input from "./nodes/input/Input";
import InputIndicator from "./nodes/inputIndicator/InputIndicator";
import InputPrice from "./nodes/inputPrice/InputPrice";
import SetParameter from "./nodes/setParameter/SetParameter";
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

export default function Demo() {
  // === State for parameters and graph ===
  const [parameters, setParameters] = useState(initialParameters); // List of user-defined parameters
  const [nodes, setNodes, rawOnNodesChange] = useNodesState(initialNodes); // Graph nodes
  const [edges, setEdges, rawOnEdgesChange] = useEdgesState(initialEdges); // Graph edges
  const isDraggingRef = useRef(false);
  const dragIdleTimeoutRef = useRef(null);
  const autoParamsSignatureRef = useRef(null);
  useEffect(
    () => () => {
      if (dragIdleTimeoutRef.current) {
        clearTimeout(dragIdleTimeoutRef.current);
      }
    },
    []
  );
  const onNodesChange = useCallback(
    (changes) => {
      if (dragIdleTimeoutRef.current) {
        clearTimeout(dragIdleTimeoutRef.current);
        dragIdleTimeoutRef.current = null;
      }

      const isDraggingUpdate = changes.some(
        (change) => change.type === "position" && change.dragging
      );
      const hasPositionChange = changes.some(
        (change) => change.type === "position"
      );

      if (isDraggingUpdate) {
        isDraggingRef.current = true;
      } else if (isDraggingRef.current && hasPositionChange) {
        dragIdleTimeoutRef.current = setTimeout(() => {
          isDraggingRef.current = false;
          dragIdleTimeoutRef.current = null;
        }, 80);
      }

      rawOnNodesChange(changes);
    },
    [rawOnNodesChange]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      rawOnEdgesChange(changes);
    },
    [rawOnEdgesChange]
  );
  const [selectedAsset, setSelectedAsset] = useState(DEFAULT_ASSET); // Currently selected asset
  const [dataResolution, setDataResolution] = useState(DEFAULT_DATA_RESOLUTION);
  const [feePercent, setFeePercent] = useState(DEFAULT_FEE_PERCENT);
  const [historyWindow, setHistoryWindow] = useState(DEFAULT_HISTORY_WINDOW);
  const [inTradeCollapsed, setInTradeCollapsed] = useState(false); // Collapse state for in-trade block
  const nodeDimensionsRef = useRef(new Map());
  const [dimensionsVersion, setDimensionsVersion] = useState(0);

  // === Modal state ===
  const [showParameterModal, setShowParameterModal] = useState(false); // Show add parameter modal
  const [parameterForm, setParameterForm] = useState({
    label: "",
    value: "",
    group: "",
  });
  const [parameterFormError, setParameterFormError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Show delete confirmation modal
  const [parameterIndexToDelete, setParameterIndexToDelete] = useState(null); // Index of parameter to delete
  const runBacktestHandlerRef = useRef(null);
  const [isRunHandlerReady, setRunHandlerReady] = useState(false);
  const [backtestStatus, setBacktestStatus] = useState({
    isLoading: false,
    progress: 0,
    hasStats: false,
    hasPrices: false,
    completed: false,
  });
  const [hasPendingChanges, setHasPendingChanges] = useState(true);
  const lastRunOptionsSignatureRef = useRef(null);
  const pendingSinceLastRunRef = useRef(false);

  const handleRegisterRunHandler = useCallback((handler) => {
    runBacktestHandlerRef.current =
      typeof handler === "function" ? handler : null;
    setRunHandlerReady(typeof handler === "function");
  }, []);

  const handleRunBacktestClick = useCallback(() => {
    if (runBacktestHandlerRef.current) {
      runBacktestHandlerRef.current();
    }
    if (backtestSectionRef.current) {
      backtestSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const isRunActionable =
    hasPendingChanges &&
    isRunHandlerReady &&
    backtestStatus.hasPrices &&
    !backtestStatus.isLoading;
  const runButtonDisabled = !isRunActionable;
  const runButtonLabel = !backtestStatus.hasPrices
    ? "Preparing Data…"
    : backtestStatus.isLoading
    ? "Running…"
    : !isRunHandlerReady
    ? "Preparing Runner…"
    : isRunActionable
    ? "Run Backtest"
    : "Up to Date";
  const runButtonClassName = [
    "run-backtest-button",
    isRunActionable ? "active" : "inactive",
    backtestStatus.isLoading ? "loading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const groupLookup = useMemo(() => {
    const map = new Map();
    parameters.forEach((param) => {
      if (!param || param.isAutoGenerated) return;
      const name = typeof param.group === "string" ? param.group.trim() : "";
      if (!name) return;
      const key = name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, name);
      }
    });
    return map;
  }, [parameters]);

  const existingGroups = useMemo(
    () => Array.from(groupLookup.values()).sort((a, b) => a.localeCompare(b)),
    [groupLookup]
  );

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
  const openParameterModal = useCallback(() => {
    setParameterForm({
      label: "",
      value: "",
      group: "",
    });
    setParameterFormError("");
    setShowParameterModal(true);
  }, []);

  const openDeleteModal = useCallback((index) => {
    setParameterIndexToDelete(index);
    setShowDeleteModal(true);
  }, []);

  const closeParameterModal = useCallback(() => {
    setShowParameterModal(false);
    setParameterForm({
      label: "",
      value: "",
      group: "",
    });
    setParameterFormError("");
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setParameterIndexToDelete(null);
  }, []);

  const handleParameterFormChange = useCallback((field, nextValue) => {
    setParameterForm((prev) => ({
      ...prev,
      [field]:
        typeof nextValue === "string" ? nextValue : String(nextValue ?? ""),
    }));
    setParameterFormError("");
  }, []);

  const addParameter = useCallback((newParam) => {
    setParameters((prev) => [...prev, newParam]);
  }, []);

  const editParameter = useCallback((id, field, value) => {
    if (!id || !field) {
      return;
    }

    setParameters((prev) =>
      prev.map((param) => {
        if (!param || param.id !== id) {
          return param;
        }

        if (field === "group") {
          if (value && value.trim()) {
            return { ...param, group: value.trim() };
          }
          const { group, ...rest } = param;
          return rest;
        }

        return { ...param, [field]: value };
      })
    );
  }, []);

  const handleParameterFormSubmit = useCallback(
    (event) => {
      event.preventDefault();

      const label = parameterForm.label.trim();
      const value = parameterForm.value.trim();
      const family = "variable";
      const rawGroup = parameterForm.group.trim();
      const canonicalGroup =
        rawGroup && groupLookup.has(rawGroup.toLowerCase())
          ? groupLookup.get(rawGroup.toLowerCase())
          : rawGroup;

      if (!label) {
        setParameterFormError("Parameter name is required.");
        return;
      }

      if (!value) {
        setParameterFormError("Parameter value is required.");
        return;
      }

      const duplicate = parameters.some(
        (param) =>
          param &&
          typeof param.label === "string" &&
          param.label.trim().toLowerCase() === label.toLowerCase()
      );

      if (duplicate) {
        setParameterFormError("A parameter with that name already exists.");
        return;
      }

      const existingIds = new Set(
        parameters
          .map((param) => (param ? param.id : null))
          .filter((id) => typeof id === "string")
      );

      let baseId = `param-${slugify(label)}`;
      if (!baseId.replace("param-", "")) {
        baseId = `param-${Date.now()}`;
      }

      let candidateId = baseId;
      let suffix = 1;
      while (existingIds.has(candidateId)) {
        candidateId = `${baseId}-${suffix++}`;
      }

      addParameter({
        id: candidateId,
        label,
        value,
        family,
        source: "user",
        group: canonicalGroup ? canonicalGroup : undefined,
      });

      setParameterFormError("");
      closeParameterModal();
    },
    [addParameter, closeParameterModal, groupLookup, parameterForm, parameters]
  );

  // === Parameter handlers ===
  const removeParameter = useCallback((index) => {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const confirmDeleteParameter = useCallback(() => {
    if (parameterIndexToDelete !== null) {
      removeParameter(parameterIndexToDelete);
    }
    closeDeleteModal();
  }, [parameterIndexToDelete, removeParameter, closeDeleteModal]);

  // === Node types for ReactFlow ===
  const toggleInTradeBlock = useCallback(() => {
    setInTradeCollapsed((prev) => !prev);
  }, []);

  // === Node types for ReactFlow ===
  const toggleInTradeBlock = useCallback(() => {
    setInTradeCollapsed((prev) => !prev);
  }, []);

  const nodeTypes = useMemo(
    () => ({
      buyNode: (props) => (
        <Buy
          {...props}
          onToggleInTrade={toggleInTradeBlock}
          isInTradeCollapsed={inTradeCollapsed}
        />
      ),
      sellNode: (props) => <Sell {...props} />,
      recordNode: Record,
      ifNode: If,
      inputNode: (props) => <Input {...props} />,
      inputIndicatorNode: (props) => <InputIndicator {...props} />,
      inputPriceNode: (props) => <InputPrice {...props} />,
      setParameterNode: (props) => <SetParameter {...props} />,
      blockNode: Block,
    }),
    [toggleInTradeBlock, inTradeCollapsed]
  );

  // === ReactFlow viewport extent ===
  const containerRef = useRef();
  const backtestSectionRef = useRef(null);
  const [translateExtent, setTranslateExtent] = useState([
    [1920, 1080],
    [0, 0],
  ]);

  const measureNodeDimensions = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isDraggingRef.current) return;
    const scopeRoot = containerRef.current;
    if (!scopeRoot) return;

    const selectorRoot = scopeRoot.querySelector(
      ".react-flow__renderer, .react-flow"
    )
      ? scopeRoot
      : document;

    let changed = false;
    const activeIds = new Set();

    nodes.forEach((node) => {
      activeIds.add(node.id);
      const selector = `.react-flow__node[data-id="${escapeNodeSelector(
        node.id
      )}"]`;
      const element = selectorRoot.querySelector(selector);
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const width = Math.max(rect.width, 0);
      const height = Math.max(rect.height, 0);
      const previous = nodeDimensionsRef.current.get(node.id);
      if (!previous || previous.width !== width || previous.height !== height) {
        nodeDimensionsRef.current.set(node.id, { width, height });
        changed = true;
      }
    });

    nodeDimensionsRef.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        nodeDimensionsRef.current.delete(id);
        changed = true;
      }
    });

    if (changed) {
      setDimensionsVersion((version) => version + 1);
    }
  }, [nodes]);

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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let frame = window.requestAnimationFrame(() => {
      measureNodeDimensions();
    });
    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [measureNodeDimensions]);

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
  // === Backtest options for BacktestView ===
  // Create lightweight signatures of nodes/edges that exclude layout/position
  // so backtestOptions doesn't recompute when the user moves nodes around.
  const nodesSignature = useMemo(() => {
    try {
      return JSON.stringify(
        nodes.map((n) => ({
          id: n.id,
          type: n.type,
          data: sanitizeForSignature(n.data),
        }))
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

  useEffect(() => {
    setNodes((prevNodes) => {
      let changed = false;
      const next = prevNodes.map((node) => {
        if (node.data?.parameters === parameters) {
          return node;
        }
        changed = true;
        return {
          ...node,
          data: {
            ...node.data,
            parameters,
          },
        };
      });
      return changed ? next : prevNodes;
    });
  }, [parameters, nodesSignature, setNodes]);

  useEffect(() => {
    if (autoParamsSignatureRef.current === nodesSignature) {
      return;
    }
    autoParamsSignatureRef.current = nodesSignature;
    setParameters((prev) => {
      const { changed, next } = reconcileParametersWithAuto(prev, nodes);
      return changed ? next : prev;
    });
  }, [nodesSignature, nodes, setParameters]);

  const blockNode = useMemo(
    () =>
      nodes.find(
        (n) => n.type === "blockNode" && n.data?.label === "In a trade"
      ) || null,
    [nodes]
  );

  const FALLBACK_BLOCK_SIZE = 700;
  const BLOCK_PADDING = 32;

  // Parse the signatures back into lightweight structures for computing
  // options. This avoids referencing the full `nodes`/`edges` arrays inside
  // the main backtestOptions useMemo so position-only changes won't force
  // recomputation.
  const nodeMetaById = useMemo(() => {
    void dimensionsVersion;
    const map = new Map();
    nodes.forEach((node) => {
      const storedDimensions = nodeDimensionsRef.current.get(node.id);
      const width = Number.isFinite(node.width)
        ? node.width
        : storedDimensions?.width ?? DEFAULT_NODE_WIDTH;
      const height = Number.isFinite(node.height)
        ? node.height
        : storedDimensions?.height ?? DEFAULT_NODE_HEIGHT;
      map.set(node.id, {
        position: node.position || null,
        width,
        height,
        positionAbsolute: node.positionAbsolute || null,
      });
    });
    return map;
  }, [nodes, dimensionsVersion]);

  const blockBounds = useMemo(() => {
    void dimensionsVersion;
    if (!blockNode?.position) return null;
    const storedDimensions = nodeDimensionsRef.current.get(blockNode.id);
    const width =
      storedDimensions?.width ?? blockNode.width ?? FALLBACK_BLOCK_SIZE;
    const height =
      storedDimensions?.height ?? blockNode.height ?? FALLBACK_BLOCK_SIZE;
    return {
      minX: blockNode.position.x,
      maxX: blockNode.position.x + width,
      minY: blockNode.position.y,
      maxY: blockNode.position.y + height,
    };
  }, [blockNode, dimensionsVersion]);

  const nodesById = useMemo(() => {
    const map = new Map();
    nodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [nodes]);

  const anchorNodeId = useMemo(() => {
    if (blockNode?.data?.anchorNodeId) {
      return blockNode.data.anchorNodeId;
    }
    const firstBuy = nodes.find((n) => n.type === "buyNode");
    return firstBuy ? firstBuy.id : null;
  }, [blockNode, nodes]);

  const inTradeNodeIds = useMemo(() => {
    const ids = new Set();
    nodes.forEach((node) => {
      if (node.id === blockNode?.id) return;
      if (node.data?.preventInTradeGrouping) {
        return;
      }
      if (node.data?.forceInTradeGrouping) {
        ids.add(node.id);
        return;
      }
      if (!blockBounds) return;
      const pos = node.position;
      if (!pos) return;
      if (
        pos.x >= blockBounds.minX &&
        pos.x <= blockBounds.maxX &&
        pos.y >= blockBounds.minY &&
        pos.y <= blockBounds.maxY
      ) {
        ids.add(node.id);
      }
    });
    return ids;
  }, [nodes, blockBounds, blockNode?.id]);

  const handleNodesChange = useCallback(
    (changes) => {
      const bufferedChanges = [...changes];
      let anchorDeltaX = 0;
      let anchorDeltaY = 0;
      let anchorMoved = false;

      if (anchorNodeId && blockNode) {
        const existingIds = new Set(bufferedChanges.map((change) => change.id));

        changes.forEach((change) => {
          if (
            change.type !== "position" ||
            !change.position ||
            change.id !== anchorNodeId
          ) {
            return;
          }

          const meta = nodeMetaById.get(change.id);
          const previous = meta?.position;
          if (!previous) return;

          const deltaX = change.position.x - previous.x;
          const deltaY = change.position.y - previous.y;
          if (!deltaX && !deltaY) return;

          anchorMoved = true;
          anchorDeltaX += deltaX;
          anchorDeltaY += deltaY;

          const appendChange = (nodeId) => {
            if (!nodeId || existingIds.has(nodeId)) return;
            const targetMeta = nodeMetaById.get(nodeId);
            if (!targetMeta?.position) return;
            const node = nodesById.get(nodeId);
            if (node?.data?.preventInTradeGrouping) return;

            const nextChange = {
              id: nodeId,
              type: "position",
              position: {
                x: targetMeta.position.x + deltaX,
                y: targetMeta.position.y + deltaY,
              },
            };

            if (targetMeta.positionAbsolute) {
              nextChange.positionAbsolute = {
                x: targetMeta.positionAbsolute.x + deltaX,
                y: targetMeta.positionAbsolute.y + deltaY,
              };
            }

            bufferedChanges.push(nextChange);
            existingIds.add(nodeId);
          };

          appendChange(blockNode.id);

          inTradeNodeIds.forEach((nodeId) => {
            if (nodeId === change.id) return;
            appendChange(nodeId);
          });
        });
      }

      const boundsForClamp =
        anchorMoved && blockBounds
          ? {
              minX: blockBounds.minX + anchorDeltaX,
              maxX: blockBounds.maxX + anchorDeltaX,
              minY: blockBounds.minY + anchorDeltaY,
              maxY: blockBounds.maxY + anchorDeltaY,
            }
          : blockBounds;

      if (!boundsForClamp || inTradeNodeIds.size === 0) {
        onNodesChange(bufferedChanges);
        return;
      }

      const minX = boundsForClamp.minX + BLOCK_PADDING;
      const minY = boundsForClamp.minY + BLOCK_PADDING;
      const nextChanges = bufferedChanges.map((change) => {
        if (change.type !== "position" || !change.position) {
          return change;
        }

        if (!inTradeNodeIds.has(change.id)) {
          return change;
        }

        const meta = nodeMetaById.get(change.id) || {};
        const width = meta.width ?? 180;
        const height = meta.height ?? 140;

        const maxX = Math.max(
          minX,
          boundsForClamp.maxX - width - BLOCK_PADDING
        );
        const maxY = Math.max(
          minY,
          boundsForClamp.maxY - height - BLOCK_PADDING
        );

        const clampedX = Math.min(Math.max(change.position.x, minX), maxX);
        const clampedY = Math.min(Math.max(change.position.y, minY), maxY);

        if (clampedX === change.position.x && clampedY === change.position.y) {
          return change;
        }

        const nextChange = {
          ...change,
          position: { x: clampedX, y: clampedY },
        };

        if (change.positionAbsolute) {
          nextChange.positionAbsolute = {
            x: Math.min(Math.max(change.positionAbsolute.x, minX), maxX),
            y: Math.min(Math.max(change.positionAbsolute.y, minY), maxY),
          };
        }

        return nextChange;
      });

      onNodesChange(nextChanges);
    },
    [
      onNodesChange,
      blockBounds,
      inTradeNodeIds,
      nodeMetaById,
      blockNode,
      anchorNodeId,
      nodesById,
    ]
  );

  useEffect(() => {
    if (!blockNode) return;

    const hiddenClass = "in-trade-hidden";
    const applyClassName = (className, hidden) => {
      const tokens = new Set((className || "").split(/\s+/).filter(Boolean));
      if (hidden) {
        tokens.add(hiddenClass);
      } else {
        tokens.delete(hiddenClass);
      }
      return tokens.size ? Array.from(tokens).join(" ") : undefined;
    };

    setNodes((prevNodes) => {
      let changed = false;
      const nextNodes = prevNodes.map((node) => {
        const isInTrade =
          node.id === blockNode.id || inTradeNodeIds.has(node.id);
        const shouldHide = isInTrade && inTradeCollapsed;

        const nextClassName = applyClassName(node.className, shouldHide);
        const classChanged = nextClassName !== (node.className || undefined);

        let nextData = node.data;
        let dataChanged = false;
        if (isInTrade) {
          const currentHidden = node.data?.isInTradeHidden ?? false;
          if (currentHidden !== shouldHide) {
            nextData = { ...(node.data || {}), isInTradeHidden: shouldHide };
            dataChanged = true;
          }
        } else if (node.data?.isInTradeHidden !== undefined) {
          const { isInTradeHidden, ...rest } = node.data;
          nextData = rest;
          dataChanged = true;
        }

        const isAnchor = anchorNodeId && node.id === anchorNodeId;
        const needsDraggableUpdate = isAnchor
          ? node.draggable !== inTradeCollapsed
          : Object.prototype.hasOwnProperty.call(node, "draggable") &&
            !isAnchor;

        if (!classChanged && !dataChanged && !needsDraggableUpdate) {
          return node;
        }

        const updated = { ...node };

        if (classChanged) {
          if (nextClassName === undefined) {
            delete updated.className;
          } else {
            updated.className = nextClassName;
          }
        }

        if (dataChanged) {
          updated.data = nextData;
        }

        if (isAnchor) {
          updated.draggable = inTradeCollapsed;
        } else if (Object.prototype.hasOwnProperty.call(updated, "draggable")) {
          delete updated.draggable;
        }

        changed = true;
        return updated;
      });

      return changed ? nextNodes : prevNodes;
    });
  }, [anchorNodeId, blockNode, inTradeCollapsed, inTradeNodeIds, setNodes]);

  useEffect(() => {
    setEdges((prevEdges) => {
      let changed = false;
      const nextEdges = prevEdges.map((edge) => {
        const inside =
          inTradeNodeIds.has(edge.source) && inTradeNodeIds.has(edge.target);
        const shouldHide = inTradeCollapsed && inside;
        if ((edge.hidden ?? false) === shouldHide) {
          return edge;
        }
        changed = true;
        return { ...edge, hidden: shouldHide };
      });
      return changed ? nextEdges : prevEdges;
    });
  }, [inTradeCollapsed, inTradeNodeIds, setEdges]);

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

    const resolvedResolution =
      inputNode?.data?.resolution || dataResolution || DEFAULT_DATA_RESOLUTION;
    let resolvedInterval = Number(inputNode?.data?.interval);
    if (!Number.isFinite(resolvedInterval) || resolvedInterval <= 0) {
      resolvedInterval = syntheticInterval || DEFAULT_SYNTHETIC_INTERVAL;
    }

    const resolvedResolution =
      inputNode?.data?.resolution || dataResolution || DEFAULT_DATA_RESOLUTION;
    let resolvedInterval = Number(inputNode?.data?.interval);
    if (!Number.isFinite(resolvedInterval) || resolvedInterval <= 0) {
      resolvedInterval = historyWindow || DEFAULT_HISTORY_WINDOW;
    }

    const resolvedFee =
      inputNode?.data?.feePercent || feePercent || DEFAULT_FEE_PERCENT;

    opts.feePercent = Number(resolvedFee);
    opts.dataResolution = resolvedResolution;
    opts.historyWindow = resolvedInterval;
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
  }, [
    logicalNodes,
    logicalEdges,
    parameters,
    dataResolution,
    syntheticInterval,
  ]);

  // === Tutorial handlers ===
  const handleIntroductionMaskComplete = useCallback(() => {
    setShowIntroductionMask(false);
    // Start tutorial after introduction mask
    const hasCompletedTutorial =
      localStorage.getItem("demo-tutorial-completed") === "true";
    if (!hasCompletedTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setShowTutorial(false);
  }, []);

  // Function to reset and start tutorial (for testing)
  const handleStartTutorial = useCallback(() => {
    // Clear tutorial completion flags
    localStorage.removeItem("demo-tutorial-completed");
    localStorage.removeItem("demo-introduction-mask-shown");
    // Reset states
    setShowIntroductionMask(true);
    setShowTutorial(false);
  }, []);

  // Check if introduction mask should be shown
  useEffect(() => {
    const hasShownMask =
      localStorage.getItem("demo-introduction-mask-shown") === "true";
    const hasCompletedTutorial =
      localStorage.getItem("demo-tutorial-completed") === "true";

    // Only show mask if it hasn't been shown and tutorial hasn't been completed
    if (!hasShownMask && !hasCompletedTutorial) {
      setShowIntroductionMask(true);
    } else if (hasShownMask && !hasCompletedTutorial) {
      // If mask was shown but tutorial not completed, start tutorial directly
      setShowTutorial(true);
    }
  }, []);

  return (
    <AssetContext.Provider
      value={{
        selectedAsset,
        setSelectedAsset,
        dataResolution,
        setDataResolution,
        syntheticInterval,
        setSyntheticInterval,
      }}
    >
      {/* Introduction Mask */}
      {showIntroductionMask && (
        <IntroductionMask onComplete={handleIntroductionMaskComplete} />
      )}

      <section id="demo" className="demo">
        {/* Test Tutorial Button - Only visible in development or always visible for testing */}
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            background: "#000000",
            color: "#ffffff",
            padding: "12px 20px",
            border: "2px solid #000000",
            cursor: "pointer",
            fontFamily: "ShareTechMono, monospace",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            boxShadow: "4px 4px 0 rgba(0, 0, 0, 0.2)",
            transition: "all 0.2s ease",
          }}
          onClick={handleStartTutorial}
          onMouseEnter={(e) => {
            e.target.style.background = "#ffffff";
            e.target.style.color = "#000000";
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "6px 6px 0 rgba(0, 0, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "#000000";
            e.target.style.color = "#ffffff";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "4px 4px 0 rgba(0, 0, 0, 0.2)";
          }}
        >
          🎓 Test Tutorial
        </div>

        {/* === Demo Header === */}
        <div className="demo-header">
          <h2 className="demo-title">try it out</h2>
        </div>

        {/* === Drag-and-drop algorithm builder === */}
        <div
          ref={containerRef}
          className="demo-flow-canvas"
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
            onNodesChange={handleNodesChange}
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
              onShowModal={openParameterModal}
              onShowDeleteModal={openDeleteModal}
              isExpandedByTutorial={
                showTutorial ? parameterDashboardExpanded : null
              }
              onEditParameter={editParameter}
            />
          </ReactFlow>

          {/* Tutorial component */}
          {showTutorial && (
            <DemoTutorial
              nodes={nodes}
              onTutorialComplete={handleTutorialComplete}
              onExpandInTrade={setInTradeCollapsed}
              onParameterDashboardToggle={setParameterDashboardExpanded}
            />
          )}
          <div className="run-backtest-overlay">
            <button
              type="button"
              className={runButtonClassName}
              onClick={handleRunBacktestClick}
              disabled={runButtonDisabled}
            >
              {runButtonLabel}
            </button>
            {backtestStatus.isLoading}
          </div>
        </div>

        {/* <div className="divider-demo"></div> */}

        {/* === Backtest results section === */}
        <div className="backtest">
          <BacktestView options={backtestOptions} externalControl />
        <div className="backtest" ref={backtestSectionRef}>
          <BacktestView
            options={backtestOptions}
            onRegisterRunHandler={handleRegisterRunHandler}
            onRunStateChange={handleRunBacktestStatusChange}
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
                <h2>Add Parameter</h2>
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
                  className="fullscreen-modal-btn fullscreen-modal-btn-secondary"
                  type="button"
                  onClick={closeParameterModal}
                >
                  Cancel
                </button>
                <button
                  className="fullscreen-modal-btn fullscreen-modal-btn-primary"
                  type="submit"
                  form="parameter-form"
                >
                  Create Parameter
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
