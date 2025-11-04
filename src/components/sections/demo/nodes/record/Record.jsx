import "./record.scss";
import NodeDefault from "../nodeDefault";
import PropTypes from "prop-types";
import { useState } from "react";
import { useReactFlow } from "@xyflow/react";

export default function Record({ data, id }) {
  const { updateNodeData } = useReactFlow();
  const [recordType, setRecordType] = useState(
    data?.recordType || "entry_price"
  );

  const handleRecordTypeChange = (event) => {
    const value = event.target.value;
    setRecordType(value);
    updateNodeData(id, { recordType: value });
  };

  return (
    <NodeDefault
      id={id}
      title="" // Empty title as requested
      top={{ active: true, type: "target", id: `${id}-top` }}
      right={{ active: true, type: "source" }}
    >
      <div className="record-container">
        <div className="record-type-field">
          <label className="record-type-label">Record:</label>
          <select
            value={recordType}
            onChange={handleRecordTypeChange}
            className="record-type-select"
            disabled
          >
            <option value="entry_price">Entry Price</option>
          </select>
        </div>
      </div>
    </NodeDefault>
  );
}

Record.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
