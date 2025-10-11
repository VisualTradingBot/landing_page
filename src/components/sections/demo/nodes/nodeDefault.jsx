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
  title = "Default Node",
  children,
  top = false,
  bottom = false,
  left = false,
  right = false,
}) {
  return (
    <div className="node-default">
      {top && (
        <Handle
          type="target"
          position={Position.Top}
          className="node-handle node-handle--top"
          onPointerDown={addActiveWhilePointerDown}
          aria-label={`connect-to-${title}-top`}
        />
      )}
      <div className="node-default-header">{title}</div>
      <div className="node-default-body">{children}</div>
      {bottom && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="node-handle node-handle--bottom"
          onPointerDown={addActiveWhilePointerDown}
          aria-label={`connect-from-${title}-bottom`}
        />
      )}
      {left && (
        <Handle
          type="target"
          position={Position.Left}
          className="node-handle node-handle--left"
          onPointerDown={addActiveWhilePointerDown}
          aria-label={`connect-to-${title}-left`}
        />
      )}
      {right && (
        <Handle
          type="source"
          position={Position.Right}
          className="node-handle node-handle--right"
          onPointerDown={addActiveWhilePointerDown}
          aria-label={`connect-from-${title}-right`}
        />
      )}
    </div>
  );
}

NodeDefault.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
  top: PropTypes.bool,
  bottom: PropTypes.bool,
  left: PropTypes.bool,
  right: PropTypes.bool,
};
