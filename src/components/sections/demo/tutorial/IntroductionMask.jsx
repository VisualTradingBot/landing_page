import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./tutorial.scss";
import PropTypes from "prop-types";

export default function IntroductionMask({
  onComplete,
  onSkip,
  alwaysShow = false,
}) {
  const [showMask, setShowMask] = useState(false);

  useEffect(() => {
    // Parent controls mounting; when mounted, optionally force-show regardless of history
    if (alwaysShow) {
      setShowMask(true);
      return;
    }

    const hasShown =
      localStorage.getItem("demo-introduction-mask-shown") === "true";
    if (!hasShown) {
      setShowMask(true);
    } else {
      onComplete();
    }
  }, [onComplete, alwaysShow]);

  const handleClose = () => {
    setShowMask(false);
    localStorage.setItem("demo-introduction-mask-shown", "true");
  };

  const handleGetStarted = () => {
    setShowMask(false);
    localStorage.setItem("demo-introduction-mask-shown", "true");
    onComplete();
  };

  const handleSkipTutorial = () => {
    setShowMask(false);
    localStorage.setItem("demo-introduction-mask-shown", "true");
    if (onSkip) {
      onSkip();
    } else {
      // Fallback: if onSkip is not provided, just call onComplete
      onComplete();
    }
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
            You&apos;re about to explore an interactive flowchart that shows how
            trading strategies are made. Here&apos;s what you can do:
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
            <button
              className="skip-tutorial-button"
              onClick={handleSkipTutorial}
            >
              Skip Tutorial
            </button>
            <button className="get-started-button" onClick={handleGetStarted}>
              Let&apos;s start
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

IntroductionMask.propTypes = {
  onComplete: PropTypes.func.isRequired,
  onSkip: PropTypes.func,
  targetSectionId: PropTypes.string,
  alwaysShow: PropTypes.bool,
};
