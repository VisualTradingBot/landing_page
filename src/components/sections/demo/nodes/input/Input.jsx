import "./input.scss";
import NodeDefault from "../nodeDefault";
import { useMemo, useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import PropTypes from "prop-types";
import { VariableFieldStandalone } from "../components";

export default function Input({ id, data }) {
  const { updateNodeData } = useReactFlow();
  const [dataSource, setDataSource] = useState(data?.dataSource || "synthetic");
  const [asset, setAsset] = useState(data?.asset || "bitcoin");
  const parameters = useMemo(() => data?.parameters || [], [data?.parameters]);
  const defaultVars = [
    { label: "fee", id: `var-${Date.now() + 1}`, parameterData: {} },
  ];
  const [variable, setVariable] = useState(
    () => data?.variables || defaultVars
  );

  useEffect(() => {
    if (updateNodeData && id) {
      updateNodeData(id, { variables: variable, asset, dataSource });
    }
  }, [variable, asset, dataSource, id, updateNodeData]);

  return (
    <NodeDefault
      id={id}
      title={data.label}
      right={{ active: true, type: "source" }}
    >
      <div
        className="hint-line"
        title="Use parameters to override Asset (btc/bitcoin/eth/ethereum) and Fee (percent, e.g., 0.05 for 0.05%)."
      >
        <span className="hint-icon">i</span>
        Data source and market
      </div>
      <div className="switch-case">
        <label className="input-type-label">Data Source:</label>
        <select
          value={dataSource}
          onChange={(e) => {
            const value = e.target.value;
            setDataSource(value);
            updateNodeData(id, { dataSource: value });
          }}
        >
          <option value="synthetic">Synthetic</option>
          <option value="real">Real (CoinGecko)</option>
        </select>

        <label className="input-type-label">Asset:</label>
        <select
          value={asset}
          onChange={(e) => {
            const value = e.target.value;
            setAsset(value);
            updateNodeData(id, { asset: value });
          }}
        >
          <option value="bitcoin">BTC</option>
          <option value="ethereum">ETH</option>
        </select>
      </div>
      <div className="variable-row" style={{ marginTop: 8 }}>
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

Input.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
