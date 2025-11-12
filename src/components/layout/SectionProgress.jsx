import { useEffect, useState, useRef } from "react";
import "./sectionProgress.scss";

export default function SectionProgress() {
  const [positions, setPositions] = useState({
    build: 0,
    test: 0,
    trade: 0,
    demo: 0,
  });
  const containerRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    const updatePositions = () => {
      // Find the sections-container parent
      const sectionsContainer = containerRef.current?.closest('.sections-container');
      if (!sectionsContainer || !containerRef.current) return;

      // Try multiple selectors for Build title (it can be in different places)
      const buildTitle = document.querySelector("#build .build-title") || 
                        document.querySelector("#build .build-header .build-title") || 
                        document.querySelector("#build .build-header-duplicate .build-title");
      const testTitle = document.querySelector("#test h2");
      const tradeTitle = document.querySelector("#trade .trade-title");
      const demoTitle = document.querySelector("#demo .demo-title");

      const containerTop = sectionsContainer.getBoundingClientRect().top + window.scrollY;

      const newPositions = {
        build: buildTitle ? buildTitle.getBoundingClientRect().top + window.scrollY - containerTop : 0,
        test: testTitle ? testTitle.getBoundingClientRect().top + window.scrollY - containerTop : 0,
        trade: tradeTitle ? tradeTitle.getBoundingClientRect().top + window.scrollY - containerTop : 0,
        demo: demoTitle ? demoTitle.getBoundingClientRect().top + window.scrollY - containerTop : 0,
      };

      setPositions(newPositions);

      // Update line height (shifted 50px down to match circles)
      if (lineRef.current && newPositions.build && newPositions.demo) {
        const startY = newPositions.build + 50;
        const endY = newPositions.demo + 50;
        const height = Math.max(0, endY - startY);
        lineRef.current.style.height = `${height}px`;
        lineRef.current.style.top = `${startY}px`;
      }
    };

    updatePositions();
    window.addEventListener("resize", updatePositions);

    // Update on load and after a short delay to ensure all content is rendered
    setTimeout(updatePositions, 100);
    setTimeout(updatePositions, 500);
    setTimeout(updatePositions, 1000);

    return () => {
      window.removeEventListener("resize", updatePositions);
    };
  }, []);

  const getCircleStyle = (position) => {
    if (!position) return { display: "none" };
    return {
      top: `${position + 80}px`, // Shift 50px downwards
    };
  };

  return (
    <div className="section-progress" ref={containerRef}>
      <div className="progress-line" ref={lineRef}></div>
      <div className="progress-circle" style={getCircleStyle(positions.build)}>
        <span>1</span>
      </div>
      <div className="progress-circle" style={getCircleStyle(positions.test)}>
        <span>2</span>
      </div>
      <div className="progress-circle" style={getCircleStyle(positions.trade)}>
        <span>3</span>
      </div>
      <div className="progress-circle" style={getCircleStyle(positions.demo)}>
        <span>4</span>
      </div>
    </div>
  );
}

