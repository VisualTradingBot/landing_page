import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import "./InfoButton.scss";

export default function InfoButton({
  explanation,
  position = "left",
  variant = "header",
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);

  const updateTooltipPosition = () => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const spacing = 8;
    const tooltipWidth = 250; // Estimated width
    const tooltipHeight = 100; // Estimated height

    let top = buttonRect.bottom + spacing;
    let left = buttonRect.left;

    if (position === "right") {
      // For right position, align tooltip's right edge near button's right edge
      left = buttonRect.right - tooltipWidth;
    }

    // Ensure tooltip doesn't go off screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + tooltipWidth > viewportWidth - 20) {
      left = viewportWidth - tooltipWidth - 20;
    }
    if (left < 20) {
      left = 20;
    }

    if (top + tooltipHeight > viewportHeight - 20) {
      // Show above button instead
      top = buttonRect.top - tooltipHeight - spacing;
    }
    if (top < 20) {
      top = 20;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (isHovered) {
      updateTooltipPosition();
      window.addEventListener("scroll", updateTooltipPosition, true);
      window.addEventListener("resize", updateTooltipPosition);
    }

    return () => {
      window.removeEventListener("scroll", updateTooltipPosition, true);
      window.removeEventListener("resize", updateTooltipPosition);
    };
  }, [isHovered, position]);

  const tooltip = isHovered
    ? createPortal(
        <div
          ref={tooltipRef}
          className={`info-tooltip info-tooltip--${position}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          {explanation}
        </div>,
        document.body
      )
    : null;

  // Determine wrapper class based on variant
  const wrapperClass =
    variant === "absolute"
      ? `info-button-wrapper info-button-wrapper--absolute${
          position === "right" ? " info-button-wrapper--absolute--right" : ""
        }`
      : `info-button-wrapper info-button-wrapper--${variant}`;

  return (
    <>
      <div
        ref={buttonRef}
        className={wrapperClass}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          className="info-button"
          aria-label="Information"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="info-icon">ℹ</span>
        </button>
      </div>
      {tooltip}
    </>
  );
}

InfoButton.propTypes = {
  explanation: PropTypes.string.isRequired,
  position: PropTypes.oneOf(["left", "right"]),
  variant: PropTypes.oneOf(["header", "absolute"]),
};
