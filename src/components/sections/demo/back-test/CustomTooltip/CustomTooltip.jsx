import PropTypes from "prop-types";
import "./tooltip.scss";

// Custom tooltip for the charts
export default function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="backtest-tooltip">
      <p className="tooltip-label">Day: {label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="tooltip-value" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
      {/* show entry/exit meta if present on the data point */}
      {payload[0]?.payload &&
        (() => {
          const meta = payload[0].payload;
          if (meta.isExit) {
            const color = meta.exitProfit ? "#10b981" : "#ef4444";
            const label = meta.exitDisplay
              ? meta.exitDisplay
              : meta.exitProfit
              ? "Profit"
              : "Loss";
            return (
              <p className="tooltip-value" style={{ color }}>
                {label}
              </p>
            );
          }
          if (meta.isEntry) {
            const label = meta.entryDisplay || "Entry";
            return (
              <p className="tooltip-value" style={{ color: "#10b981" }}>
                {label}
              </p>
            );
          }
          return null;
        })()}
    </div>
  );
}

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.number,
  formatter: PropTypes.func,
};
