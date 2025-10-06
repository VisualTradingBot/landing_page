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
      <div className="hero-contents">
        <h1 className="hero-title">
          {heroText}
          <span className="cursor">_</span>
        </h1>

        <div className={`hero-tagline ${showTagline ? 'visible' : 'hidden'}`}>
          <p>{taglineText}</p>
        </div>

        <div className={`hero-cta ${showButtons ? 'visible' : 'hidden'}`}>
          <button
            className="cta-button"
            onClick={onOpenModal}
          >
            Get Started
          </button>
          <button
            className="secondary-button"
            onClick={scrollToBuild}
          >
            Learn More
          </button>
        </div>
      </div>

      {/* Moving Tile Wall Animation */}
      <TileWall />
    </section>
  );
}
