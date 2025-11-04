import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import "./tutorial.scss";

export default function ExplanationPanel({
  step,
  title,
  description,
  position,
  targetRect,
  onNext,
  onSkip,
  totalSteps,
}) {
  const panelRef = useRef(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!targetRect || !panelRef.current) return;

    const panel = panelRef.current;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;

    let top = 0;
    let left = 0;

    // Calculate position based on preferred position relative to target
    if (position === "bottom") {
      top = targetRect.bottom + padding;
      left = targetRect.left + targetRect.width / 2 - panelWidth / 2;
    } else if (position === "top") {
      top = targetRect.top - panelHeight - padding;
      left = targetRect.left + targetRect.width / 2 - panelWidth / 2;
    } else if (position === "right") {
      top = targetRect.top + targetRect.height / 2 - panelHeight / 2;
      left = targetRect.right + padding;
    } else if (position === "left") {
      top = targetRect.top + targetRect.height / 2 - panelHeight / 2;
      left = targetRect.left - panelWidth - padding;
    }

    // Adjust to keep panel within viewport
    if (left < padding) {
      left = padding;
    } else if (left + panelWidth > viewportWidth - padding) {
      left = viewportWidth - panelWidth - padding;
    }

    if (top < padding) {
      top = padding;
    } else if (top + panelHeight > viewportHeight - padding) {
      top = viewportHeight - panelHeight - padding;
    }

    setPanelPosition({ top, left });
  }, [targetRect, position]);

  if (!targetRect) return null;

  return (
    <motion.div
      ref={panelRef}
      className="explanation-panel"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed",
        top: `${panelPosition.top}px`,
        left: `${panelPosition.left}px`,
        zIndex: 10001,
      }}
    >
      <div className="explanation-panel-header">
        <div className="step-indicator">
          Step {step} of {totalSteps}
        </div>
        <h3 className="explanation-title">{title}</h3>
      </div>
      <div className="explanation-panel-body">
        <p className="explanation-description">{description}</p>
      </div>
      <div className="explanation-panel-footer">
        {onSkip && (
          <button
            className="explanation-btn explanation-btn-secondary"
            onClick={onSkip}
          >
            Skip Tutorial
          </button>
        )}
        <button
          className="explanation-btn explanation-btn-primary"
          onClick={onNext}
        >
          {step < totalSteps ? "Next" : "Got It"}
        </button>
      </div>
    </motion.div>
  );
}
