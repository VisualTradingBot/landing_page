import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import "./ParameterBlock.scss";
import PropTypes from "prop-types";

const PARAMETERS_UPDATED_EVENT = "parametersUpdated";

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  return typeof value === "string" ? value : String(value);
};

const buildDragPayload = (param) => ({
  label: param.label,
  value: param.value,
  family: param.family || "variable",
  id: param.id,
  source: param.source || "user",
});

export default function ParameterBlock({
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

  // Drag state management
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [canvasBounds, setCanvasBounds] = useState({ left: 0, right: 0 });
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const parameterBlockRef = useRef(null);

  const classifyParameter = useCallback((param) => {
    const label = normalizeValue(param.label).toLowerCase();
    const source = normalizeValue(param.source).toLowerCase();
    const isSystem = source === "system";

    if (
      isSystem ||
      label.includes("close") ||
      label.includes("close price") ||
      label.includes("live")
    ) {
      return { type: "bot-received", color: "green", icon: "●" };
    }

    if (isSystem || label.includes("indicator") || label.includes("output")) {
      return { type: "bot-received", color: "dark-blue", icon: "●" };
    }

    if (isSystem || label.includes("entry") || label.includes("entry price")) {
      return { type: "bot-received", color: "pink", icon: "●" };
    }

    return { type: "manual", color: "default", icon: "○" };
  }, []);

  const decoratedParameters = useMemo(() => {
    return parameters.map((param) => {
      const value = normalizeValue(param.value);
      const paramType = classifyParameter(param);
      return {
        ...param,
        value,
        paramType,
      };
    });
  }, [parameters, classifyParameter]);

  const groupedParameters = useMemo(() => {
    const groups = {
      "bot-received": [],
      manual: [],
    };

    decoratedParameters.forEach((param) => {
      groups[param.paramType.type].push(param);
    });

    return groups;
  }, [decoratedParameters]);

  const filteredGroupedParameters = useMemo(() => {
    if (searchTerm === "") {
      return groupedParameters;
    }

    const term = searchTerm.toLowerCase();
    const matches = (param) =>
      param.label.toLowerCase().includes(term) ||
      normalizeValue(param.value).toLowerCase().includes(term);

    return {
      "bot-received": groupedParameters["bot-received"].filter(matches),
      manual: groupedParameters.manual.filter(matches),
    };
  }, [groupedParameters, searchTerm]);

  const hasMatchingParameters =
    filteredGroupedParameters["bot-received"].length > 0 ||
    filteredGroupedParameters.manual.length > 0;

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
    if (hasDragged) {
      return;
    }
    setDropdownState((prev) => !prev);
  }, [hasDragged]);

  const onClickToggleIcon = useCallback((e) => {
    e.stopPropagation();
    setDropdownState((prev) => !prev);
  }, []);

  const handleDeleteClick = useCallback(
    (index) => {
      onShowDeleteModal(index);
    },
    [onShowDeleteModal]
  );

  const toggleGroup = useCallback((groupType) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupType]: !prev[groupType],
    }));
  }, []);

  useEffect(() => {
    const updateCanvasBounds = () => {
      if (parameterBlockRef.current) {
        const canvas = parameterBlockRef.current.closest(".react-flow");
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const blockWidth = parameterBlockRef.current.offsetWidth;
          setCanvasBounds({
            left: 0,
            right: rect.width - blockWidth,
          });
        }
      }
    };

    updateCanvasBounds();
    window.addEventListener("resize", updateCanvasBounds);
    return () => window.removeEventListener("resize", updateCanvasBounds);
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (
      e.target.closest(".dropdown-title") &&
      !e.target.closest(".toggle-icon")
    ) {
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setHasDragged(false);
      const rect = parameterBlockRef.current.getBoundingClientRect();
      setDragOffset(e.clientX - rect.left);
    }
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (dragStartPos.x !== 0 && dragStartPos.y !== 0) {
        const deltaX = Math.abs(e.clientX - dragStartPos.x);
        const deltaY = Math.abs(e.clientY - dragStartPos.y);

        if (deltaX > 5 && deltaX > deltaY) {
          if (!isDragging) {
            setIsDragging(true);
            setHasDragged(true);
            document.body.style.cursor = "grabbing";
            document.body.style.userSelect = "none";
          }

          const newX = e.clientX - dragOffset;
          const constrainedX = Math.max(
            canvasBounds.left,
            Math.min(canvasBounds.right, newX)
          );
          setCurrentX(constrainedX);
        }
      }
    },
    [dragStartPos, dragOffset, canvasBounds, isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    setDragStartPos({ x: 0, y: 0 });
  }, [isDragging]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const payload = decoratedParameters.map(({ paramType, ...rest }) => rest);

    try {
      const ev = new CustomEvent(PARAMETERS_UPDATED_EVENT, { detail: payload });
      window.dispatchEvent(ev);
    } catch {
      try {
        const ev = document.createEvent("CustomEvent");
        ev.initCustomEvent(PARAMETERS_UPDATED_EVENT, false, false, payload);
        window.dispatchEvent(ev);
      } catch (err) {
        console.error(
          "ParameterBlock: failed to dispatch parametersUpdated",
          err
        );
      }
    }
  }, [decoratedParameters]);

  return (
    <div
      ref={parameterBlockRef}
      className={`parameters-dropdown ${
        dropdownState ? "expanded" : "collapsed"
      } ${!hasMatchingParameters ? "empty" : ""} ${
        isDragging ? "dragging" : ""
      }`}
      style={{
        transform: `translateX(${currentX}px)`,
        position: "absolute",
        left: 0,
        top: 0,
        zIndex: 1000,
      }}
    >
      <h1
        className="dropdown-title"
        onClick={onClickDropdownButton}
        onMouseDown={handleMouseDown}
      >
        Parameter Dashboard
        <span className="toggle-icon" onClick={onClickToggleIcon}>
          {dropdownState ? "▲" : "▼"}
        </span>
      </h1>
      <div className="dropdown-content">
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
              onClick={() => onShowModal("parameter")}
            >
              Add Parameter
            </button>
            <button
              className="add-custom-parameter-btn"
              onClick={() => onShowModal("custom")}
            >
              Add Custom Parameter
            </button>
          </div>
        </div>

        <div className="parameters-list">
          {!hasMatchingParameters ? (
            <div className="empty-state">
              <p>
                {searchTerm
                  ? "No parameters match your search"
                  : "No parameters found"}
              </p>
              <p>
                {searchTerm
                  ? "Try a different search term"
                  : "Use the buttons above to add parameters"}
              </p>
            </div>
          ) : (
            <div className="parameter-groups">
              {filteredGroupedParameters["bot-received"].length > 0 && (
                <div className="parameter-group">
                  <div
                    className="group-header bot-received"
                    onClick={() => toggleGroup("bot-received")}
                  >
                    <span className="group-title">Bot Data</span>
                    <span className="group-count">
                      ({filteredGroupedParameters["bot-received"].length})
                    </span>
                    <span className="group-toggle">
                      {collapsedGroups["bot-received"] ? "▼" : "▲"}
                    </span>
                  </div>
                  {!collapsedGroups["bot-received"] && (
                    <ul className="group-parameters">
                      {filteredGroupedParameters["bot-received"].map(
                        (param) => {
                          const originalIndex = parameters.findIndex(
                            (p) => p.id === param.id
                          );
                          return (
                            <li
                              key={param.id}
                              className={`parameter-item ${param.paramType.color}`}
                            >
                              <span className="parameter-label">
                                <span
                                  className={`parameter-icon ${param.paramType.color}`}
                                >
                                  {param.paramType.icon}
                                </span>
                                {editingIndex === originalIndex &&
                                editingField === "label" ? (
                                  <input
                                    className="parameter-text-input"
                                    type="text"
                                    value={tempValue}
                                    onChange={(e) =>
                                      setTempValue(e.target.value)
                                    }
                                    onBlur={saveEdit}
                                    onKeyDown={handleKeyPress}
                                    onFocus={() => setTempValue("")}
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    onClick={() =>
                                      startEditing(
                                        originalIndex,
                                        "label",
                                        param.label
                                      )
                                    }
                                    draggable
                                    onDragStart={(event) => {
                                      event.dataTransfer.setData(
                                        "application/reactflow",
                                        JSON.stringify(buildDragPayload(param))
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
                                {param.paramType.type === "bot-received" ? (
                                  <span className="parameter-value-readonly">
                                    [Auto-generated]
                                  </span>
                                ) : (
                                  <>
                                    {editingIndex === originalIndex &&
                                    editingField === "value" ? (
                                      <input
                                        className="parameter-number-input"
                                        type="text"
                                        placeholder="e.g. 30, close, entry * 0.95"
                                        value={tempValue}
                                        onChange={(e) =>
                                          setTempValue(e.target.value)
                                        }
                                        onBlur={saveEdit}
                                        onKeyDown={handleKeyPress}
                                        autoFocus
                                      />
                                    ) : (
                                      <span
                                        onClick={() =>
                                          startEditing(
                                            originalIndex,
                                            "value",
                                            param.value
                                          )
                                        }
                                        style={{
                                          cursor: "pointer",
                                          marginRight: "8px",
                                        }}
                                        title="Click to edit"
                                      >
                                        {param.value}
                                      </span>
                                    )}
                                  </>
                                )}
                                <button
                                  onClick={() =>
                                    handleDeleteClick(originalIndex)
                                  }
                                  className="remove-btn"
                                >
                                  ×
                                </button>
                              </span>
                            </li>
                          );
                        }
                      )}
                    </ul>
                  )}
                </div>
              )}

              {filteredGroupedParameters.manual.length > 0 && (
                <div className="parameter-group">
                  <div
                    className="group-header manual"
                    onClick={() => toggleGroup("manual")}
                  >
                    <span className="group-title">Manual Settings</span>
                    <span className="group-count">
                      ({filteredGroupedParameters.manual.length})
                    </span>
                    <span className="group-toggle">
                      {collapsedGroups.manual ? "▼" : "▲"}
                    </span>
                  </div>
                  {!collapsedGroups.manual && (
                    <ul className="group-parameters">
                      {filteredGroupedParameters.manual.map((param) => {
                        const originalIndex = parameters.findIndex(
                          (p) => p.id === param.id
                        );
                        return (
                          <li
                            key={param.id}
                            className={`parameter-item ${param.paramType.color}`}
                          >
                            <span className="parameter-label">
                              <span
                                className={`parameter-icon ${param.paramType.color}`}
                              >
                                {param.paramType.icon}
                              </span>
                              {editingIndex === originalIndex &&
                              editingField === "label" ? (
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
                                  onClick={() =>
                                    startEditing(
                                      originalIndex,
                                      "label",
                                      param.label
                                    )
                                  }
                                  draggable
                                  onDragStart={(event) => {
                                    event.dataTransfer.setData(
                                      "application/reactflow",
                                      JSON.stringify(buildDragPayload(param))
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
                              {param.paramType.type === "bot-received" ? (
                                <span className="parameter-value-readonly">
                                  [Auto-generated]
                                </span>
                              ) : (
                                <>
                                  {editingIndex === originalIndex &&
                                  editingField === "value" ? (
                                    <input
                                      className="parameter-number-input"
                                      type="text"
                                      placeholder="e.g. 30, close, entry * 0.95"
                                      value={tempValue}
                                      onChange={(e) =>
                                        setTempValue(e.target.value)
                                      }
                                      onBlur={saveEdit}
                                      onKeyDown={handleKeyPress}
                                      autoFocus
                                    />
                                  ) : (
                                    <span
                                      onClick={() =>
                                        startEditing(
                                          originalIndex,
                                          "value",
                                          param.value
                                        )
                                      }
                                      style={{
                                        cursor: "pointer",
                                        marginRight: "8px",
                                      }}
                                      title="Click to edit"
                                    >
                                      {param.value}
                                    </span>
                                  )}
                                </>
                              )}
                              <button
                                onClick={() => handleDeleteClick(originalIndex)}
                                className="remove-btn"
                              >
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
  parameters: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      family: PropTypes.string,
      source: PropTypes.string,
    })
  ).isRequired,
  setParameters: PropTypes.func.isRequired,
  onShowModal: PropTypes.func.isRequired,
  onShowDeleteModal: PropTypes.func.isRequired,
};
