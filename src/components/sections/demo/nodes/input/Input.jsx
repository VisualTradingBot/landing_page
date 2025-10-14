import "./input.scss";
import NodeDefault from "../nodeDefault";
import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import PropTypes from "prop-types";

export default function Input({ id, data }) {
  const [inputType, setInputType] = useState("");

  const handleImport = () => {
    // for now just a alert that it is a feature in development
    alert("Import feature is in development");
  };

  const { updateNodeData } = useReactFlow();

  const handleChange = (event) => {
    updateNodeData("inputNode", { input: event.target.value });
  };

  return (
    <NodeDefault
      id={id}
      title={data.label}
      right={{ active: true, type: "source" }}
    >
      <div className="switch-case">
        <label className="input-type-label">Input Type:</label>
        <select
          value={inputType}
          onChange={(e) => {
            setInputType(e.target.value);
            handleChange(e);
          }}
        >
          <option value="" disabled>
            Select your option:
          </option>
          <option value="data">data</option>
          <option value="file">Import</option>
        </select>
        {inputType === "file" && (
          <button onClick={handleImport} className="button-import">
            Import
          </button>
        )}
      </div>
    </NodeDefault>
  );
}

Input.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
