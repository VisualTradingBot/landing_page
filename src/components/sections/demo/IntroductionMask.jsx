import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import "./introductionMask.scss";

export default function IntroductionMask({ targetSectionId = "demo" }) {
  const [showMask, setShowMask] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    // Skip if already shown
    if (hasShown) return;

    const targetSection = document.getElementById(targetSectionId);
    if (!targetSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasShown) {
            setShowMask(true);
            setHasShown(true);
            // Stop observing once shown
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.3, // Trigger when 30% of the section is visible
        rootMargin: "-50px 0px -50px 0px", // Adjust trigger point
      }
    );

    observer.observe(targetSection);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [targetSectionId, hasShown]);

  const handleClose = () => {
    setShowMask(false);
  };

  const handleGetStarted = () => {
    setShowMask(false);
    // Optional: scroll to ensure the demo section is fully visible
    const targetSection = document.getElementById(targetSectionId);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth", block: "center" });
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
            <li>Connect nodes by dragging from outputs to inputs</li>
            <li>Click nodes to configure parameters and conditions</li>
            <li>Build strategies by chaining indicators and logic</li>
            <li>Test how data flows through your strategy</li>
          </ul>

          <div className="introduction-mask-actions">
            <button className="get-started-button" onClick={handleClose}>
              Let's start
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
