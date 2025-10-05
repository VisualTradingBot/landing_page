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
              <div className="analytics-animation">
                <div className="chart-bars">
                  <div className="bar"></div>
                  <div className="bar"></div>
                  <div className="bar"></div>
                  <div className="bar"></div>
                  <div className="bar"></div>
                </div>
                <div className="trend-line"></div>
              </div>
            )}
            
            {activeFeature === 'indicators' && (
              <div className="indicators-animation">
                <div className="indicator-grid">
                  <div className="grid-item"></div>
                  <div className="grid-item"></div>
                  <div className="grid-item"></div>
                  <div className="grid-item"></div>
                </div>
                <div className="custom-shape"></div>
              </div>
            )}
          </div>
        </div>
        
        <div className="divider"></div>
      </div>
    </section>
  );
}
