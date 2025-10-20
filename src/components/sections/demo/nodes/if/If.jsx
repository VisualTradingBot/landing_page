import "./if.scss";
import PropTypes from "prop-types";
import NodeDefault from "../nodeDefault";
import { useMemo, useState, useEffect } from "react";
import { VariableFieldStandalone } from "../components";
import { useReactFlow } from "@xyflow/react";

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

  return (
    <NodeDefault
      id={id}
      title={data.label}
      top={{ active: true, type: "target" }}
      bottom={{ active: true, type: "source" }}
      right={{ active: true, type: "source" }}
    >
      <div className="node-header-controls">
        <div
          className="hint-line"
          title="Bind left/right values and the operator via parameters. Operator accepts one of >, <, ==, >=, <=. Left/right can be numbers, 'close', or expressions like 'entry * 0.95'."
        >
          <span className="hint-icon">i</span>
          If condition
        </div>
        {!isConnectedToMaster && (
          <label
            className="master-checkbox"
            title="Master nodes start execution trees. Only one master node should be active."
          >
            <input
              type="checkbox"
              checked={isMaster}
              onChange={(e) => setIsMaster(e.target.checked)}
            />
            <span className="checkbox-label">Master</span>
          </label>
        )}
        {isConnectedToMaster && (
          <span
            className="slave-badge"
            title="This node is connected to a master node"
          >
            Slave
          </span>
        )}
      </div>
      <div className="condition-row">
        <VariableFieldStandalone
          key={variable[0].id}
          zoneId={`variable-${variable[0].id}`}
          id={variable[0].id}
          label={variable[0].label}
          zoneCheck={{
            variable: {
              allowedFamilies: ["variable"],
            },
          }}
          parameters={parameters}
          parameterData={variable[0].parameterData}
          setVariables={setVariable}
        />
        <select
          className="condition-operator"
          value={variable[2].parameterData || ""}
          onChange={(e) => {
            const newVar = [...variable];
            newVar[2].parameterData = e.target.value;
            setVariable(newVar);
          }}
        >
          <option value=">">&gt;</option>
          <option value="<">&lt;</option>
          <option value="==">==</option>
          <option value=">=">&gt;=</option>
          <option value="<=">&lt;=</option>
        </select>
        <VariableFieldStandalone
          key={variable[1].id}
          zoneId={`variable-${variable[1].id}`}
          id={variable[1].id}
          label={variable[1].label}
          zoneCheck={{
            variable: {
              allowedFamilies: ["variable"],
            },
          }}
          parameters={parameters}
          parameterData={variable[1].parameterData}
          setVariables={setVariable}
        />
      </div>
      <div className="param-badges">
        {variable.map((v) => {
          const label = String(v.parameterData?.label || "").toLowerCase();
          const show =
            label.includes("lookback") ||
            label.includes("window") ||
            label.includes("period") ||
            label.includes("stop") ||
            label.includes("loss") ||
            label.includes("fee") ||
            label.includes("asset");
          if (!show) return null;
          return (
            <span key={`badge-${v.id}`} className="param-badge">
              {v.parameterData?.label}
            </span>
          );
        })}
      </div>
      <div className="variable-row"></div>
    </NodeDefault>
  );
}

If.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
