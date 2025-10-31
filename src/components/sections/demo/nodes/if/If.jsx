import "./if.scss";
import PropTypes from "prop-types";
import NodeDefault from "../nodeDefault";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";

export default function If({ data, id }) {
  const parameters = useMemo(() => data?.parameters || [], [data?.parameters]);
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  // Initialize variables either from node data (persisted) or fallback to defaults
  const defaultVars = [
    { label: "var-1", id: `var-${Date.now()}`, parameterData: {} },
    { label: "var-2", id: `var-${Date.now() + 1}`, parameterData: {} },
    { label: "operator", id: `var-${Date.now() + 2}`, parameterData: {} },
  ];

  const [variable, setVariable] = useState(
    () => data?.variables || defaultVars
  );
  const [isMaster, setIsMaster] = useState(() => data?.isMaster ?? false);

  // Check if this node is reachable from any master node
  const isConnectedToMaster = useMemo(() => {
    const nodes = getNodes();
    const edges = getEdges();

    // Find all master nodes
    const masterNodes = nodes.filter(
      (n) => n.type === "ifNode" && n.data?.isMaster === true && n.id !== id // Exclude self
    );

    if (masterNodes.length === 0) return false;

    // Build reverse edge map (to traverse backwards from this node)
    const reverseEdgeMap = new Map();
    edges.forEach((e) => {
      if (!reverseEdgeMap.has(e.target)) reverseEdgeMap.set(e.target, []);
      reverseEdgeMap.get(e.target).push(e.source);
    });

    // BFS backwards from current node to see if we can reach a master
    const visited = new Set();
    const queue = [id];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      // Check if current is a master
      if (masterNodes.some((m) => m.id === current)) {
        return true; // Found a master node in our ancestry
      }

      // Add incoming edges to queue
      const incoming = reverseEdgeMap.get(current) || [];
      incoming.forEach((source) => {
        if (!visited.has(source)) {
          queue.push(source);
        }
      });
    }

    return false;
  }, [getNodes, getEdges, id]);

  // If connected to master, cannot be master itself
  useEffect(() => {
    if (isConnectedToMaster && isMaster) {
      setIsMaster(false);
    }
  }, [isConnectedToMaster, isMaster]);

  // Persist variables and isMaster into the node's data
  useEffect(() => {
    if (updateNodeData && id) {
      updateNodeData(id, { variables: variable, isMaster });
    }
  }, [variable, isMaster, id, updateNodeData]);

  // Drag and drop handlers for parameter fields
  const [dragOverZone, setDragOverZone] = useState({});

  const handleDragOver = useCallback((e, variableIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverZone(prev => ({ ...prev, [variableIndex]: true }));
  }, []);

  const handleDragLeave = useCallback((e, variableIndex) => {
    e.preventDefault();
    setDragOverZone(prev => ({ ...prev, [variableIndex]: false }));
  }, []);

  const handleDrop = useCallback((e, variableIndex) => {
    e.preventDefault();
    setDragOverZone(prev => ({ ...prev, [variableIndex]: false }));
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/reactflow'));
      if (dragData && dragData.family === 'variable') {
        setVariable(prev => {
          const newVars = [...prev];
          newVars[variableIndex] = {
            ...newVars[variableIndex],
            parameterData: {
              parameterId: dragData.id,
              label: dragData.label,
              value: dragData.value
            }
          };
          return newVars;
        });
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, []);

  const handleParameterDragStart = useCallback((e, variableIndex) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    const paramData = variable[variableIndex].parameterData;
    e.dataTransfer.setData('application/reactflow', JSON.stringify({
      label: paramData.label,
      value: paramData.value,
      family: "variable",
      id: paramData.parameterId
    }));
  }, [variable]);

  const handleParameterDragEnd = useCallback((variableIndex) => {
    // Clear the parameter when dragged away
    setVariable(prev => {
      const newVars = [...prev];
      newVars[variableIndex] = {
        ...newVars[variableIndex],
        parameterData: {}
      };
      return newVars;
    });
  }, []);

  const handleParameterDoubleClick = useCallback((variableIndex) => {
    // Clear the parameter when double-clicked
    setVariable(prev => {
      const newVars = [...prev];
      newVars[variableIndex] = {
        ...newVars[variableIndex],
        parameterData: {}
      };
      return newVars;
    });
  }, []);

  return (
    <NodeDefault
      id={id}
      title="If"
      top={{ active: false, type: "target" }} // Disable default top handle
      bottom={{ active: false, type: "source" }} // Disable default bottom handle
      left={{ active: false, type: "target" }} // Disable default left handle
      right={{ active: false, type: "source" }}
    >
      <div className="if-condition-container">
        <div className="condition-row">
          <div className="condition-parameter">
            {variable[0].parameterData && Object.keys(variable[0].parameterData).length > 0 ? (
              <div 
                className="parameter-connected"
                draggable
                onDragStart={(e) => handleParameterDragStart(e, 0)}
                onDragEnd={() => handleParameterDragEnd(0)}
                onDoubleClick={() => handleParameterDoubleClick(0)}
              >
                {variable[0].parameterData.label}
              </div>
            ) : (
              <div 
                className={`parameter-placeholder ${dragOverZone[0] ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, 0)}
                onDragLeave={(e) => handleDragLeave(e, 0)}
                onDrop={(e) => handleDrop(e, 0)}
              >
                Drag parameter here
              </div>
            )}
          </div>
          
          <select
            className="condition-operator"
            value={variable[2].parameterData || ""}
            onChange={(e) => {
              const newVar = [...variable];
              newVar[2].parameterData = e.target.value;
              setVariable(newVar);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.stopImmediatePropagation();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              e.stopImmediatePropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.stopImmediatePropagation();
            }}
          >
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value="==">==</option>
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
          </select>
          
          <div className="condition-parameter">
            {variable[1].parameterData && Object.keys(variable[1].parameterData).length > 0 ? (
              <div 
                className="parameter-connected"
                draggable
                onDragStart={(e) => handleParameterDragStart(e, 1)}
                onDragEnd={() => handleParameterDragEnd(1)}
                onDoubleClick={() => handleParameterDoubleClick(1)}
              >
                {variable[1].parameterData.label}
              </div>
            ) : (
              <div 
                className={`parameter-placeholder ${dragOverZone[1] ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, 1)}
                onDragLeave={(e) => handleDragLeave(e, 1)}
                onDrop={(e) => handleDrop(e, 1)}
              >
                Drag parameter here
              </div>
            )}
          </div>
        </div>
      </div>
     
      
      {/* Output labels */}
      <div className="if-outputs">
        <div className="output-label">False</div>
        <div className="output-label">True</div>
      </div>
      
      {/* Custom left handle */}
      <Handle
        id={`${id}-left`}
        type="target"
        position={Position.Left}
        style={{ 
          left: '0px',
          width: '12px',
          height: '12px',
          background: '#fff',
          border: '2px solid #000000',
          borderRadius: '50%',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
          transform: 'translateX(-5px)' // Custom left handle position - less far left
        }}
        className="if-handle-left"
      />
      
      {/* Custom handles for True and False outputs */}
      <Handle
        id={`${id}-true`}
        type="source"
        position={Position.Bottom}
        style={{ 
          left: '68%', 
          bottom: '0px',
          width: '12px',
          height: '12px',
          background: '#fff',
          border: '2px solid #000000',
          borderRadius: '50%',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
          transform: 'translateY(6px)' // Custom bottom handle position
        }}
        className="if-handle-true"
      />
      <Handle
        id={`${id}-false`}
        type="source"
        position={Position.Bottom}
        style={{ 
          left: '28%', 
          bottom: '0px',
          width: '12px',
          height: '12px',
          background: '#fff',
          border: '2px solid #000000',
          borderRadius: '50%',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
          transform: 'translateY(6px)' // Custom bottom handle position
        }}
        className="if-handle-false"
      />
    </NodeDefault>
  );
}

If.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
