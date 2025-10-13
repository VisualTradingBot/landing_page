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
  top = { active: false, type: "target", id: `top-handle-${title}` },
  bottom = { active: false, type: "source", id: `bottom-handle-${title}` },
  left = { active: false, type: "target", id: `left-handle-${title}` },
  right = { active: false, type: "source", id: `right-handle-${title}` },
}) {
  return (
    <div className="node-default">
      {top.active && (
        <Handle
          id={top.id}
          type={top.type}
          position={Position.Top}
          className="node-handle node-handle--top"
          onPointerDown={addActiveWhilePointerDown}
          aria-label={`connect-to-${title}-top`}
        />
      )}
      <div className="node-default-header">{title}</div>
      <div className="node-default-body">{children}</div>
      {bottom.active && (
        <Handle
          id={bottom.id}
          type={bottom.type}
          position={Position.Bottom}
          className="node-handle node-handle--bottom"
          onPointerDown={addActiveWhilePointerDown}
          aria-label={`connect-from-${title}-bottom`}
        />
      )}
      {left.active && (
        <Handle
          id={left.id}
          type={left.type}
          position={Position.Left}
          className="node-handle node-handle--left"
          onPointerDown={addActiveWhilePointerDown}
          aria-label={`connect-to-${title}-left`}
        />
      )}
      {right.active && (
        <Handle
          id={right.id}
          type={right.type}
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
  top: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  bottom: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  left: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  right: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
};
