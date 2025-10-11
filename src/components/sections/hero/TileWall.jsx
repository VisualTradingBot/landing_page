import "./TileWall.scss";

const TileWall = () => {
  // Get screen dimensions
  const getScreenSize = () => {
    const width = window.innerWidth;

    if (width >= 2560) {
      return "large"; // 6 columns × 14 rows
    } else if (width >= 1920) {
      return "medium"; // 5 columns × 11 rows (1920x1080)
    } else {
      return "small"; // 5 columns × 10 rows
    }
  };

  const screenSize = getScreenSize();

  // Base configuration for small screens (5×10)
  const baseConfig = [
    // Row 1
    { type: "missing", content: "" },
    { type: "empty", content: "CLEAR" },
    { type: "purple", content: "" },
    { type: "black", content: "CONTROL" },
    { type: "empty", content: "" },
    // Row 2
    { type: "black", content: "" },
    { type: "missing", content: "" },
    { type: "empty", content: "TRUST" },
    { type: "purple", content: "SAFE" },
    { type: "black", content: "" },
    // Row 3
    { type: "empty", content: "SMART" },
    { type: "purple", content: "" },
    { type: "missing", content: "" },
    { type: "empty", content: "" },
    { type: "purple", content: "FAST" },
    // Row 4
    { type: "black", content: "" },
    { type: "empty", content: "RELIABLE" },
    { type: "purple", content: "" },
    { type: "missing", content: "" },
    { type: "black", content: "" },
    // Row 5
    { type: "missing", content: "" },
    { type: "black", content: "PRECISE" },
    { type: "empty", content: "" },
    { type: "purple", content: "EASY" },
    { type: "missing", content: "" },
    // Row 6
    { type: "purple", content: "" },
    { type: "empty", content: "GAIN" },
    { type: "black", content: "" },
    { type: "missing", content: "" },
    { type: "empty", content: "SAFE" },
    // Row 7
    { type: "black", content: "" },
    { type: "missing", content: "" },
    { type: "purple", content: "TRUST" },
    { type: "empty", content: "" },
    { type: "black", content: "" },
    // Row 8
    { type: "missing", content: "" },
    { type: "purple", content: "SMART" },
    { type: "empty", content: "" },
    { type: "missing", content: "" },
    { type: "purple", content: "FAST" },
    // Row 9
    { type: "empty", content: "" },
    { type: "black", content: "CONTROL" },
    { type: "purple", content: "" },
    { type: "empty", content: "RELIABLE" },
    { type: "missing", content: "" },
    // Row 10
    { type: "missing", content: "" },
    { type: "missing", content: "" },
    { type: "black", content: "" },
    { type: "empty", content: "PRECISE" },
    { type: "purple", content: "EASY" },
  ];

  // Medium screen config (1920x1080) - add row 11 with only 2 blocks on right
  const mediumConfig = [
    ...baseConfig,
    // Row 11 - only 2 blocks on the right
    { type: "missing", content: "" },
    { type: "missing", content: "" },
    { type: "missing", content: "" },
    { type: "empty", content: "GAIN" },
    { type: "purple", content: "SMART" },
  ];

  // Large screen config - add 4 more rows and 1 more column
  const largeConfig = [
    // Row 1
    { type: "missing", content: "" },
    { type: "empty", content: "CLEAR" },
    { type: "purple", content: "" },
    { type: "black", content: "CONTROL" },
    { type: "empty", content: "" },
    { type: "black", content: "" },
    // Row 2
    { type: "black", content: "" },
    { type: "missing", content: "" },
    { type: "empty", content: "TRUST" },
    { type: "purple", content: "SAFE" },
    { type: "black", content: "" },
    { type: "empty", content: "SMART" },
    // Row 3
    { type: "empty", content: "" },
    { type: "purple", content: "FAST" },
    { type: "missing", content: "" },
    { type: "empty", content: "" },
    { type: "purple", content: "RELIABLE" },
    { type: "black", content: "" },
    // Row 4
    { type: "black", content: "" },
    { type: "empty", content: "PRECISE" },
    { type: "purple", content: "" },
    { type: "missing", content: "" },
    { type: "black", content: "" },
    { type: "empty", content: "EASY" },
    // Row 5
    { type: "missing", content: "" },
    { type: "black", content: "" },
    { type: "empty", content: "GAIN" },
    { type: "purple", content: "SMART" },
    { type: "missing", content: "" },
    { type: "purple", content: "" },
    // Row 6
    { type: "purple", content: "" },
    { type: "empty", content: "TRUST" },
    { type: "black", content: "" },
    { type: "missing", content: "" },
    { type: "empty", content: "CONTROL" },
    { type: "black", content: "" },
    // Row 7
    { type: "black", content: "" },
    { type: "missing", content: "" },
    { type: "purple", content: "SAFE" },
    { type: "empty", content: "" },
    { type: "black", content: "" },
    { type: "missing", content: "" },
    // Row 8
    { type: "missing", content: "" },
    { type: "purple", content: "FAST" },
    { type: "empty", content: "" },
    { type: "missing", content: "" },
    { type: "purple", content: "RELIABLE" },
    { type: "empty", content: "" },
    // Row 9
    { type: "empty", content: "" },
    { type: "black", content: "PRECISE" },
    { type: "purple", content: "" },
    { type: "empty", content: "EASY" },
    { type: "missing", content: "" },
    { type: "purple", content: "" },
    // Row 10
    { type: "missing", content: "" },
    { type: "missing", content: "" },
    { type: "black", content: "" },
    { type: "empty", content: "GAIN" },
    { type: "purple", content: "SMART" },
    { type: "black", content: "" },
    // Row 11
    { type: "purple", content: "TRUST" },
    { type: "missing", content: "" },
    { type: "empty", content: "" },
    { type: "black", content: "CONTROL" },
    { type: "missing", content: "" },
    { type: "empty", content: "" },
    // Row 12
    { type: "black", content: "" },
    { type: "empty", content: "SAFE" },
    { type: "missing", content: "" },
    { type: "purple", content: "FAST" },
    { type: "empty", content: "" },
    { type: "black", content: "" },
    // Row 13
    { type: "missing", content: "" },
    { type: "purple", content: "RELIABLE" },
    { type: "black", content: "" },
    { type: "missing", content: "" },
    { type: "empty", content: "PRECISE" },
    { type: "purple", content: "" },
    // Row 14
    { type: "missing", content: "" },
    { type: "missing", content: "" },
    { type: "black", content: "" },
    { type: "purple", content: "EASY" },
    { type: "missing", content: "" },
    { type: "black", content: "" },
  ];

  // Select configuration based on screen size
  const tileConfig =
    screenSize === "large"
      ? largeConfig
      : screenSize === "medium"
      ? mediumConfig
      : baseConfig;

  return (
    <div className="tile-wall">
      {tileConfig.map((tile, i) => {
        const animationType = i % 10; // Assign to one of 10 animations

        if (tile.type === "missing") {
          return <div key={i} className="tile-missing"></div>;
        }

        const tileClass =
          tile.type === "purple"
            ? "tile-filled-purple"
            : tile.type === "black"
            ? "tile-filled-black"
            : "tile-empty";

        return (
          <div
            key={i}
            className={`tile tile-animation-${animationType} ${tileClass}`}
          >
            {tile.content && (
              <span className="tile-content">{tile.content}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TileWall;
