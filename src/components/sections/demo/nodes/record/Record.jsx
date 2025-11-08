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
          <div className="field-control field-control--locked">
            <select
              value={recordType}
              onChange={handleRecordTypeChange}
              className="record-type-select"
              disabled
            >
              <option value="entry_price">Entry Price</option>
            </select>
            <span
              className="field-lock"
              aria-hidden="true"
              title="Locked parameter"
            >
              <svg
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
                focusable="false"
              >
                <rect
                  x="3.25"
                  y="7.25"
                  width="9.5"
                  height="7.5"
                  rx="1.5"
                />
                <path d="M11 7V5a3 3 0 0 0-6 0v2" />
                <circle cx="8" cy="10.5" r="0.85" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </NodeDefault>
  );
}

Record.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
};
