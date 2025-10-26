import { useState, useCallback, useMemo, useEffect } from "react";
import "./ParameterBlock.scss";
import PropTypes from "prop-types";

export default function ParameterBlock({
  handleRemoveParameter,
  handleAddParameter,
  parameters,
  setParameters,
  onShowModal,
  onShowDeleteModal,
}) {
  // State to track which parameter and field is being edited
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState("");
  const [dropdownState, setDropdownState] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({});
  // Modal state will be managed by parent Demo component

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

  const handleDeleteClick = useCallback((index) => {
    onShowDeleteModal(index);
  }, [onShowDeleteModal]);

  const toggleGroup = useCallback((groupType) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupType]: !prev[groupType]
    }));
  }, []);

  // Parameter type detection
  const getParameterType = useCallback((param) => {
    const label = param.label.toLowerCase();
    
    // Bot-received parameters
    if (label.includes('close') || label.includes('close price')) {
      return { type: 'bot-received', color: 'green', icon: '●' };
    }
    if (label.includes('indicator') || label.includes('output')) {
      return { type: 'bot-received', color: 'dark-blue', icon: '●' };
    }
    if (label.includes('entry') || label.includes('entry price')) {
      return { type: 'bot-received', color: 'pink', icon: '●' };
    }
    
    // Manually-set parameters
    return { type: 'manual', color: 'default', icon: '○' };
  }, []);

  // Group parameters by type
  const groupedParameters = useMemo(() => {
    const groups = {
      'bot-received': [],
      'manual': []
    };
    
    parameters.forEach(param => {
      const paramType = getParameterType(param);
      groups[paramType.type].push({ ...param, paramType });
    });
    
    return groups;
  }, [parameters, getParameterType]);

  // Search filtering for grouped parameters
  const filteredGroupedParameters = useMemo(() => {
    if (searchTerm === '') {
      return groupedParameters;
    }
    
    const filtered = {
      'bot-received': [],
      'manual': []
    };
    
    // Filter bot-received parameters
    filtered['bot-received'] = groupedParameters['bot-received'].filter(param => 
      param.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      param.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Filter manual parameters
    filtered['manual'] = groupedParameters['manual'].filter(param => 
      param.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      param.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return filtered;
  }, [groupedParameters, searchTerm]);

  // Check if any parameters match the search
  const hasMatchingParameters = filteredGroupedParameters['bot-received'].length > 0 || filteredGroupedParameters['manual'].length > 0;

  return (
    <div
      className={`parameters-dropdown ${dropdownState ? 'expanded' : 'collapsed'} ${!hasMatchingParameters ? 'empty' : ''}`}
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
                      onClick={() => onShowModal('parameter')}
                    >
                      Add Parameter
                    </button>
                    <button
                      className="add-custom-parameter-btn"
                      onClick={() => onShowModal('custom')}
                    >
                      Add Custom Parameter
                    </button>
          </div>
        </div>

        {/* Grouped Parameters List */}
        <div className="parameters-list">
          {!hasMatchingParameters ? (
            <div className="empty-state">
              <p>{searchTerm ? 'No parameters match your search' : 'No parameters found'}</p>
              <p>{searchTerm ? 'Try a different search term' : 'Use the buttons above to add parameters'}</p>
            </div>
          ) : (
            <div className="parameter-groups">
              {/* Bot-Received Parameters */}
              {filteredGroupedParameters['bot-received'].length > 0 && (
                <div className="parameter-group">
                  <div 
                    className="group-header bot-received"
                    onClick={() => toggleGroup('bot-received')}
                  >
                    <span className="group-title">Bot Data</span>
                    <span className="group-count">({filteredGroupedParameters['bot-received'].length})</span>
                    <span className="group-toggle">
                      {collapsedGroups['bot-received'] ? '▼' : '▲'}
                    </span>
                  </div>
                  {!collapsedGroups['bot-received'] && (
                    <ul className="group-parameters">
                    {filteredGroupedParameters['bot-received'].map((param, index) => {
                      const originalIndex = parameters.findIndex(p => p.id === param.id);
                      return (
                        <li key={param.id} className={`parameter-item ${param.paramType.color}`}>
                          <span className="parameter-label">
                            <span className={`parameter-icon ${param.paramType.color}`}>
                              {param.paramType.icon}
                            </span>
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
                            <button onClick={() => handleDeleteClick(originalIndex)} className="remove-btn">
                              ×
                            </button>
                          </span>
                        </li>
                      );
                    })}
                    </ul>
                  )}
                </div>
              )}

              {/* Manual Parameters */}
              {filteredGroupedParameters['manual'].length > 0 && (
                <div className="parameter-group">
                  <div 
                    className="group-header manual"
                    onClick={() => toggleGroup('manual')}
                  >
                    <span className="group-title">Manual Settings</span>
                    <span className="group-count">({filteredGroupedParameters['manual'].length})</span>
                    <span className="group-toggle">
                      {collapsedGroups['manual'] ? '▼' : '▲'}
                    </span>
                  </div>
                  {!collapsedGroups['manual'] && (
                    <ul className="group-parameters">
                    {filteredGroupedParameters['manual'].map((param, index) => {
                      const originalIndex = parameters.findIndex(p => p.id === param.id);
                      return (
                        <li key={param.id} className={`parameter-item ${param.paramType.color}`}>
                          <span className="parameter-label">
                            <span className={`parameter-icon ${param.paramType.color}`}>
                              {param.paramType.icon}
                            </span>
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
                            <button onClick={() => handleDeleteClick(originalIndex)} className="remove-btn">
                              ×
                            </button>
                          </span>
                        </li>
                      );
                    })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
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
  onShowModal: PropTypes.func.isRequired,
  onShowDeleteModal: PropTypes.func.isRequired,
  dragData: PropTypes.object,
};
