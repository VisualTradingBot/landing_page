import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Handle, Position } from "@xyflow/react";
import PropTypes from "prop-types";
import "./nodeDefault.scss";

function addActiveWhilePointerDown(e) {
  const el = e.currentTarget;
  el.classList.add("node-handle--active");

  const removeActive = () => {
    el.classList.remove("node-handle--active");
    window.removeEventListener("pointerup", removeActive);
    window.removeEventListener("pointercancel", removeActive);
  };

  // Remove the active class when the pointer is released or canceled anywhere
  window.addEventListener("pointerup", removeActive);
  window.addEventListener("pointercancel", removeActive);
}

export default function NodeDefault({
  id: nodeId,
  title = "Default Node",
  children,
  explanation,
  top = { active: false, type: "target" },
  bottom = { active: false, type: "source" },
  left = { active: false, type: "target" },
  right = { active: false, type: "source" },
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const titleRef = useRef(null);
  const tooltipRef = useRef(null);

  // Use nodeId if provided; otherwise fallback to a slugified title
  const baseId = nodeId || title.toLowerCase().replace(/\s+/g, "-");

  const topHandle = { ...top, id: top.id || `${baseId}-top` };
  const bottomHandle = { ...bottom, id: bottom.id || `${baseId}-bottom` };
  const leftHandle = { ...left, id: left.id || `${baseId}-left` };
  const rightHandle = { ...right, id: right.id || `${baseId}-right` };

  const updateTooltipPosition = () => {
    if (!titleRef.current) return;

    const titleRect = titleRef.current.getBoundingClientRect();
    const spacing = 8;
    const tooltipWidth = 250;
    const tooltipHeight = 100;

    let top = titleRect.bottom + spacing;
    let left = titleRect.left;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + tooltipWidth > viewportWidth - 20) {
      left = viewportWidth - tooltipWidth - 20;
    }
    if (left < 20) {
      left = 20;
    }

    if (top + tooltipHeight > viewportHeight - 20) {
      top = titleRect.top - tooltipHeight - spacing;
    }
    if (top < 20) {
      top = 20;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isHovered && explanation) {
      updateTooltipPosition();
      window.addEventListener("scroll", updateTooltipPosition, true);
      window.addEventListener("resize", updateTooltipPosition);
    }

    return () => {
      window.removeEventListener("scroll", updateTooltipPosition, true);
      window.removeEventListener("resize", updateTooltipPosition);
    };
  }, [isHovered, explanation]);

  const tooltip = isHovered && explanation ? (
    createPortal(
      <div
        ref={tooltipRef}
        className="info-tooltip"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        {explanation}
      </div>,
      document.body
    )
  ) : null;

  return (
    <div className="node-default">
      <div className="node-default-header">
        <span
          ref={titleRef}
          className={`node-default-header-title ${explanation ? "node-default-header-title--interactive" : ""}`}
          onMouseEnter={() => explanation && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => explanation && e.stopPropagation()}
          onMouseDown={(e) => explanation && e.stopPropagation()}
        >
          {title}
        </span>
      </div>
      {tooltip}
      <div className="node-default-body">
        {children}
        {topHandle.active && (
          <Handle
            id={topHandle.id}
            type={topHandle.type}
            position={Position.Top}
            className="node-handle node-handle--top"
            onPointerDown={addActiveWhilePointerDown}
            aria-label={`connect-to-${title}-top`}
          />
        )}
        {bottomHandle.active && (
          <Handle
            id={bottomHandle.id}
            type={bottomHandle.type}
            position={Position.Bottom}
            className="node-handle node-handle--bottom"
            onPointerDown={addActiveWhilePointerDown}
            aria-label={`connect-from-${title}-bottom`}
          />
        )}
        {leftHandle.active && (
          <Handle
            id={leftHandle.id}
            type={leftHandle.type}
            position={Position.Left}
            className="node-handle node-handle--left"
            onPointerDown={addActiveWhilePointerDown}
            aria-label={`connect-to-${title}-left`}
          />
        )}
        {rightHandle.active && (
          <Handle
            id={rightHandle.id}
            type={rightHandle.type}
            position={Position.Right}
            className="node-handle node-handle--right"
            onPointerDown={addActiveWhilePointerDown}
            aria-label={`connect-from-${title}-right`}
          />
        )}
      </div>
    </div>
  );
}

NodeDefault.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node,
  explanation: PropTypes.string,
  top: PropTypes.object,
  bottom: PropTypes.object,
  left: PropTypes.object,
  right: PropTypes.object,
};
