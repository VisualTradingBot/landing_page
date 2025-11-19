import { useEffect, useState, useRef, useCallback } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { tutorialSteps, TUTORIAL_STORAGE_KEY } from "./tutorialSteps";
import ExplanationPanel from "./ExplanationPanel";
import "./tutorial.scss";
import "./highlight.scss";

function DemoTutorialInner({
  nodes,
  onTutorialComplete,
  onExpandInTrade,
  onParameterDashboardToggle,
  onStepChange,
  forceStart = false,
}) {
  const { fitView, getViewport } = useReactFlow();
  const [currentStep, setCurrentStep] = useState(-1); // -1 means not started
  const [targetRect, setTargetRect] = useState(null);
  const overlayRef = useRef(null);
  const lockedHighlightRef = useRef(null);
  const lockedContainerRef = useRef(null);
  const scrollLoopRef = useRef(false);
  const rafActiveRef = useRef(null);
  const scrollEndTimeoutRef = useRef(null);
  const baseMetricsRef = useRef({ windowY: 0, demoScroll: 0, viewportY: 0 });
  const baseTargetRectRef = useRef(null);

  // Start tutorial when component mounts
  useEffect(() => {
    const hasCompletedTutorial =
      localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";

    if ((forceStart || !hasCompletedTutorial) && currentStep === -1) {
      // Small delay to ensure layout is ready, then start
      const timer = setTimeout(() => {
        setCurrentStep(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentStep, forceStart]);

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
    const padding = 12; // Increased padding for better visual clearance
    const rects = nodeIds
      .map((nodeId) => {
        const element = document.querySelector(`[data-id="${nodeId}"]`);
        return element ? element.getBoundingClientRect() : null;
      })
      .filter((rect) => rect !== null);

    if (rects.length === 0) return null;

    // Special handling for "In trade" block - use just the purple bordered body
    if (step && step.nodeIds && step.nodeIds.includes("blockNode-1")) {
      const blockElement = document.querySelector(`[data-id="blockNode-1"]`);
      if (blockElement) {
        // Get just the body with the purple border (excluding title)
        const blockBody = blockElement.querySelector(".node-default-body");
        if (blockBody) {
          const bodyRect = blockBody.getBoundingClientRect();
          return {
            left: bodyRect.left - padding,
            top: bodyRect.top - 3*padding ,
            right: bodyRect.right + padding,
            bottom: bodyRect.bottom + padding,
            width: bodyRect.width + padding * 2,
            height: bodyRect.height + padding * 4,
          };
        }
        // Fallback to whole block if body not found
        const blockRect = blockElement.getBoundingClientRect();
        return {
          left: blockRect.left - padding,
          top: blockRect.top - padding ,
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
      } else if (step.selector) {
        // For parameter dashboard step specifically (step 5), open the dashboard
        if (step.type === "parameter" && step.selector) {
          // Step 5 should only highlight the OPEN dashboard, never the closed toggle.
          // 1) Hide any existing highlight.
          setTargetRect(null);

          // 2) Scroll demo into view so the dashboard opens in the viewport.
          const demoSection = document.getElementById("demo");
          if (demoSection) {
            demoSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }

          // 3) Open the dashboard immediately
          if (onParameterDashboardToggle) {
            onParameterDashboardToggle(true);
          }

          // 4) Wait for the dashboard to fully expand, then highlight it
          // The dashboard has a 0.4s transition, and content may take time to render
          const updateHighlight = () => {
            // Look for the open dashboard element - MUST have expanded class
            const dashboardElement = document.querySelector(
              ".parameters-dropdown.expanded, .parameter-dashboard.expanded, .parameters-panel.expanded"
            );

            if (dashboardElement) {
              // Verify it's actually expanded by checking if content is visible
              const content = dashboardElement.querySelector(".dropdown-content");
              const parametersList = dashboardElement.querySelector(".parameters-list");
              const isActuallyExpanded = dashboardElement.classList.contains("expanded") &&
                content && 
                content.offsetHeight > 0 &&
                dashboardElement.offsetHeight > 100; // More than just the title height

              if (isActuallyExpanded) {
                const padding = 12;
                const extraBottomPadding = 12; // Extra padding at bottom to prevent cutting
                // Always use the full container rect to include title + content
                const rect = dashboardElement.getBoundingClientRect();
                
                // If parameters list exists, make sure we include its full height
                let finalHeight = rect.height;
                if (parametersList) {
                  const listRect = parametersList.getBoundingClientRect();
                  const listBottom = listRect.bottom;
                  const containerBottom = rect.bottom;
                  // If list extends beyond container, use list bottom
                  if (listBottom > containerBottom) {
                    finalHeight = listBottom - rect.top;
                  }
                }
                
                setTargetRect({
                  left: rect.left - padding,
                  top: rect.top - padding,
                  right: rect.right + padding,
                  bottom: rect.top + finalHeight + extraBottomPadding,
                  width: rect.width + padding * 2,
                  height: finalHeight + padding * 2 + extraBottomPadding,
                });
                return true; // Successfully updated
              }
            }
            return false; // Not ready yet
          };

          // Don't show highlight until dashboard is fully expanded
          // Try multiple times to catch the expansion and content rendering
          const tryHighlight = (attempt = 0) => {
            const maxAttempts = 15; // More attempts to catch content rendering
            if (updateHighlight() || attempt >= maxAttempts) {
              // Even after success, recalculate once more after a delay to catch final render
              if (attempt < maxAttempts) {
                setTimeout(() => updateHighlight(), 200);
              }
              return; // Success or gave up
            }
            setTimeout(() => tryHighlight(attempt + 1), 100);
          };

          // Start trying after transition completes (400ms) + buffer
          setTimeout(() => tryHighlight(), 500);

          return;
        }

        const element = document.querySelector(step.selector);
        if (element) {
          const padding = 12;

          // For backtest, include the title "Demo Strategy ..."
          if (step.type === "backtest") {
            // Smooth scroll to element
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            const padding = 12;
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
            const padding = 12;
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

      // Notify parent about step change for node visibility
      if (onStepChange) {
        onStepChange(currentStep, step);
      }

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
      // If there is a locked highlight, remove it when changing steps
      if (lockedHighlightRef.current && lockedHighlightRef.current.parentNode) {
        lockedHighlightRef.current.parentNode.removeChild(
          lockedHighlightRef.current
        );
      }
      lockedHighlightRef.current = null;
      lockedContainerRef.current = null;
      // restore overlay highlight style
      const overlay = overlayRef.current;
      const ovHighlight =
        overlay && overlay.querySelector(".tutorial-highlight");
      if (ovHighlight) {
        ovHighlight.style.border = "";
        ovHighlight.style.boxShadow = "";
      }
    };
  }, [currentStep, zoomToStep, nodes, onStepChange]);

  // Update single highlight overlay position (calculates bounding box for all elements)
  useEffect(() => {
    if (!overlayRef.current || currentStep < 0) return;

    const overlay = overlayRef.current;
    const highlight = overlay.querySelector(".tutorial-highlight");
    if (!highlight) return;

    // If no targetRect, hide the highlight completely
    if (!targetRect) {
      highlight.style.display = "none";
      return;
    }

    // Force a single complete re-render by hiding first, then showing
    highlight.style.display = "none";

    // Use requestAnimationFrame to ensure the hide takes effect before showing
    requestAnimationFrame(() => {
      // Use the targetRect which already contains the bounding box with padding
      // No additional padding needed since it's already included in targetRect
      highlight.style.left = `${targetRect.left}px`;
      highlight.style.top = `${targetRect.top}px`;
      highlight.style.width = `${targetRect.width}px`;
      highlight.style.height = `${targetRect.height}px`;
      highlight.style.display = "block";
    });
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
            const padding = 12;
            
            // Special handling for parameter dashboard - always highlight full container
            if (step.type === "parameter") {
              // Use the full dashboard container (includes title + content)
              // Prefer the expanded class to ensure we get the fully expanded size
              const dashboardElement = document.querySelector(
                ".parameter-dashboard.expanded, .parameters-panel.expanded, .parameters-dropdown.expanded"
              ) || document.querySelector(
                ".parameter-dashboard, .parameters-panel, .parameters-dropdown"
              );
              if (dashboardElement) {
                const rect = dashboardElement.getBoundingClientRect();
                setTargetRect({
                  left: rect.left - padding,
                  top: rect.top - padding,
                  right: rect.right + padding,
                  bottom: rect.bottom + padding,
                  width: rect.width + padding * 2,
                  height: rect.height + padding * 2,
                });
                return;
              }
            }
            
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

  // Update target rect while scrolling or when the ReactFlow viewport changes
  useEffect(() => {
    if (currentStep < 0 || currentStep >= tutorialSteps.length)
      return undefined;

    let raf = null;
    const step = tutorialSteps[currentStep];

    const updateCurrentRect = () => {
      try {
        if (!step) return;
        if (step.type === "graph" && step.nodeIds) {
          const rects = getNodeDOMRects(step.nodeIds, step);
          if (rects) setTargetRect(rects);
          return;
        }

        if (step.selector) {
          const element = document.querySelector(step.selector);
          if (!element) return;
          const padding = 12;
          
          // Special handling for parameter dashboard - always highlight full container
          if (step.type === "parameter") {
            // Use the full dashboard container (includes title + content)
            // Prefer the expanded class to ensure we get the fully expanded size
            const dashboardElement = document.querySelector(
              ".parameter-dashboard.expanded, .parameters-panel.expanded, .parameters-dropdown.expanded"
            ) || document.querySelector(
              ".parameter-dashboard, .parameters-panel, .parameters-dropdown"
            );
            if (dashboardElement) {
              const rect = dashboardElement.getBoundingClientRect();
              setTargetRect({
                left: rect.left - padding,
                top: rect.top - padding,
                right: rect.right + padding,
                bottom: rect.bottom + padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2,
              });
              return;
            }
          }
          
          if (step.type === "backtest") {
            const backtestContainer = element.closest(".backtest") || element;
            const titleElement = backtestContainer.querySelector("h3");
            if (titleElement) {
              const containerRect = backtestContainer.getBoundingClientRect();
              const titleRect = titleElement.getBoundingClientRect();
              setTargetRect({
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
              });
            } else {
              const rect = element.getBoundingClientRect();
              // If the element sits in a scrollable container such as
              // ReactFlow's viewport or the demo section, create/update a
              // locked highlight inside that container so it moves with the
              // content natively.
              const lockedCandidate =
                element.closest(".react-flow__viewport") ||
                element.closest("#demo") ||
                element.offsetParent ||
                document.body;

              // compute relative rect for locked highlight
              try {
                const containerRect = lockedCandidate.getBoundingClientRect();
                const leftRel = rect.left - containerRect.left;
                const topRel = rect.top - containerRect.top;
                const width = rect.width;
                const height = rect.height;

                // create locked highlight element if needed
                if (
                  !lockedHighlightRef.current ||
                  lockedContainerRef.current !== lockedCandidate
                ) {
                  // remove previous locked highlight if it exists
                  if (
                    lockedHighlightRef.current &&
                    lockedHighlightRef.current.parentNode
                  ) {
                    lockedHighlightRef.current.parentNode.removeChild(
                      lockedHighlightRef.current
                    );
                  }
                  const lockedEl = document.createElement("div");
                  lockedEl.className = "tutorial-highlight-locked";
                  lockedEl.style.position = "absolute";
                  lockedEl.style.pointerEvents = "none";
                  lockedEl.style.zIndex = "9999";
                  lockedEl.style.border = "3px solid #fbbf24";
                  lockedEl.style.boxShadow = "0 0 20px rgba(251, 191, 36, 0.6)";
                  lockedCandidate.appendChild(lockedEl);
                  lockedHighlightRef.current = lockedEl;
                  lockedContainerRef.current = lockedCandidate;
                  // when we add a locked highlight, hide the static overlay border
                  const overlay = overlayRef.current;
                  const ovHighlight =
                    overlay && overlay.querySelector(".tutorial-highlight");
                  if (ovHighlight) {
                    ovHighlight.style.border = "none";
                    ovHighlight.style.boxShadow =
                      "0 0 0 9999px rgba(0,0,0,0.3)";
                  }
                }

                if (lockedHighlightRef.current) {
                  lockedHighlightRef.current.style.left = `${leftRel}px`;
                  lockedHighlightRef.current.style.top = `${topRel}px`;
                  lockedHighlightRef.current.style.width = `${width}px`;
                  lockedHighlightRef.current.style.height = `${height}px`;
                }
              } catch (err) {}

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
            // (Parameter/backtest) similar locked highlight logic
            const lockedCandidate =
              element.closest(".react-flow__viewport") ||
              element.closest("#demo") ||
              element.offsetParent ||
              document.body;
            try {
              const containerRect = lockedCandidate.getBoundingClientRect();
              const leftRel = rect.left - containerRect.left;
              const topRel = rect.top - containerRect.top;
              if (
                !lockedHighlightRef.current ||
                lockedContainerRef.current !== lockedCandidate
              ) {
                if (
                  lockedHighlightRef.current &&
                  lockedHighlightRef.current.parentNode
                ) {
                  lockedHighlightRef.current.parentNode.removeChild(
                    lockedHighlightRef.current
                  );
                }
                const lockedEl = document.createElement("div");
                lockedEl.className = "tutorial-highlight-locked";
                lockedEl.style.position = "absolute";
                lockedEl.style.pointerEvents = "none";
                lockedEl.style.zIndex = "9999";
                lockedEl.style.border = "3px solid #fbbf24";
                lockedEl.style.boxShadow = "0 0 20px rgba(251, 191, 36, 0.6)";
                lockedCandidate.appendChild(lockedEl);
                lockedHighlightRef.current = lockedEl;
                lockedContainerRef.current = lockedCandidate;
              }
              if (lockedHighlightRef.current) {
                lockedHighlightRef.current.style.left = `${
                  leftRel - padding
                }px`;
                lockedHighlightRef.current.style.top = `${topRel - padding}px`;
                lockedHighlightRef.current.style.width = `${
                  rect.width + padding * 2
                }px`;
                lockedHighlightRef.current.style.height = `${
                  rect.height + padding * 2
                }px`;
              }
            } catch (err) {}

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
      } catch (err) {
        // swallow
      }
    };

    // Track previous scroll and viewport transform so we can adjust highlight

    const onScrollOrMutation = () => {
      // Immediately update rect position on any scroll or mutation
      updateCurrentRect();
    };

    window.addEventListener("scroll", onScrollOrMutation, { passive: true });

    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.addEventListener("scroll", onScrollOrMutation, { passive: true });
      const flow = demoEl.querySelector(".react-flow");
      if (flow) {
        flow.addEventListener("scroll", onScrollOrMutation, { passive: true });
      }
    }

    // watch for transforms in ReactFlow viewport (panning/zoom)
    const viewport = document.querySelector(".react-flow__viewport");
    let mo = null;
    if (viewport && typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => {
        // Immediately update on viewport transform changes
        onScrollOrMutation();
      });
      mo.observe(viewport, { attributes: true, attributeFilter: ["style"] });
    }

    // also update immediately so highlight stays in sync
    updateCurrentRect();

    // Create locked highlight if graph step (pan/zoom) so it moves naturally
    if (targetRect) {
      const step = tutorialSteps[currentStep];
      if (step?.type === "graph") {
        try {
          const container = document.querySelector(".react-flow__viewport");
          if (container) {
            if (
              !lockedHighlightRef.current ||
              lockedContainerRef.current !== container
            ) {
              if (
                lockedHighlightRef.current &&
                lockedHighlightRef.current.parentNode
              ) {
                lockedHighlightRef.current.parentNode.removeChild(
                  lockedHighlightRef.current
                );
              }
              const lockedEl = document.createElement("div");
              lockedEl.className = "tutorial-highlight-locked";
              lockedEl.style.position = "absolute";
              lockedEl.style.pointerEvents = "none";
              lockedEl.style.zIndex = "9999";
              lockedEl.style.border = "3px solid #fbbf24";
              lockedEl.style.boxShadow = "0 0 20px rgba(251, 191, 36, 0.6)";
              container.appendChild(lockedEl);
              lockedHighlightRef.current = lockedEl;
              lockedContainerRef.current = container;
            }

            if (lockedHighlightRef.current) {
              const containerRect = container.getBoundingClientRect();
              const leftRel = targetRect.left - containerRect.left;
              const topRel = targetRect.top - containerRect.top;
              lockedHighlightRef.current.style.left = `${leftRel}px`;
              lockedHighlightRef.current.style.top = `${topRel}px`;
              lockedHighlightRef.current.style.width = `${targetRect.width}px`;
              lockedHighlightRef.current.style.height = `${targetRect.height}px`;
            }

            const overlay2 = overlayRef.current;
            const ovHighlight2 =
              overlay2 && overlay2.querySelector(".tutorial-highlight");
            if (ovHighlight2) {
              ovHighlight2.style.border = "none";
              ovHighlight2.style.boxShadow = "0 0 0 9999px rgba(0,0,0,0.3)";
            }
          }
        } catch (err) {
          // ignore
        }
      }
    }

    return () => {
      window.removeEventListener("scroll", onScrollOrMutation);
      if (demoEl) demoEl.removeEventListener("scroll", onScrollOrMutation);
      if (demoEl?.querySelector(".react-flow"))
        demoEl
          .querySelector(".react-flow")
          .removeEventListener("scroll", onScrollOrMutation);
      if (mo) mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (rafActiveRef.current) cancelAnimationFrame(rafActiveRef.current);
      rafActiveRef.current = null;
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
        scrollEndTimeoutRef.current = null;
      }
    };
  }, [currentStep, getNodeDOMRects, nodes]);

  // Handle next step
  const handleNext = useCallback(() => {
    // Close parameter dashboard if we're leaving step 5 (Parameter Dashboard step)
    if (currentStep === 4 && onParameterDashboardToggle) {
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
  onStepChange,
  forceStart = false,
}) {
  return (
    <ReactFlowProvider>
      <DemoTutorialInner
        nodes={nodes}
        onTutorialComplete={onTutorialComplete}
        onExpandInTrade={onExpandInTrade}
        onParameterDashboardToggle={onParameterDashboardToggle}
        onStepChange={onStepChange}
        forceStart={forceStart}
      />
    </ReactFlowProvider>
  );
}
