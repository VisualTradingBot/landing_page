import { useEffect, useState, useRef, useCallback } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { tutorialSteps, TUTORIAL_STORAGE_KEY } from "./tutorialSteps";
import ExplanationPanel from "./ExplanationPanel";
import "./tutorial.scss";

function DemoTutorialInner({
  nodes,
  onTutorialComplete,
  onExpandInTrade,
  onParameterDashboardToggle,
}) {
  const { fitView, getViewport } = useReactFlow();
  const [currentStep, setCurrentStep] = useState(-1); // -1 means not started
  const [targetRect, setTargetRect] = useState(null);
  const overlayRef = useRef(null);

  // Start tutorial when component mounts (if not completed)
  useEffect(() => {
    const hasCompletedTutorial =
      localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";

    if (!hasCompletedTutorial && currentStep === -1) {
      // Wait a bit for ReactFlow to initialize, then start with step 0
      const timer = setTimeout(() => {
        setCurrentStep(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Calculate bounding box for multiple nodes
  const calculateNodesBounds = useCallback(
    (nodeIds) => {
      if (!nodes || nodeIds.length === 0) return null;

      const targetNodes = nodes.filter((node) => nodeIds.includes(node.id));
      if (targetNodes.length === 0) return null;

      const positions = targetNodes.map((node) => ({
        x: node.position?.x || 0,
        y: node.position?.y || 0,
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

  // Get DOM rect for ReactFlow nodes with padding and title inclusion
  const getNodeDOMRects = useCallback((nodeIds, step) => {
    const padding = 5; // 5px padding as requested
    const rects = nodeIds
      .map((nodeId) => {
        const element = document.querySelector(`[data-id="${nodeId}"]`);
        return element ? element.getBoundingClientRect() : null;
      })
      .filter((rect) => rect !== null);

    if (rects.length === 0) return null;

    // Special handling for "In trade" block - include the title and gradient border
    if (step && step.nodeIds && step.nodeIds.includes("blockNode-1")) {
      const blockElement = document.querySelector(`[data-id="blockNode-1"]`);
      if (blockElement) {
        const blockRect = blockElement.getBoundingClientRect();
        // Include the header (title) in the bounding box
        const header = blockElement.querySelector(".node-default-header");
        if (header) {
          const headerRect = header.getBoundingClientRect();
          return {
            left: Math.min(blockRect.left, headerRect.left) - padding,
            top: Math.min(blockRect.top, headerRect.top) - padding,
            right: Math.max(blockRect.right, headerRect.right) + padding,
            bottom: Math.max(blockRect.bottom, headerRect.bottom) + padding,
            width:
              Math.max(blockRect.right, headerRect.right) -
              Math.min(blockRect.left, headerRect.left) +
              padding * 2,
            height:
              Math.max(blockRect.bottom, headerRect.bottom) -
              Math.min(blockRect.top, headerRect.top) +
              padding * 2,
          };
        }
        // If no header found, use block rect with padding
        return {
          left: blockRect.left - padding,
          top: blockRect.top - padding,
          right: blockRect.right + padding,
          bottom: blockRect.bottom + padding,
          width: blockRect.width + padding * 2,
          height: blockRect.height + padding * 2,
        };
      }
    }

    // Calculate combined bounding box for multiple nodes
    const minLeft = Math.min(...rects.map((r) => r.left));
    const maxRight = Math.max(...rects.map((r) => r.right));
    const minTop = Math.min(...rects.map((r) => r.top));
    const maxBottom = Math.max(...rects.map((r) => r.bottom));

    return {
      left: minLeft - padding,
      top: minTop - padding,
      right: maxRight + padding,
      bottom: maxBottom + padding,
      width: maxRight - minLeft + padding * 2,
      height: maxBottom - minTop + padding * 2,
    };
  }, []);

  // Zoom to step targets
  const zoomToStep = useCallback(
    (step) => {
      if (!step) return;

      // Handle expanding in-trade block if needed
      if (step.expandInTrade && onExpandInTrade) {
        onExpandInTrade(false); // false means expanded (not collapsed)
      }

      if (step.type === "graph" && step.nodeIds) {
        // First, scroll to the demo section to make sure it's visible
        const demoSection = document.getElementById("demo");
        if (demoSection) {
          demoSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        // Wait for scroll to settle, then fit the view
        setTimeout(() => {
          // Smooth zoom to fit multiple nodes with padding
          fitView({
            minZoom: 0.7,
            maxZoom: 1.0,
            duration: 600,
            padding: 100,
            nodes: step.nodeIds.map((id) => ({ id })),
          });

          // Get DOM rects with progressive updates during animation
          // Start immediately and update progressively
          const startTime = Date.now();
          const duration = 600; // Match fitView duration

          const updateRect = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);

            const rects = getNodeDOMRects(step.nodeIds, step);
            if (rects) {
              setTargetRect(rects);
            }

            if (progress < 1) {
              requestAnimationFrame(updateRect);
            }
          };

          // Start updating immediately and continue until animation completes
          requestAnimationFrame(updateRect);

          // Final update after animation completes
          setTimeout(() => {
            const rects = getNodeDOMRects(step.nodeIds, step);
            setTargetRect(rects);
          }, duration + 50);
        }, 500);
      } else if (
        (step.type === "parameter" || step.type === "backtest") &&
        step.selector
      ) {
        // For parameter type, we need to ensure the page scrolls to show the parameter dashboard
        if (step.type === "parameter") {
          // First, scroll to the demo section
          const demoSection = document.getElementById("demo");
          if (demoSection) {
            demoSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }

          // Wait for scroll to settle (500ms for smooth scroll), then open dashboard
          setTimeout(() => {
            // Open the parameter dashboard
            if (onParameterDashboardToggle) {
              onParameterDashboardToggle(true);
            }

            // Wait for dashboard to render and position, then get the element position
            setTimeout(() => {
              const element = document.querySelector(step.selector);
              if (element) {
                const padding = 5;
                const rect = element.getBoundingClientRect();
                setTargetRect({
                  left: rect.left - padding,
                  top: rect.top - padding,
                  right: rect.right + padding,
                  bottom: rect.bottom + padding,
                  width: rect.width + padding * 2,
                  height: rect.height + padding * 2,
                });
              }
            }, 300);
          }, 500);
          return;
        }

        const element = document.querySelector(step.selector);
        if (element) {
          // For backtest, include the title "Demo Strategy ..."
          if (step.type === "backtest") {
            // Smooth scroll to element
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            const padding = 5;
            // Find the backtest container
            const backtestContainer = element.closest(".backtest") || element;
            const titleElement = backtestContainer.querySelector("h3");

            if (titleElement) {
              const containerRect = backtestContainer.getBoundingClientRect();
              const titleRect = titleElement.getBoundingClientRect();

              // Include title in the bounding box
              const rect = {
                left: Math.min(containerRect.left, titleRect.left) - padding,
                top: Math.min(containerRect.top, titleRect.top) - padding,
                right: Math.max(containerRect.right, titleRect.right) + padding,
                bottom:
                  Math.max(containerRect.bottom, titleRect.bottom) + padding,
                width:
                  Math.max(containerRect.right, titleRect.right) -
                  Math.min(containerRect.left, titleRect.left) +
                  padding * 2,
                height:
                  Math.max(containerRect.bottom, titleRect.bottom) -
                  Math.min(containerRect.top, titleRect.top) +
                  padding * 2,
              };

              // Progressive updates during scroll
              const startTime = Date.now();
              const duration = 500;

              const updateRect = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);

                // Recalculate during scroll
                const currentContainerRect =
                  backtestContainer.getBoundingClientRect();
                const currentTitleRect = titleElement.getBoundingClientRect();

                const currentRect = {
                  left:
                    Math.min(currentContainerRect.left, currentTitleRect.left) -
                    padding,
                  top:
                    Math.min(currentContainerRect.top, currentTitleRect.top) -
                    padding,
                  right:
                    Math.max(
                      currentContainerRect.right,
                      currentTitleRect.right
                    ) + padding,
                  bottom:
                    Math.max(
                      currentContainerRect.bottom,
                      currentTitleRect.bottom
                    ) + padding,
                  width:
                    Math.max(
                      currentContainerRect.right,
                      currentTitleRect.right
                    ) -
                    Math.min(currentContainerRect.left, currentTitleRect.left) +
                    padding * 2,
                  height:
                    Math.max(
                      currentContainerRect.bottom,
                      currentTitleRect.bottom
                    ) -
                    Math.min(currentContainerRect.top, currentTitleRect.top) +
                    padding * 2,
                };

                setTargetRect(currentRect);

                if (progress < 1) {
                  requestAnimationFrame(updateRect);
                }
              };

              requestAnimationFrame(updateRect);

              // Final update
              setTimeout(() => {
                const finalContainerRect =
                  backtestContainer.getBoundingClientRect();
                const finalTitleRect = titleElement.getBoundingClientRect();
                setTargetRect({
                  left:
                    Math.min(finalContainerRect.left, finalTitleRect.left) -
                    padding,
                  top:
                    Math.min(finalContainerRect.top, finalTitleRect.top) -
                    padding,
                  right:
                    Math.max(finalContainerRect.right, finalTitleRect.right) +
                    padding,
                  bottom:
                    Math.max(finalContainerRect.bottom, finalTitleRect.bottom) +
                    padding,
                  width:
                    Math.max(finalContainerRect.right, finalTitleRect.right) -
                    Math.min(finalContainerRect.left, finalTitleRect.left) +
                    padding * 2,
                  height:
                    Math.max(finalContainerRect.bottom, finalTitleRect.bottom) -
                    Math.min(finalContainerRect.top, finalTitleRect.top) +
                    padding * 2,
                });
              }, duration + 50);
            } else {
              // Fallback if no title found
              const rect = element.getBoundingClientRect();
              setTargetRect({
                left: rect.left - 5,
                top: rect.top - 5,
                right: rect.right + 5,
                bottom: rect.bottom + 5,
                width: rect.width + 10,
                height: rect.height + 10,
              });
            }
          } else {
            // For parameter block, just add padding
            const padding = 5;
            const rect = element.getBoundingClientRect();
            setTargetRect({
              left: rect.left - padding,
              top: rect.top - padding,
              right: rect.right + padding,
              bottom: rect.bottom + padding,
              width: rect.width + padding * 2,
              height: rect.height + padding * 2,
            });
          }
        }
      }
    },
    [fitView, getNodeDOMRects, onExpandInTrade]
  );

  // Handle step changes
  useEffect(() => {
    if (currentStep >= 0 && currentStep < tutorialSteps.length) {
      const step = tutorialSteps[currentStep];

      // Update demo section class based on step type
      const demoSection = document.getElementById("demo");
      if (demoSection) {
        if (step.type === "backtest") {
          demoSection.classList.add("tutorial-backtest-active");
          demoSection.classList.remove("tutorial-active");
        } else if (step.type === "parameter") {
          demoSection.classList.add("tutorial-parameter-active");
          demoSection.classList.remove(
            "tutorial-active",
            "tutorial-backtest-active"
          );
        } else {
          demoSection.classList.add("tutorial-active");
          demoSection.classList.remove(
            "tutorial-backtest-active",
            "tutorial-parameter-active"
          );
        }
      }

      zoomToStep(step);

      // Mark nodes as highlighted
      if (step.type === "graph" && step.nodeIds) {
        nodes.forEach((node) => {
          const element = document.querySelector(`[data-id="${node.id}"]`);
          if (element) {
            if (step.nodeIds.includes(node.id)) {
              element.setAttribute("data-highlight", "true");
            } else {
              element.removeAttribute("data-highlight");
            }
          }
        });
      }
    }

    return () => {
      // Cleanup on step change
      const demoSection = document.getElementById("demo");
      if (demoSection) {
        demoSection.classList.remove(
          "tutorial-backtest-active",
          "tutorial-parameter-active",
          "tutorial-active"
        );
      }
    };
  }, [currentStep, zoomToStep, nodes]);

  // Update single highlight overlay position (calculates bounding box for all elements)
  useEffect(() => {
    if (!overlayRef.current || currentStep < 0 || !targetRect) return;

    const overlay = overlayRef.current;
    const highlight = overlay.querySelector(".tutorial-highlight");
    if (!highlight) return;

    // Use the targetRect which already contains the bounding box with padding
    // No additional padding needed since it's already included in targetRect
    highlight.style.left = `${targetRect.left}px`;
    highlight.style.top = `${targetRect.top}px`;
    highlight.style.width = `${targetRect.width}px`;
    highlight.style.height = `${targetRect.height}px`;
    highlight.style.display = "block";
  }, [currentStep, targetRect]);

  // Update target rect on window resize
  useEffect(() => {
    const handleResize = () => {
      if (currentStep >= 0 && currentStep < tutorialSteps.length) {
        const step = tutorialSteps[currentStep];
        if (step.type === "graph" && step.nodeIds) {
          const rects = getNodeDOMRects(step.nodeIds, step);
          setTargetRect(rects);
        } else if (step.selector) {
          // For parameter and backtest types
          if (step.type === "parameter") {
            // Scroll the demo section to make the parameter dashboard visible
            const demoSection = document.getElementById("demo");
            if (demoSection) {
              // Get the ReactFlow container and scroll it to top
              const reactFlowContainer =
                demoSection.querySelector(".react-flow");
              if (reactFlowContainer) {
                reactFlowContainer.scrollTop = 0;
              }
            }
          }

          const element = document.querySelector(step.selector);
          if (element) {
            const padding = 5;
            if (step.type === "backtest") {
              const backtestContainer = element.closest(".backtest") || element;
              const titleElement = backtestContainer.querySelector("h3");
              if (titleElement) {
                const containerRect = backtestContainer.getBoundingClientRect();
                const titleRect = titleElement.getBoundingClientRect();
                setTargetRect({
                  left: Math.min(containerRect.left, titleRect.left) - padding,
                  top: Math.min(containerRect.top, titleRect.top) - padding,
                  right:
                    Math.max(containerRect.right, titleRect.right) + padding,
                  bottom:
                    Math.max(containerRect.bottom, titleRect.bottom) + padding,
                  width:
                    Math.max(containerRect.right, titleRect.right) -
                    Math.min(containerRect.left, titleRect.left) +
                    padding * 2,
                  height:
                    Math.max(containerRect.bottom, titleRect.bottom) -
                    Math.min(containerRect.top, titleRect.top) +
                    padding * 2,
                });
              } else {
                const rect = element.getBoundingClientRect();
                setTargetRect({
                  left: rect.left - padding,
                  top: rect.top - padding,
                  right: rect.right + padding,
                  bottom: rect.bottom + padding,
                  width: rect.width + padding * 2,
                  height: rect.height + padding * 2,
                });
              }
            } else {
              const rect = element.getBoundingClientRect();
              setTargetRect({
                left: rect.left - padding,
                top: rect.top - padding,
                right: rect.right + padding,
                bottom: rect.bottom + padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2,
              });
            }
          }
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentStep, getNodeDOMRects]);

  // Handle next step
  const handleNext = useCallback(() => {
    // Close parameter dashboard if we're leaving the parameter step
    if (currentStep === 2 && onParameterDashboardToggle) {
      onParameterDashboardToggle(false);
    }

    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setTargetRect(null); // Clear target rect for smooth transition
    } else {
      // Tutorial complete
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
      onTutorialComplete();
    }
  }, [currentStep, onTutorialComplete, onParameterDashboardToggle]);

  // Handle skip
  const handleSkip = useCallback(() => {
    // Close parameter dashboard when skipping
    if (onParameterDashboardToggle) {
      onParameterDashboardToggle(false);
    }
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    onTutorialComplete();
  }, [onTutorialComplete, onParameterDashboardToggle]);

  // Current step data
  const currentStepData =
    currentStep >= 0 && currentStep < tutorialSteps.length
      ? tutorialSteps[currentStep]
      : null;

  if (currentStep < 0 || !currentStepData) return null;

  return (
    <>
      {/* Dimming overlay with single highlight box */}
      <div ref={overlayRef} className="tutorial-overlay">
        {/* Single highlight box that contains all highlighted elements */}
        <div className="tutorial-highlight" />
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

export default function DemoTutorial({
  nodes,
  onTutorialComplete,
  onExpandInTrade,
  onParameterDashboardToggle,
}) {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasCompletedTutorial =
      localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";

    if (!hasCompletedTutorial) {
      setShowTutorial(true);
    }
  }, []);

  if (!showTutorial) return null;

  return (
    <ReactFlowProvider>
      <DemoTutorialInner
        nodes={nodes}
        onTutorialComplete={() => {
          setShowTutorial(false);
          onTutorialComplete();
        }}
        onExpandInTrade={onExpandInTrade}
        onParameterDashboardToggle={onParameterDashboardToggle}
      />
    </ReactFlowProvider>
  );
}
