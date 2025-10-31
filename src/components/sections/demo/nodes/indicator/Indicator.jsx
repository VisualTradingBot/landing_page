import "./indicator.scss";
import NodeDefault from "../nodeDefault";
import { useReactFlow } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { VariableFieldStandalone } from "../components";

export default function Indicator({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const [selectType, setSelectType] = useState("30d_high");

  // Two slots: 'output' binds to indicator series, 'window' controls lookback
  const defaultVars = [
    { label: "output", id: `var-${Date.now()}`, parameterData: {} },
    { label: "window", id: `var-${Date.now() + 1}`, parameterData: {} },
  ];
  const [variable, setVariable] = useState(() => {
    const vars = data?.variables || defaultVars;
    console.log("Indicator initializing with variables:", vars);
    return vars;
  });
  const parameters = useMemo(() => data?.parameters || [], [data?.parameters]);

  useEffect(() => {
    if (updateNodeData && id) {
      updateNodeData(id, { variables: variable, type: selectType });
    }
  }, [variable, selectType, id, updateNodeData]);

  const handleChange = (event) => {
    const value = event.target.value;
    setSelectType(value);
    if (id && updateNodeData) {
      updateNodeData(id, { type: value });
    }
  };

  // connections available if needed in the future
  // const getConnection = useNodeConnections();

  return (
    <NodeDefault
      id={id}
      title={data.label}
      left={{ active: true, type: "target" }}
    >
      <div className="switch-case">
        <select onChange={handleChange} value={selectType}>
          <option value="30d_high">Rolling High</option>
          <option value="30d_low">Rolling Low</option>
          <option value="sma">SMA (Simple Moving Average)</option>
          <option value="ema">EMA (Exponential Moving Average)</option>
          <option value="rsi">RSI (Relative Strength Index)</option>
          <option value="bollinger_upper">Bollinger Upper Band</option>
          <option value="bollinger_lower">Bollinger Lower Band</option>
          <option value="atr">ATR (Average True Range)</option>
        </select>
      </div>
      <div className="variable-row">
        {variable.map((v) => (
          <div
            key={v.id}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            <label style={{ fontSize: 12, color: "#64748b" }}>{v.label}</label>
            <VariableFieldStandalone
              zoneId={`variable-${v.id}`}
              id={v.id}
              label={v.label}
              zoneCheck={{ variable: { allowedFamilies: ["variable"] } }}
              parameters={parameters}
              parameterData={v.parameterData}
              setVariables={setVariable}
            />
          </div>
        ))}
      </div>
    </NodeDefault>
  );
}

Indicator.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
