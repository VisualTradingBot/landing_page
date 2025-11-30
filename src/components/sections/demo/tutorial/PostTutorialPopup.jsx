import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import "./tutorial.scss";

export default function PostTutorialPopup({ targetRect, onClose }) {
  const panelRef = useRef(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });

  const calculatePosition = useCallback(() => {
    if (!targetRect || !panelRef.current) return;

    const panel = panelRef.current;
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;

    // Get fresh bounding rect to account for scroll
    const nodeElement = document.querySelector('[data-id="ifNode-1"]');
    if (!nodeElement) return;
    
    const currentRect = nodeElement.getBoundingClientRect();

    let top = 0;
    let left = 0;
    let arrowPosition = 'left'; // Track which side the arrow should be on

    // Calculate position - always place on the side (right) to avoid overlaying
    const spaceOnRight = viewportWidth - currentRect.right - padding;
    const spaceOnLeft = currentRect.left - padding;

    if (spaceOnRight >= panelWidth + 20) {
      // Place on the right side
      top = currentRect.top + currentRect.height / 2 - panelHeight / 2;
      left = currentRect.right + padding;
      arrowPosition = 'left'; // Arrow points left to the target
    } else if (spaceOnLeft >= panelWidth + 20) {
      // Place on the left side
      top = currentRect.top + currentRect.height / 2 - panelHeight / 2;
      left = currentRect.left - panelWidth - padding;
      arrowPosition = 'right'; // Arrow points right to the target
    } else {
      // Fallback: place below if no side space
      top = currentRect.bottom + padding;
      left = currentRect.left + currentRect.width / 2 - panelWidth / 2;
      arrowPosition = 'top'; // Arrow points up to the target
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

    setPanelPosition({ top, left, arrowPosition });
  }, [targetRect]);

  useEffect(() => {
    console.log("PostTutorialPopup: Component mounted/updated", { targetRect });
    calculatePosition();
  }, [targetRect, calculatePosition]);

  // Add scroll listener to update position
  useEffect(() => {
    if (!targetRect) return;

    const handleScroll = () => {
      calculatePosition();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.addEventListener("scroll", handleScroll, { passive: true });
      const flow = demoEl.querySelector(".react-flow");
      if (flow) {
        flow.addEventListener("scroll", handleScroll, { passive: true });
      }
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (demoEl) {
        demoEl.removeEventListener("scroll", handleScroll);
        const flow = demoEl.querySelector(".react-flow");
        if (flow) {
          flow.removeEventListener("scroll", handleScroll);
        }
      }
    };
  }, [targetRect, calculatePosition]);

  console.log("PostTutorialPopup: Rendering", { targetRect, panelPosition });

  if (!targetRect) {
    console.log("PostTutorialPopup: Not rendering - no targetRect");
    return null;
  }

  return (
    <motion.div
      ref={panelRef}
      className="explanation-panel post-tutorial-popup-compact"
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
      {/* Arrow indicator pointing to target */}
      <div className={`popup-arrow popup-arrow-${panelPosition.arrowPosition || 'left'}`} />
      
      <div className="explanation-panel-header">
        <div className="step-indicator">Quick Tip</div>
        <h3 className="explanation-title">Parameter Editing</h3>
      </div>
      <div className="explanation-panel-body">
        <p className="explanation-description">
          Double-click a parameter to delete it, then drag a new one from the
          dashboard.
        </p>
      </div>
      <div className="explanation-panel-footer">
        <button className="explanation-btn explanation-btn-primary" onClick={onClose}>
          Got It
        </button>
      </div>
    </motion.div>
  );
}

