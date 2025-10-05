import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import TileWall from "./TileWall";
import "./hero.scss";

export default function Hero({ onOpenModal }) {
  const [heroText, setHeroText] = useState("");
  const [taglineText, setTaglineText] = useState("");
  const [showTagline, setShowTagline] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  const scrollToBuild = () => {
    const buildSection = document.getElementById("build");
    if (buildSection) {
      const elementPosition = buildSection.offsetTop;
      const offsetPosition = elementPosition - 80;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const mainText = "CRYPTIQ";
    const taglineText =
      "New generation platform for visual trading automation.";
    let currentIndex = 0;

    // Type main title
    const typingMain = setInterval(() => {
      setHeroText(mainText.slice(0, currentIndex + 1));
      currentIndex++;

      if (currentIndex === mainText.length) {
        clearInterval(typingMain);

        // Wait a moment, then start typing tagline
        setTimeout(() => {
          setShowTagline(true);
          let taglineIndex = 0;

          const typingTagline = setInterval(() => {
            setTaglineText(taglineText.slice(0, taglineIndex + 1));
            taglineIndex++;

            if (taglineIndex === taglineText.length) {
              clearInterval(typingTagline);
              // Show buttons after tagline is complete
              setTimeout(() => {
                setShowButtons(true);
              }, 500);
            }
          }, 30); // Faster typing for tagline

          return () => clearInterval(typingTagline);
        }, 1000);
      }
    }, 250); // 3 times slower for main text

    return () => clearInterval(typingMain);
  }, []);

  return (
    <section id="hero" className="hero">
      {/* Main Content */}
      <motion.div
        className="hero-contents"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <motion.h1
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {heroText}
          <span className="cursor" aria-hidden>
            _
          </span>
        </motion.h1>

        {showTagline && (
          <motion.div
            className="hero-tagline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p>{taglineText}</p>
          </motion.div>
        )}

        <motion.div
          className="hero-cta"
          initial={{ opacity: 0 }}
          animate={{ opacity: showButtons ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            className="cta-button"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            onClick={onOpenModal}
          >
            Get Started
          </motion.button>
          <motion.button
            className="secondary-button"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            onClick={scrollToBuild}
          >
            Learn More
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Moving Tile Wall Animation */}
      <TileWall />

      <motion.div
        className="divider"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, delay: 1 }}
      />
    </section>
  );
}
