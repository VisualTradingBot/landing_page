import { useState, useCallback } from "react";
import "./ParameterBlock.scss";
import PropTypes from "prop-types";

export default function ParameterBlock({
  handleRemoveParameter,
  handleAddParameter,
  parameters,
  setParameters,
}) {
  // State to track which parameter and field is being edited
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [dropdownState, setDropdownState] = useState(true);

  const startEditing = useCallback((index, field, currentValue) => {
    setEditingIndex(index);
    setEditingField(field);
    setTempValue(currentValue);
  }, []);

  const saveEdit = useCallback(() => {
    if (editingIndex !== null && editingField && tempValue.trim()) {
      setParameters((prev) =>
        prev.map((param, index) =>
          index === editingIndex
            ? { ...param, [editingField]: tempValue.trim() }
            : param
        )
      );
    }
    setEditingIndex(null);
    setEditingField(null);
    setTempValue("");
  }, [editingIndex, editingField, tempValue, setParameters]);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingField(null);
    setTempValue("");
  }, []);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter") {
        saveEdit();
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  const onClickDropdownButton = useCallback(() => {
    setDropdownState((prev) => !prev);
  }, []);

  return (
    <div
      className="parameters-dropdown"
      style={{
        transform: dropdownState ? "translateX(0)" : "translateX(-90%)",
      }}
    >
      <h1 className="dropdown-title">Parameter Dashboard</h1>
      <div className="dropdown-content">
        <ul>
          {parameters.map((param, index) => (
            <li key={index}>
              <span>
                {editingIndex === index && editingField === "label" ? (
                  <input
                    className="parameter-text-input"
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyPress}
                    onFocus={() => setTempValue("")}
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={() => startEditing(index, "label", param.label)}
                    draggable
                    onDragStart={(event) => {
                      // Set the data to be transferred during the drag
                      const dragData = {
                        label: param.label,
                        value: param.value,
                        family: "variable",
                        id: param.id,
                      };
                      // Send data to Node
                      event.dataTransfer.setData(
                        "application/reactflow",
                        JSON.stringify(dragData)
                      );
                    }}
                    style={{
                      cursor: "pointer",
                    }}
                    title="Click to edit"
                  >
                    {param.label}
                  </span>
                )}
              </span>
              <span>
                {editingIndex === index && editingField === "value" ? (
                  <input
                    className="parameter-number-input"
                    type="text"
                    placeholder="e.g. 30, close, entry * 0.95"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={handleKeyPress}
                    autoFocus
                  />
                ) : (
                  <span
                    onClick={() => startEditing(index, "value", param.value)}
                    style={{
                      cursor: "pointer",
                      marginRight: "8px",
                    }}
                    title="Click to edit"
                  >
                    {param.value}
                  </span>
                )}
                <button onClick={() => handleRemoveParameter(index)}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>

        <div className="buttons">
          <button
            className="add-parameter-btn"
            onClick={() => {
              handleAddParameter();
            }}
          >
            Add Parameter
          </button>
          <button
            style={dropdownState ? { transform: "rotate(90deg)" } : {}}
            className="dropdown-btn"
            onClick={onClickDropdownButton}
          >
            &#9660;
          </button>
        </div>
      </div>
    </div>
  );
}

ParameterBlock.propTypes = {
  handleRemoveParameter: PropTypes.func.isRequired,
  handleAddParameter: PropTypes.func.isRequired,
  parameters: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      family: PropTypes.string.isRequired,
      id: PropTypes.string.isRequired,
    })
  ).isRequired,
  setParameters: PropTypes.func.isRequired,
  dragData: PropTypes.object,
};
