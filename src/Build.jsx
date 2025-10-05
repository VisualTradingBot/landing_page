// BuildScrub.jsx
import { useEffect, useRef } from "react";
import { animate, createScope, onScroll } from "animejs";
import "./build.scss";

export default function Build({ title = "Build" }) {
  const root = useRef(null);
  const scopeRef = useRef(null);

  useEffect(() => {
    scopeRef.current = createScope({ root }).add(() => {
      // animate with autoplay controlled by onScroll (sync: true)
      animate(".build-title", {
        translateX: [0, "-25vw"],
        opacity: [0, 1],
        easing: "linear",
        duration: 500,
        autoplay: onScroll({
          target: ".build-title",
          enter: "bottom top",
          leave: "top bottom",
          sync: true, // <-- makes the animation follow scroll progress
          debug: true,
        }),
      });

      animate(".build-subtitle", {
        translateX: ["-25vw", "25vw"],
        opacity: [0, 1],
        duration: 300,
        autoplay: onScroll({
          target: ".build-subtitle",
          enter: "bottom top",
          leave: "top bottom",
          sync: true, // <-- makes the animation follow scroll progress
          debug: true,
        }),
      });
    });
    return () => scopeRef.current?.revert();
  }, []);

  return (
    <section className="build" ref={root}>
      <div className="build-contents">
        <h2 className="build-title">{title}</h2>
        <p className="build-subtitle">
          Lorem Ipsum, dolor sit amet consectetur adipisicing elit. Quisquam,
          quidem.
        </p>
      </div>
    </section>
  );
}
