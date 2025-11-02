import { useEffect, useState, useRef, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { tutorialSteps, TUTORIAL_STORAGE_KEY } from "./tutorialSteps";
import ExplanationPanel from "./ExplanationPanel";
import "./tutorial.scss";

export default function DemoTutorial({
  nodes,
  isTutorialActive,
  onTutorialComplete,
  onTutorialStart,
}) {
  const { fitView, getViewport, setViewport } = useReactFlow();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const overlayRef = useRef(null);
  const demoSectionRef = useRef(null);
  const observerRef = useRef(null);
  const hasCheckedRef = useRef(false);

  // Check if tutorial should be shown when demo section comes into view
  useEffect(() => {
    const hasCompletedTutorial =
      localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";

    if (hasCompletedTutorial || hasCheckedRef.current) return;

    const demoSection = document.getElementById("demo");
    if (!demoSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !hasCheckedRef.current &&
            !hasCompletedTutorial
          ) {
            hasCheckedRef.current = true;
            onTutorialStart();
            // Wait a bit for ReactFlow to initialize
            setTimeout(() => {
              setCurrentStep(0);
            }, 500);
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: "-50px 0px -50px 0px",
      }
    );

    observer.observe(demoSection);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [onTutorialStart]);

  // Calculate bounding box for multiple nodes
  const calculateNodesBounds = useCallback(
    (nodeIds) => {
      if (!nodes || nodeIds.length === 0) return null;

      const targetNodes = nodes.filter((node) => nodeIds.includes(node.id));
      if (targetNodes.length === 0) return null;

      const positions = targetNodes.map((node) => ({
        x: node.position.x,
        y: node.position.y,
        width: node.width || 200,
        height: node.height || 100,
      }));

      const minX = Math.min(...positions.map((p) => p.x));
      const maxX = Math.max(...positions.map((p) => p.x + p.width));
      const minY = Math.min(...positions.map((p) => p.y));
      const maxY = Math.max(...positions.map((p) => p.y + p.height));

      return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2,
      };
    },
    [nodes]
  );

  // Get DOM rect for ReactFlow nodes
  const getNodeDOMRects = useCallback(
    (nodeIds) => {
      const rects = nodeIds
        .map((nodeId) => {
          const element = document.querySelector(
            `[data-id="${nodeId}"]`
          );
          return element ? element.getBoundingClientRect() : null;
        })
        .filter((rect) => rect !== null);

      if (rects.length === 0) return null;

      // Calculate combined bounding box
      const minLeft = Math.min(...rects.map((r) => r.left));
      const maxRight = Math.max(...rects.map((r) => r.right));
      const minTop = Math.min(...rects.map((r) => r.top));
      const maxBottom = Math.max(...rects.map((r) => r.bottom));

      return {
        left: minLeft,
        top: minTop,
        right: maxRight,
        bottom: maxBottom,
        width: maxRight - minLeft,
        height: maxBottom - minTop,
      };
    },
    []
  );

  // Zoom to step targets
  const zoomToStep = useCallback(
    (step) => {
      if (!step) return;

      if (step.type === "graph" && step.nodeIds) {
        const bounds = calculateNodesBounds(step.nodeIds);
        if (bounds) {
          // Zoom to fit multiple nodes with padding
          const padding = 100;
          fitView({
            minZoom: 0.8,
            maxZoom: 1.0,
            duration: 800,
            padding: padding,
            nodes: step.nodeIds.map((id) => ({ id })),
          });

          // Wait for zoom animation, then get DOM rects
          setTimeout(() => {
            const rects = getNodeDOMRects(step.nodeIds);
            setTargetRect(rects);
          }, 850);
        }
      } else if (step.type === "backtest" && step.selector) {
        const element = document.querySelector(step.selector);
        if (element) {
          // Scroll to backtest section
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // Get rect after scroll
          setTimeout(() => {
            const rect = element.getBoundingClientRect();
            setTargetRect(rect);
          }, 600);
        }
      }
    },
    [fitView, calculateNodesBounds, getNodeDOMRects]
  );

  // Handle step changes
  useEffect(() => {
    if (currentStep >= 0 && currentStep < tutorialSteps.length) {
      const step = tutorialSteps[currentStep];
      zoomToStep(step);

      // Update demo section class based on step type
      const demoSection = document.getElementById("demo");
      if (demoSection) {
        if (step.type === "backtest") {
          demoSection.classList.add("tutorial-backtest-active");
          demoSection.classList.remove("tutorial-active");
        } else {
          demoSection.classList.add("tutorial-active");
          demoSection.classList.remove("tutorial-backtest-active");
        }
      }

      // Mark nodes as highlighted
      nodes.forEach((node) => {
        const element = document.querySelector(`[data-id="${node.id}"]`);
        if (element) {
          if (step.type === "graph" && step.nodeIds?.includes(node.id)) {
            element.setAttribute("data-highlight", "true");
          } else {
            element.removeAttribute("data-highlight");
          }
        }
      });
    }

    return () => {
      // Cleanup on unmount or step change
      const demoSection = document.getElementById("demo");
      if (demoSection) {
        demoSection.classList.remove("tutorial-backtest-active");
      }
    };
  }, [currentStep, zoomToStep, nodes]);

  // Update highlight overlays position continuously
  useEffect(() => {
    if (!overlayRef.current || currentStep < 0) return;

    const updatePositions = () => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const highlights = overlay.querySelectorAll(".tutorial-highlight");

      highlights.forEach((highlight) => {
        const nodeId = highlight.getAttribute("data-node-id");
        if (nodeId) {
          const element = document.querySelector(`[data-id="${nodeId}"]`);
          if (element) {
            const rect = element.getBoundingClientRect();
            highlight.style.left = `${rect.left - 4}px`;
            highlight.style.top = `${rect.top - 4}px`;
            highlight.style.width = `${rect.width + 8}px`;
            highlight.style.height = `${rect.height + 8}px`;
            highlight.style.display = "block";
          } else {
            highlight.style.display = "none";
          }
        } else if (highlight.classList.contains("tutorial-highlight-backtest")) {
          const element = document.querySelector(".backtest");
          if (element) {
            const rect = element.getBoundingClientRect();
            highlight.style.left = `${rect.left - 4}px`;
            highlight.style.top = `${rect.top - 4}px`;
            highlight.style.width = `${rect.width + 8}px`;
            highlight.style.height = `${rect.height + 8}px`;
            highlight.style.display = "block";
          } else {
            highlight.style.display = "none";
          }
        }
      });
    };

    updatePositions();

    // Update on scroll and resize
    const interval = setInterval(updatePositions, 100);
    window.addEventListener("scroll", updatePositions, true);
    window.addEventListener("resize", updatePositions);

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", updatePositions, true);
      window.removeEventListener("resize", updatePositions);
    };
  }, [currentStep]);

  // Update target rect on window resize
  useEffect(() => {
    const handleResize = () => {
      if (currentStep >= 0 && currentStep < tutorialSteps.length) {
        const step = tutorialSteps[currentStep];
        if (step.type === "graph" && step.nodeIds) {
          const rects = getNodeDOMRects(step.nodeIds);
          setTargetRect(rects);
        } else if (step.type === "backtest" && step.selector) {
          const element = document.querySelector(step.selector);
          if (element) {
            setTargetRect(element.getBoundingClientRect());
          }
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentStep, getNodeDOMRects]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tutorial complete
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
      onTutorialComplete();
    }
  }, [currentStep, onTutorialComplete]);

  // Handle skip
  const handleSkip = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    onTutorialComplete();
  }, [onTutorialComplete]);

  // Current step data
  const currentStepData =
    currentStep >= 0 && currentStep < tutorialSteps.length
      ? tutorialSteps[currentStep]
      : null;

  if (!isTutorialActive || !currentStepData) return null;

  return (
    <>
      {/* Dimming overlay */}
      <div ref={overlayRef} className="tutorial-overlay">
        {/* Highlight holes for active elements */}
        {currentStepData.type === "graph" &&
          currentStepData.nodeIds &&
          currentStepData.nodeIds.map((nodeId) => (
            <div
              key={nodeId}
              className="tutorial-highlight"
              data-node-id={nodeId}
            />
          ))}
        {currentStepData.type === "backtest" && (
          <div className="tutorial-highlight tutorial-highlight-backtest" />
        )}
      </div>

      {/* Explanation panel */}
      {targetRect && (
        <ExplanationPanel
          step={currentStepData.id}
          title={currentStepData.title}
          description={currentStepData.description}
          position={currentStepData.position}
          targetRect={targetRect}
          onNext={handleNext}
          onSkip={handleSkip}
          totalSteps={tutorialSteps.length}
        />
      )}
    </>
  );
}
