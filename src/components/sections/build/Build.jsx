import { useEffect, useRef, useState } from "react";
import { animate, createScope, onScroll } from "animejs";
import "./build.scss";

export default function Build() {
  const root = useRef(null);
  const scopeRef = useRef(null);
  const [activeFeature, setActiveFeature] = useState(null);

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
    });
    return () => scopeRef.current?.revert();
  }, []);

  return (
    <section id="build" className="build" ref={root}>
      <div className="build-contents">
        <div className="build-header">
          <h2 className="build-title">Build</h2>
          <p className="build-subtitle">
            Create sophisticated trading algorithms with our visual drag-and-drop interface
          </p>
        </div>

        <div className="build-features">
          <div className="feature-item" onClick={() => setActiveFeature('visual')}>
            <span className="feature-label">Visual Programming</span>
            <span className="feature-description">Drag and drop components to build complex trading strategies</span>
          </div>

          <div className="feature-item" onClick={() => setActiveFeature('analytics')}>
            <span className="feature-label">Real-time Analytics</span>
            <span className="feature-description">Monitor strategies with live performance metrics</span>
          </div>

          <div className="feature-item" onClick={() => setActiveFeature('indicators')}>
            <span className="feature-label">Custom Indicators</span>
            <span className="feature-description">Create and share custom technical indicators</span>
          </div>
        </div>

        <div className="scale-indicator">
          <div className="scale-rotation">
            <div className="scale-circle">
              <div className="scale-mark"></div>
              <div className="scale-mark"></div>
              <div className="scale-mark"></div>
              <div className="scale-mark"></div>
              <div className="scale-mark"></div>
              <div className="scale-mark"></div>
              <div className="scale-mark"></div>
              <div className="scale-mark"></div>
            </div>
            <div className="scale-center"></div>
          </div>
        </div>

        <div className="animation-area">
          {activeFeature === 'visual' && (
            <div className="visual-animation">
              <div className="drag-icon">📦</div>
              <div className="drop-zone">🎯</div>
              <div className="connection-line"></div>
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
    </section>
  );
}
