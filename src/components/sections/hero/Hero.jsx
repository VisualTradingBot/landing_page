import React from "react";
import { useState, useEffect } from "react";
import "./hero.scss";

export default function Hero() {
  const [heroText, setHeroText] = useState("");

  useEffect(() => {
    const fullText = "Mosaic";
    let currentIndex = 0;

    const typing = setInterval(() => {
      setHeroText(fullText.slice(0, currentIndex + 1));
      currentIndex++;

      if (currentIndex === fullText.length) {
        clearInterval(typing);
      }
    }, 150); // typing speed

    return () => clearInterval(typing);
  }, []);

  return (
    <section id="hero" className="hero">
      <div className="hero-contents">
        <h1>
          {heroText}
          <span className="cursor" aria-hidden>
            _
          </span>
        </h1>
      </div>
      <div className="divider" />
    </section>
  );
}
