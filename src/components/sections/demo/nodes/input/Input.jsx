import "./input.scss";
import NodeDefault from "../nodeDefault";
import { useState } from "react";
import { useReactFlow } from "@xyflow/react";

export default function Input() {
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
    <NodeDefault title="Input Node" bottom={{ active: true, type: "source" }}>
      <div className="switch-case">
        <label className="input-type-label">Input Type:</label>
        <select
          value={inputType}
          onChange={(e) => {
            setInputType(e.target.value);
            handleChange(e);
          }}
        >
          <option value="" disabled selected>
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
