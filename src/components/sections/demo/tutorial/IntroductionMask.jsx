import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import "./tutorial.scss";

export default function IntroductionMask({ onComplete, targetSectionId = "demo" }) {
  const [showMask, setShowMask] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    // Check if mask should be shown immediately (not using IntersectionObserver)
    // The parent component (Demo.jsx) controls when to show the mask
    const hasShown = localStorage.getItem("demo-introduction-mask-shown") === "true";
    if (!hasShown) {
      // Show mask immediately when component mounts
      setShowMask(true);
    } else {
      // If already shown, just call onComplete
      onComplete();
    }
  }, [onComplete]);

  const handleClose = () => {
    setShowMask(false);
    localStorage.setItem("demo-introduction-mask-shown", "true");
    onComplete();
  };

  const handleGetStarted = () => {
    setShowMask(false);
    localStorage.setItem("demo-introduction-mask-shown", "true");
    onComplete();
  };

  if (!showMask) return null;

  return (
    <motion.div
      className="introduction-mask-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="introduction-mask-backdrop" onClick={handleClose} />

      <motion.div
        className="introduction-mask-content"
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 30 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="introduction-mask-header">
          <h2>Interactive Demo</h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="introduction-mask-body">
          <div className="intro-icon">
            <motion.div
              className="animated-icon"
              animate={{
                rotate: 360,
                scale: [1, 1.1, 1],
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <div className="icon-center"></div>
              <div className="icon-ring"></div>
              <div className="icon-dots">
                <div className="dot dot-1"></div>
                <div className="dot dot-2"></div>
                <div className="dot dot-3"></div>
              </div>
            </motion.div>
          </div>

          <h3>Welcome to the CRYPTIQ Editor</h3>

          <p>
            You're about to explore an interactive flowchart that shows how
            trading strategies are made. Here's what you can do:
          </p>

          <ul className="instruction-list">
            <li>
              <span className="bold-text">Connect nodes</span> by dragging from
              outputs to inputs
            </li>
            <li>
              Click nodes to{" "}
              <span className="bold-text">configure parameters</span> and
              conditions
            </li>
            <li>
              Build strategies by{" "}
              <span className="bold-text">chaining indicators and logic</span>
            </li>
            <li>
              Test your strategy through the{" "}
              <span className="bold-text">back testing</span> functionality
            </li>
          </ul>

          <div className="introduction-mask-actions">
            <button className="get-started-button" onClick={handleGetStarted}>
              Let's start
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
