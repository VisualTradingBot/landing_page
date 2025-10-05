import { useEffect, useRef } from "react";
import { animate, createScope, onScroll } from "animejs";
import "./trade.scss";

export default function Trade() {
  const root = useRef(null);
  const scopeRef = useRef(null);

  const benefits = [
    {
      id: "automation",
      title: "24/7 Automation",
      description:
        "Your algorithms trade around the clock, never missing opportunities while you sleep.",
    },
    {
      id: "speed",
      title: "Lightning Speed",
      description:
        "Execute trades in milliseconds, faster than human reaction time.",
    },
    {
      id: "emotion",
      title: "Emotion-Free Trading",
      description:
        "Remove fear and greed from your trading decisions with systematic algorithms.",
    },
    {
      id: "backtesting",
      title: "Proven Strategies",
      description:
        "Deploy only strategies that have been thoroughly backtested and optimized.",
    },
  ];

  useEffect(() => {
    scopeRef.current = createScope({ root }).add(() => {
      // Title animation - stays fixed, just fades in
      animate(".trade-title", {
        opacity: [0, 1],
        easing: "easeOut",
        duration: 800,
        autoplay: onScroll({
          target: ".trade-title",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      // Feature titles animation - slide in from left
      animate(".feature-title", {
        translateX: [-200, 0],
        opacity: [0, 1],
        easing: "easeOutExpo",
        duration: 600,
        delay: (el, i) => i * 100,
        autoplay: onScroll({
          target: ".trade-features",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      // Feature descriptions animation - slide in from right
      animate(".feature-description", {
        translateX: [200, 0],
        opacity: [0, 1],
        easing: "easeOutExpo",
        duration: 600,
        delay: (el, i) => i * 100,
        autoplay: onScroll({
          target: ".trade-features",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });
    });
    return () => scopeRef.current?.revert();
  }, []);

  return (
    <section id="trade" className="trade" ref={root}>
      <div className="container">
        <div className="trade-header">
          <h2 className="trade-title">Trade</h2>
        </div>

        <div className="trade-features">
          {benefits.map((benefit) => (
            <div key={benefit.id} className="feature-row">
              <div className="feature-title">
                <h3>{benefit.title}</h3>
              </div>
              <div className="feature-description">
                <p>{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="divider"></div>
      </div>
    </section>
  );
}
