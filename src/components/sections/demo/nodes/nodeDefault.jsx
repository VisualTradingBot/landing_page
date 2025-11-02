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
  top = { active: false, type: "target" },
  bottom = { active: false, type: "source" },
  left = { active: false, type: "target" },
  right = { active: false, type: "source" },
}) {
  // Use nodeId if provided; otherwise fallback to a slugified title
  const baseId = nodeId || title.toLowerCase().replace(/\s+/g, "-");

  const topHandle = { ...top, id: top.id || `${baseId}-top` };
  const bottomHandle = { ...bottom, id: bottom.id || `${baseId}-bottom` };
  const leftHandle = { ...left, id: left.id || `${baseId}-left` };
  const rightHandle = { ...right, id: right.id || `${baseId}-right` };

  return (
    <div className="node-default">
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
      {bottom.active && (
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

      <div className="node-default-header">{title}</div>
      <div className="node-default-body">{children}</div>
    </div>
  );
}

NodeDefault.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  children: PropTypes.node,
  top: PropTypes.object,
  bottom: PropTypes.object,
  left: PropTypes.object,
  right: PropTypes.object,
};
