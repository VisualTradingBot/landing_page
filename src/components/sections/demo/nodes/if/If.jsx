import "./if.scss";
import PropTypes from "prop-types";
import NodeDefault from "../nodeDefault";
import { useState, useEffect, useCallback } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";

export default function If({ data, id }) {
  const { updateNodeData } = useReactFlow();
  // Initialize variables either from node data (persisted) or fallback to defaults
  const defaultVars = [
    {
      label: "condition-left",
      id: `var-${Date.now()}`,
      parameterData: {},
      type: "input",
    },
    {
      label: "condition-right",
      id: `var-${Date.now() + 1}`,
      parameterData: {},
      type: "input",
    },
    {
      label: "operator",
      id: `var-${Date.now() + 2}`,
      parameterData: { value: ">" },
      type: "operator",
    },
  ];

  const [variable, setVariable] = useState(() => {
    // Preserve existing variables if they exist, but ensure they have the required structure
    if (data?.variables) {
      return data.variables.map((v) => ({
        ...v,
        type: v.type || (v.label === "operator" ? "operator" : "input"),
      }));
    }
    return defaultVars;
  });

  // Persist variables and isMaster into the node's data
  useEffect(() => {
    if (updateNodeData && id) {
      // Normalize variable shapes for backend simplicity
      const normalized = (variable || []).map((v, idx) => {
        let pd = v.parameterData ?? {};
        // If operator slot contains a raw string (e.g. '>' ), wrap it
        if (idx === 2 && typeof pd === "string") {
          pd = { value: pd };
        }
        if (typeof pd !== "object") {
          pd = { value: pd };
        }
        return { ...v, parameterData: pd };
      });

      // Also expose a canonical operator field for easier parsing
      const canonicalOperator = normalized[2]?.parameterData?.value ?? null;

      updateNodeData(id, {
        variables: normalized,

        operator: canonicalOperator,
      });
    }
  }, [variable, id, updateNodeData]);

  // Sync with global parameter updates emitted by ParameterBlock
  useEffect(() => {
    const handler = (ev) => {
      const params = ev?.detail || ev;
      if (!params || !Array.isArray(variable)) return;

      let updated = false;
      const newVars = variable.map((v) => {
        const pid = v?.parameterData?.parameterId;
        if (!pid) return v;
        const match = params.find((p) => p.id === pid);
        if (!match) return v;
        // if label/value changed, update
        const cur = v.parameterData || {};
        if (
          cur.label !== match.label ||
          cur.value !== match.value ||
          cur.source !== match.source
        ) {
          updated = true;
          const nextParameterData = {
            ...cur,
            label: match.label,
            value: match.value,
          };

          if (match.source) {
            nextParameterData.source = match.source;
          }

          return {
            ...v,
            parameterData: nextParameterData,
            paramName:
              (match.source || "user") === "system" ? match.label : undefined,
          };
        }
        return v;
      });

      if (updated) {
        setVariable(newVars);
        try {
          updateNodeData(id, { variables: newVars });
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener("parametersUpdated", handler);
    return () => window.removeEventListener("parametersUpdated", handler);
  }, [variable, id, updateNodeData]);

  // Drag and drop handlers for parameter fields
  const [dragOverZone, setDragOverZone] = useState({});

  const handleDragOver = useCallback((e, variableIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverZone((prev) => ({ ...prev, [variableIndex]: true }));
  }, []);

  const handleDragLeave = useCallback((e, variableIndex) => {
    e.preventDefault();
    setDragOverZone((prev) => ({ ...prev, [variableIndex]: false }));
  }, []);

  const handleDrop = useCallback((e, variableIndex) => {
    e.preventDefault();
    setDragOverZone((prev) => ({ ...prev, [variableIndex]: false }));

    try {
      const dragData = JSON.parse(
        e.dataTransfer.getData("application/reactflow")
      );
      if (dragData && dragData.family === "variable") {
        setVariable((prev) => {
          const newVars = [...prev];
          newVars[variableIndex] = {
            ...newVars[variableIndex],
            parameterData: {
              parameterId: dragData.id,
              label: dragData.label,
              value: dragData.value,
              source: dragData.source || "user",
            },
            paramName:
              (dragData.source || "user") === "system"
                ? dragData.label
                : undefined,
          };
          return newVars;
        });
      }
    } catch (error) {
      console.error("Error handling drop:", error);
    }
  }, []);

  const handleParameterDragStart = useCallback(
    (e, variableIndex) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = "move";
      const paramData = variable[variableIndex].parameterData;
      if (!paramData || !paramData.label) return;
      e.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({
          label: paramData.label,
          value: paramData.value,
          family: "variable",
          id: paramData.parameterId,
          source: paramData.source || "user",
        })
      );
    },
    [variable]
  );

  const handleParameterDragEnd = useCallback((variableIndex) => {
    // Clear the parameter when dragged away
    setVariable((prev) => {
      const newVars = [...prev];
      newVars[variableIndex] = {
        ...newVars[variableIndex],
        parameterData: {},
        paramName: undefined,
      };
      return newVars;
    });
  }, []);

  const handleParameterDoubleClick = useCallback((variableIndex) => {
    // Clear the parameter when double-clicked
    setVariable((prev) => {
      const newVars = [...prev];
      newVars[variableIndex] = {
        ...newVars[variableIndex],
        parameterData: {},
        paramName: undefined,
      };
      return newVars;
    });
  }, []);

  return (
    <NodeDefault id={id} title="If">
      <div className="if-condition-container">
        <div className="condition-row">
          <div className="condition-parameter">
            {variable[0].parameterData &&
            Object.keys(variable[0].parameterData).length > 0 ? (
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
                className={`parameter-placeholder ${
                  dragOverZone[0] ? "drag-over" : ""
                }`}
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
            value={
              typeof variable[2].parameterData === "string"
                ? variable[2].parameterData
                : variable[2].parameterData?.value || ""
            }
            onChange={(e) => {
              const newVar = [...variable];
              newVar[2].parameterData = { value: e.target.value };
              setVariable(newVar);
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value="==">==</option>
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
          </select>

          <div className="condition-parameter">
            {variable[1].parameterData &&
            Object.keys(variable[1].parameterData).length > 0 ? (
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
                className={`parameter-placeholder ${
                  dragOverZone[1] ? "drag-over" : ""
                }`}
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
          left: "0px",
          width: "12px",
          height: "12px",
          background: "#fff",
          border: "2px solid #000000",
          borderRadius: "50%",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.18)",
          transform: "translateX(-5px)", // Custom left handle position - less far left
        }}
        className="if-handle-left"
      />

      {/* Custom handles for True and False outputs */}
      <Handle
        id={`${id}-true`}
        type="source"
        position={Position.Bottom}
        style={{
          left: "68%",
          bottom: "0px",
          width: "12px",
          height: "12px",
          background: "#fff",
          border: "2px solid #000000",
          borderRadius: "50%",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.18)",
          transform: "translateY(6px)", // Custom bottom handle position
        }}
        className="if-handle-true"
      />
      <Handle
        id={`${id}-false`}
        type="source"
        position={Position.Bottom}
        style={{
          left: "28%",
          bottom: "0px",
          width: "12px",
          height: "12px",
          background: "#fff",
          border: "2px solid #000000",
          borderRadius: "50%",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.18)",
          transform: "translateY(6px)", // Custom bottom handle position
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
