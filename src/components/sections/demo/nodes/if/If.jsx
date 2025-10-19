import "./if.scss";
import PropTypes from "prop-types";
import NodeDefault from "../nodeDefault";
import { useMemo, useState, useEffect } from "react";
import { VariableFieldStandalone } from "../components";
import { useReactFlow } from "@xyflow/react";

export default function If({ data, id }) {
  // connections if needed in the future
  // const getConnection = useNodeConnections();
  const parameters = useMemo(() => data?.parameters || [], [data?.parameters]);
  //const sourceData = useNodesData(getConnection?.[0].source);

  // Initialize variables either from node data (persisted) or fallback to defaults
  const defaultVars = [
    { label: "var-1", id: `var-${Date.now()}`, parameterData: {} },
    { label: "var-2", id: `var-${Date.now() + 1}`, parameterData: {} },
    { label: "operator", id: `var-${Date.now() + 2}`, parameterData: {} },
  ];

  const [variable, setVariable] = useState(
    () => data?.variables || defaultVars
  );
  const { updateNodeData } = useReactFlow();

  // Persist variables into the node's data so parent (Demo) can read them
  useEffect(() => {
    if (updateNodeData && id) {
      updateNodeData(id, { variables: variable });
    }
  }, [variable, id, updateNodeData]);

  return (
    <NodeDefault
      id={id}
      title={data.label}
      top={{ active: true, type: "target" }}
      bottom={{ active: true, type: "source" }}
      right={{ active: true, type: "source" }}
    >
      <div
        className="hint-line"
        title="Bind left/right values and the operator via parameters. Operator accepts one of >, <, ==, >=, <=. Left/right can be numbers, 'close', or expressions like 'entry * 0.95'."
      >
        <span className="hint-icon">i</span>
        If condition
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
