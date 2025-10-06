import { useEffect, useRef, useState } from "react";
import { animate, createScope, onScroll } from "animejs";
import "./build.scss";

export default function Build() {
  const root = useRef(null);
  const scopeRef = useRef(null);
  const [activeFeature, setActiveFeature] = useState('visual');


  useEffect(() => {
    scopeRef.current = createScope({ root }).add(() => {
      // Main title animation - moves to left position and stops
      animate(".build-title", {
        translateX: [0, "-60%"],
        opacity: [0, 1],
        easing: "easeOut",
        duration: 800,
        autoplay: onScroll({
          target: ".build-title",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      // Subtitle animation - moves to right position and stops
      animate(".build-subtitle", {
        translateX: [0, "40%"],
        opacity: [0, 1],
        easing: "easeOut",
        duration: 600,
        autoplay: onScroll({
          target: ".build-subtitle",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      // Feature items animation - all appear together
      animate(".feature-item", {
        translateY: [30, 0],
        opacity: [0, 1],
        easing: "easeOutExpo",
        duration: 600,
        autoplay: onScroll({
          target: ".build-features",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      // Visual animation - drag and drop sequence
      if (activeFeature === 'visual') {
        // Source block stays in place (no animation)

        // Function to run the complete sequence
        const runSequence = () => {
          // Reset to initial state
          animate(".target-block", {
            translateX: [150],
            translateY: [-70],
            scale: [1],
            easing: "easeInOutCubic",
            duration: 0,
          });

          animate(".line-path", {
            strokeDashoffset: [200],
            easing: "easeInOutCubic",
            duration: 0,
          });

          // Wait a moment, then start the sequence
          setTimeout(() => {
            // Drag sequence
            animate(".target-block", {
              translateX: [150, 0],
              translateY: [-70, 30],
              easing: "easeInOutCubic",
              duration: 1500,
            });

            // Drop animation
            animate(".target-block", {
              scale: [1, 1.2, 1],
              easing: "easeInOutCubic",
              duration: 600,
              delay: 1500,
            });

            // Line drawing
            animate(".line-path", {
              strokeDashoffset: [200, 0],
              easing: "easeInOutCubic",
              duration: 1000,
              delay: 2600,
            });
          }, 500);
        };

        // Run the sequence immediately
        runSequence();

        // Set up interval to repeat every 5 seconds
        const intervalId = setInterval(runSequence, 4500);

        // Store interval ID for cleanup
        return () => clearInterval(intervalId);
      }

      // Modular & Scalable animation
      if (activeFeature === 'indicators') {
        // Function to run the modular sequence
        const runModularSequence = () => {
          // Reset to initial state
          animate(".modular-block", {
            translateX: [0],
            translateY: [0],
            scale: [1],
            easing: "easeInOutCubic",
            duration: 0,
          });

          animate(".selection-box", {
            opacity: 0,
            scale: 0,
            easing: "easeInOutCubic",
            duration: 0,
          });

          animate(".container-block", {
            opacity: [0],
            scale: [0.8],
            easing: "easeInOutCubic",
            duration: 0,
          });

          // Wait a moment, then start the sequence
          setTimeout(() => {
            // Step 1: Show the modular blocks (0-800ms)
            animate(".modular-block", {
              translateX: [0],
              translateY: [0],
              easing: "easeInOutCubic",
              duration: 800,
            });

            // Step 2: Selection box appears around blocks (800-2000ms)
            setTimeout(() => {
              console.log("Animating selection box to appear");
              animate(".selection-box", {
                opacity: [0, 1],
                scale: [0, 1],
                easing: "easeOutCubic",
                duration: 800,
              });
            }, 800);

            // Step 3: Container block appears and selection box disappears (2000-3000ms)
            setTimeout(() => {
              animate(".selection-box", {
                opacity: [1, 0],
                easing: "easeInCubic",
                duration: 1000,
              });

              animate(".container-block", {
                opacity: [0, 1],
                scale: [0.8, 1],
                easing: "easeOutCubic",
                duration: 600,
                delay: 200,
              });
            }, 2000);

            // Step 4: Scale up the container (3000-3500ms)
            setTimeout(() => {
              animate(".container-block", {
                scale: [1, 1.1, 1],
                easing: "easeInOutCubic",
                duration: 500,
              });
            }, 3000);

          });
        };

        // Run the sequence immediately
        runModularSequence();

        // Set up interval to repeat every 7 seconds
        const modularIntervalId = setInterval(runModularSequence, 5000);

        // Store interval ID for cleanup
        return () => clearInterval(modularIntervalId);
      } else if (activeFeature === 'analytics') {
        // Advanced Metrics Control Animation
        const runAdvancedSequence = () => {
          console.log("Starting advanced sequence");
          
          setTimeout(() => {
            console.log("Panel appearing");
            // Step 1: Control panel appears (0-800ms)
            animate(".control-panel", {
              opacity: [0, 1],
              scale: [0.9, 1],
              easing: "easeOutCubic",
              duration: 800,
            });

            // Step 2: Toggles start switching (1000-2500ms)
            setTimeout(() => {
              animate(".toggle-thumb", {
                translateX: [0, 24, 0, 24, 0],
                easing: "easeInOutCubic",
                duration: 1500,
                delay: 200,
              });
            }, 1000);

            // Step 3: Sliders start moving (1500-3500ms)
            setTimeout(() => {
              animate(".slider-thumb", {
                translateX: [0, 60, 20, 45, 30],
                easing: "easeInOutCubic",
                duration: 2000,
                delay: 300,
              });
            }, 1500);

            // Step 4: Input fields change values (2000-4000ms)
            setTimeout(() => {
              const fieldValues = [
                ["1000", "1500", "1200"],
                ["15%", "20%", "18%"]
              ];
              
              fieldValues.forEach((values, fieldIndex) => {
                values.forEach((value, valueIndex) => {
                  setTimeout(() => {
                    const field = document.querySelectorAll(".control-input")[fieldIndex];
                    if (field) {
                      field.value = value;
                      // Flash effect
                      field.style.background = "rgba(124, 58, 237, 0.1)";
                      setTimeout(() => {
                        field.style.background = "";
                      }, 300);
                    }
                  }, valueIndex * 700);
                });
              });
            }, 2000);

            // Step 5: Panel pulse effect (3500-4000ms)
            setTimeout(() => {
              animate(".control-panel", {
                scale: [1, 1.02, 1],
                easing: "easeInOutCubic",
                duration: 500,
              });
            }, 3500);
          }, 500);
        };

        // Run the sequence immediately
        runAdvancedSequence();

        // Set up interval to repeat every 6 seconds
        const advancedIntervalId = setInterval(runAdvancedSequence, 6000);

        // Store interval ID for cleanup
        return () => clearInterval(advancedIntervalId);
      }
    });
    return () => scopeRef.current?.revert();
  }, [activeFeature]);

  return (
    <section id="build" className="build" ref={root}>
      <div className="build-contents">
        <div className="build-header">
          <h2 className="build-title">Build</h2>
        <p className="build-subtitle">
            Create sophisticated trading algorithms with our visual drag-and-drop interface
          </p>
        </div>

        <div className="build-main">
          {/* Duplicate header for media query layout */}
          <div className="build-header-duplicate">
            <h2 className="build-title">Build</h2>
            <p className="build-subtitle">
              Create sophisticated trading algorithms with our visual drag-and-drop interface
            </p>
          </div>
          
          <div className="build-features">
            <div className={`feature-item ${activeFeature === 'visual' ? 'active' : ''}`} onClick={() => setActiveFeature('visual')}>
              <span className="feature-label">Visual Programming</span>
              <span className="feature-description">Drag and drop components to build complex trading strategies</span>
            </div>

            <div className={`feature-item ${activeFeature === 'analytics' ? 'active' : ''}`} onClick={() => setActiveFeature('analytics')}>
              <span className="feature-label">Advanced metrics control</span>
              <span className="feature-description">Use advanced and custom metrics and custom formulas to build strategies with total precision and freedom.</span>
            </div>

            <div className={`feature-item ${activeFeature === 'indicators' ? 'active' : ''}`} onClick={() => setActiveFeature('indicators')}>
              <span className="feature-label">Modular & Scalable</span>
              <span className="feature-description">Build strategies from simple blocks and seamlessly aggregate them into advanced functional modules—scalable design made convenient</span>
            </div>
          </div>

          <div className="animation-area">
            {activeFeature === 'visual' && (
              <div className="visual-animation">
                <div className="floating-block source-block">
                  <div className="block-content">
                    <div className="block-icon"></div>
                  </div>
                </div>
                
                <div className="cursor-drag">
                  <svg className="drag-line" viewBox="0 -40 200 120" preserveAspectRatio="none">
                    <path 
                      className="line-path" 
                      d="M 90 -35 L 180 -35 L 180 -10" 
                      stroke="var(--accent)" 
                      strokeWidth="4" 
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="200"
                      strokeDashoffset="200"
                    />
                  </svg>
                </div>
                
                <div className="floating-block target-block">
                  <div className="block-content">
                    <div className="block-icon"></div>
                  </div>
                </div>
              </div>
            )}
            
            {activeFeature === 'analytics' && (
              <div className="advanced-animation">
                {/* Control Panel Structure */}
                <div className="control-panel">
                  {/* Left Column - Toggles */}
                  <div className="control-column left-column">
                    <div className="control-group">
                      <div className="control-item">
                        <div className="toggle-switch">
                          <div className="toggle-track">
                            <div className="toggle-thumb"></div>
                          </div>
                        </div>
                        <div className="control-label">Auto Trading</div>
                      </div>
                      
                      <div className="control-item">
                        <div className="toggle-switch">
                          <div className="toggle-track">
                            <div className="toggle-thumb"></div>
                          </div>
                        </div>
                        <div className="control-label">Risk Management</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Center Column - Sliders */}
                  <div className="control-column center-column">
                    <div className="control-group">
                      <div className="control-item">
                        <div className="slider-container">
                          <div className="slider-track">
                            <div className="slider-thumb"></div>
                          </div>
                          <div className="slider-value">75%</div>
                        </div>
                        <div className="control-label">Risk Level</div>
                      </div>
                      
                      <div className="control-item">
                        <div className="slider-container">
                          <div className="slider-track">
                            <div className="slider-thumb"></div>
                          </div>
                          <div className="slider-value">2.5%</div>
                        </div>
                        <div className="control-label">Take Profit</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Input Fields */}
                  <div className="control-column right-column">
                    <div className="control-group">
                      <div className="control-item">
                        <div className="input-container">
                          <input type="text" className="control-input" readOnly />
                          <div className="input-unit">USD</div>
                        </div>
                        <div className="control-label">Position Size</div>
                      </div>
                      
                      <div className="control-item">
                        <div className="input-container">
                          <input type="text" className="control-input" readOnly />
                          <div className="input-unit">%</div>
                        </div>
                        <div className="control-label">Drawdown Limit</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
      {activeFeature === 'indicators' && (
        <div className="indicators-animation">
          {/* Three modular blocks */}
          <div className="modular-block block-1">
            <div className="block-content">
              <div className="block-icon"></div>
            </div>
          </div>
          
          <div className="modular-block block-2">
            <div className="block-content">
              <div className="block-icon"></div>
            </div>
          </div>
          
          <div className="modular-block block-3">
            <div className="block-content">
              <div className="block-icon"></div>
            </div>
          </div>
          
          {/* Selection box that appears around the blocks */}
          <div className="selection-box"></div>
          
          {/* Container block that wraps everything */}
          <div className="container-block">
            <div className="container-content">
              <div className="container-label">Module</div>
            </div>
          </div>
        </div>
      )}

          </div>
        </div>
        
        <div className="divider"></div>
      </div>
    </section>
  );
}
