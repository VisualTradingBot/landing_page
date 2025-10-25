import { useState, useEffect } from "react";
import "./components.scss";

export function VariableFieldStandalone({
  zoneId,
  id,
  zoneCheck,
  parameters,
  parameterData,
  setVariables,
}) {
  const [dragOverZone, setDragOverZone] = useState(null);
  const [isValidDrop, setIsValidDrop] = useState(true);

  // Clean up blocks when parameters are deleted and update labels when changed
  useEffect(() => {
    if (parameters) {
      const parameterMap = new Map(
        parameters.map((param) => [param.id, param])
      );

      setVariables((prev) =>
        prev.map((variable) => {
          // Check if variable has parameterData and the parameter still exists
          if (
            variable.parameterData &&
            variable.parameterData.parameterId &&
            !parameterMap.has(variable.parameterData.parameterId)
          ) {
            // Parameter was deleted - clear the parameterData
            return {
              ...variable,
              parameterData: {},
            };
          }

          // If parameter exists, update its data (label, value, etc.)
          if (
            variable.parameterData &&
            variable.parameterData.parameterId &&
            parameterMap.has(variable.parameterData.parameterId)
          ) {
            const updatedParameter = parameterMap.get(
              variable.parameterData.parameterId
            );
            return {
              ...variable,
              parameterData: {
                ...variable.parameterData,
                label: updatedParameter.label,
                value: updatedParameter.value,
              },
            };
          }

          // Return unchanged if no parameterData
          return variable;
        })
      );
    }
  }, [parameters, setVariables]); // Add setVariables to dependencies

  return (
    <div className="variable-container-multiple inline-container" key={zoneId}>
      <div
        className={`drop-zone ${
          dragOverZone === zoneId
            ? isValidDrop
              ? "drag-over"
              : "drag-over-invalid"
            : ""
        } ${
          parameterData && Object.keys(parameterData).length > 0
            ? "has-content"
            : ""
        }`}
        // Handle drop for boxes that are parameters
        // It's meant to take the parameter and also send
        // the data it accepts
        onDrop={(e) =>
          handleParameterDrop(
            e,
            zoneId,
            zoneCheck,
            setDragOverZone,
            setIsValidDrop,
            id,
            setVariables
          )
        }
        onDragOver={(e) =>
          handleDragOver(e, zoneId, zoneCheck, setDragOverZone, setIsValidDrop)
        }
        onDragLeave={(e) => handleDragLeave(e, setDragOverZone)}
      >
        {!parameterData || Object.keys(parameterData).length === 0 ? (
          <div className="empty-zone"></div>
        ) : (
          <Box 
            data={parameterData} 
            onDragStart={(e) => {
              console.log('Drag started');
              e.stopPropagation();
              e.stopImmediatePropagation();
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('application/reactflow', JSON.stringify({
                label: parameterData.label,
                value: parameterData.value,
                family: "variable",
                id: parameterData.parameterId
              }));
            }}
            onDragEnd={() => {
              console.log('Removing parameter');
              setVariables((prev) =>
                prev.map((variable) =>
                  variable.id === id ? { ...variable, parameterData: {} } : variable
                )
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

// Boxes go inside interactive nodes drop zone
function Box({ data, onDragStart, onDragEnd }) {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    console.log('Mouse down on box');
    e.stopPropagation();
    e.stopImmediatePropagation();
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    e.stopImmediatePropagation();
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    console.log('Mouse up on box');
    e.stopPropagation();
    e.stopImmediatePropagation();
    setIsDragging(false);
    
    // Check if we moved far enough to consider it a drag
    const distance = Math.sqrt(
      Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2)
    );
    
    if (distance > 10) { // 10px threshold
      // Get the element under the mouse
      const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
      const dropZone = elementBelow?.closest('.drop-zone');
      
      console.log('Drop zone found:', dropZone);
      
      // If not over any drop zone, remove the parameter
      if (!dropZone && onDragEnd) {
        console.log('Removing parameter');
        onDragEnd(e);
      }
    }
  };

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <span 
      className={`placed-block ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <h3>{data.label}</h3>
    </span>
  );
}

// Check if a component is compatible with a drop zone
const isCompatible = (componentFamily, zoneId, zoneCheck) => {
  console.log(
    `Checking compatibility for ${componentFamily} in zone ${zoneId}`
  );
  // Define compatibility rules - handle dynamic variable zones
  const baseZoneType = zoneId.startsWith("variable-") ? "variable" : zoneId;
  const zoneRules = zoneCheck[baseZoneType];
  if (!zoneRules) {
    console.log(`Incompatible`);
    return false;
  }

  // Check by component family
  if (zoneRules.allowedFamilies.includes(componentFamily)) {
    console.log(
      `Compatible drop: ${componentFamily} can be placed in ${zoneId} zone`
    );
    return true;
  }

  return false;
};

const handleParameterDrop = (
  event,
  zoneId,
  zoneCheck,
  setDragOverZone,
  setIsValidDrop,
  id,
  setVariables
) => {
  event.preventDefault();
  event.stopPropagation();

  // Get the parameter data from the event Parameter Dashboard
  const parameterData = JSON.parse(
    event.dataTransfer.getData("application/reactflow")
  );
  console.log(parameterData);

  if (!parameterData) return;

  // Destructure
  const parameter = {
    family: parameterData.family,
    parameterId: parameterData.id, // Store parameter ID for tracking
    label: parameterData.label,
    value: parameterData.value,
  };

  // Final compatibility check before dropping
  if (!isCompatible(parameterData.family, zoneId, zoneCheck)) {
    console.log(
      `Incompatible drop: ${parameterData.family} cannot be placed in ${zoneId} zone`
    );
    setDragOverZone(null);
    setIsValidDrop(true);
    return; // Reject the drop
  }

  // SUCCESS CASE: Update variables when drop IS compatible
  setVariables((vars) =>
    vars.map((variable) =>
      variable.id === id ? { ...variable, parameterData: parameter } : variable
    )
  );

  setDragOverZone(null);
  setIsValidDrop(true);
};

const handleDragOver = (
  event,
  zoneId,
  zoneCheck,
  setDragOverZone,
  setIsValidDrop
) => {
  event.preventDefault();
  event.stopPropagation();

  // Check if there's any drag data available
  if (event.dataTransfer.types.includes("application/reactflow")) {
    setDragOverZone(zoneId);
    setIsValidDrop(true);
    // We'll validate compatibility during the drop event
    // Assume valid for visual feedback
  } else {
    setDragOverZone(null);
    setIsValidDrop(false);
  }
};

const handleDragLeave = (event, setDragOverZone) => {
  event.preventDefault();
  // Only clear if we're leaving the entire drop zone area
  if (!event.currentTarget.contains(event.relatedTarget)) {
    setDragOverZone(null);
  }
};

const removeParameter = (parameterData, setVariables, id) => {
  setVariables((prev) =>
    prev.map((variable) =>
      variable.id === id ? { ...variable, parameterData: {} } : variable
    )
  );
};

import PropTypes from "prop-types";

VariableFieldStandalone.propTypes = {
  zoneId: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  zoneCheck: PropTypes.object.isRequired,
  parameters: PropTypes.array,
  parameterData: PropTypes.object,
  setVariables: PropTypes.func.isRequired,
};

Box.propTypes = {
  data: PropTypes.object.isRequired,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
};
