import PropTypes from "prop-types";
import "./tooltip.scss";

const CRYPTO_QUANTITY_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

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
            const labelText = meta.exitDisplay
              ? meta.exitDisplay
              : meta.exitProfit
              ? "Profit"
              : "Loss";

            const percentValue = Number(meta.exitSellPercent);
            const quantityValue = Number(meta.exitQuantity);
            const showPartial =
              Number.isFinite(percentValue) &&
              Number.isFinite(quantityValue) &&
              percentValue > 0 &&
              percentValue < 100;

            const percentText = showPartial
              ? Math.abs(percentValue - Math.round(percentValue)) < 1e-4
                ? Math.round(percentValue).toString()
                : percentValue.toFixed(1)
              : null;
            const quantityText = showPartial
              ? CRYPTO_QUANTITY_FORMATTER.format(quantityValue)
              : null;
            const symbol = meta.assetSymbol || "BTC";

            return (
              <>
                <p className="tooltip-value" style={{ color }}>
                  {labelText}
                </p>
                {showPartial && (
                  <p className="tooltip-value" style={{ color: "#94a3b8" }}>
                    Sold: {quantityText} {symbol}
                    {percentText ? ` (${percentText}%)` : ""}
                  </p>
                )}
              </>
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
