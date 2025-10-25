import { useState, useCallback, useMemo } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'parameter' or 'custom'

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

  // Simple search filtering
  const filteredParameters = useMemo(() => {
    if (searchTerm === '') {
      return parameters;
    }
    
    return parameters.filter(param => 
      param.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      param.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [parameters, searchTerm]);

  return (
    <div
      className={`parameters-dropdown ${dropdownState ? 'expanded' : 'collapsed'} ${filteredParameters.length === 0 ? 'empty' : ''}`}
    >
      <h1 className="dropdown-title" onClick={onClickDropdownButton}>
        Parameter Dashboard
        <span className="toggle-icon">
          {dropdownState ? '▲' : '▼'}
        </span>
      </h1>
      <div className="dropdown-content">
        {/* Clean Controls */}
        <div className="parameter-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search parameters..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="parameter-search"
            />
          </div>
          
          <div className="buttons">
            <button
              className="add-parameter-btn"
              onClick={() => {
                setModalType('parameter');
                setShowModal(true);
              }}
            >
              Add Parameter
            </button>
            <button
              className="add-custom-parameter-btn"
              onClick={() => {
                setModalType('custom');
                setShowModal(true);
              }}
            >
              Add Custom Parameter
            </button>
          </div>
        </div>

        {/* Simple Parameters List */}
        <div className="parameters-list">
          {filteredParameters.length === 0 ? (
            <div className="empty-state">
              <p>No parameters found</p>
              <p>Use the buttons above to add parameters</p>
            </div>
          ) : (
            <ul className="parameters-simple">
              {filteredParameters.map((param, index) => {
              const originalIndex = parameters.findIndex(p => p.id === param.id);
              return (
                <li key={param.id} className="parameter-item">
                  <span className="parameter-label">
                    {editingIndex === originalIndex && editingField === "label" ? (
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
                        onClick={() => startEditing(originalIndex, "label", param.label)}
                        draggable
                        onDragStart={(event) => {
                          const dragData = {
                            label: param.label,
                            value: param.value,
                            family: "variable",
                            id: param.id,
                          };
                          event.dataTransfer.setData(
                            "application/reactflow",
                            JSON.stringify(dragData)
                          );
                        }}
                        style={{ cursor: "pointer" }}
                        title="Click to edit"
                      >
                        {param.label}
                      </span>
                    )}
                  </span>
                  <span className="parameter-value">
                    {editingIndex === originalIndex && editingField === "value" ? (
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
                        onClick={() => startEditing(originalIndex, "value", param.value)}
                        style={{ cursor: "pointer", marginRight: "8px" }}
                        title="Click to edit"
                      >
                        {param.value}
                      </span>
                    )}
                    <button onClick={() => handleRemoveParameter(originalIndex)} className="remove-btn">
                      ×
                    </button>
                  </span>
                </li>
              );
            })}
            </ul>
          )}
        </div>
      </div>
      
      {/* Modal for Add Parameter */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'parameter' ? 'Add Parameter' : 'Add Custom Parameter'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Coming Soon</p>
              <p>
                {modalType === 'parameter' 
                  ? 'This feature will allow you to add parameters from the library to your strategy.'
                  : 'This feature will allow you to create custom parameters for your strategy.'
                }
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-btn modal-btn-primary"
                onClick={() => setShowModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
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
