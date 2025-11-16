import { useState, useEffect } from "react";
import { useTrackInteraction } from "../../../hooks/useAnalytics";
import TileWall from "./TileWall";
import "./hero.scss";
import PropTypes from "prop-types";

export default function Hero({ onOpenModal }) {
  const [heroText, setHeroText] = useState("");
  const [taglineText, setTaglineText] = useState("");
  const [showTagline, setShowTagline] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showDemoCta, setShowDemoCta] = useState(false);
  const { trackClick } = useTrackInteraction();

  const scrollToBuild = () => {
    const buildSection = document.getElementById("build");
    if (buildSection) {
      const rect = buildSection.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const elementPosition = rect.top + scrollTop;
      const offsetPosition = elementPosition - 80;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      });
    } else {
      console.warn("[Hero] Build section not found");
    }
  };

  const scrollToDemo = () => {
    const demoSection = document.getElementById("demo");
    if (demoSection) {
      const elementPosition = demoSection.getBoundingClientRect().top + window.pageYOffset;
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
                // Show demo CTA after a delay with cooler animation
                setTimeout(() => {
                  setShowDemoCta(true);
                }, 400);
              }, 200);
            }
          }, 25); // Faster typing for tagline

          return () => clearInterval(typingTagline);
        }, 200);
      }
    }, 150);  // 3 times slower for main text

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

        <div className={`hero-tagline ${showTagline ? "visible" : "hidden"}`}>
          <p>{taglineText}</p>
        </div>

        <div className={`hero-cta ${showButtons ? "visible" : "hidden"}`}>
          <button
            className="cta-button"
            onClick={() => {
              trackClick("hero-get-in-touch");
              onOpenModal();
            }}
          >
            Get in touch
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              trackClick("hero-explore");
              scrollToBuild();
            }}
          >
            Explore
          </button>
        </div>

        <div className={`hero-demo-cta ${showDemoCta ? "visible" : "hidden"}`}>
          <p className="demo-text">demo is out!</p>
          <button
            className="demo-button"
            onClick={() => {
              trackClick("hero-try-demo");
              scrollToDemo();
            }}
          >
            TRY DEMO
          </button>
        </div>
      </div>

      {/* Moving Tile Wall Animation */}
      <TileWall />
    </section>
  );
}

Hero.propTypes = {
  onOpenModal: PropTypes.func.isRequired,
};
