import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

const palette = {
  portfolio: "#111111",
};

const baseData = [
  { time: "00:00", portfolio: 10000 },
  { time: "01:00", portfolio: 10250 },
  { time: "02:00", portfolio: 9800 },
  { time: "03:00", portfolio: 10500 },
  { time: "04:00", portfolio: 10300 },
  { time: "05:00", portfolio: 11200 },
  { time: "06:00", portfolio: 10900 },
  { time: "07:00", portfolio: 11500 },
  { time: "08:00", portfolio: 11250 },
  { time: "09:00", portfolio: 12100 },
  { time: "10:00", portfolio: 11800 },
  { time: "11:00", portfolio: 11600 },
  { time: "12:00", portfolio: 12800 },
  { time: "13:00", portfolio: 12500 },
  { time: "14:00", portfolio: 13200 },
  { time: "15:00", portfolio: 12400 },
  { time: "16:00", portfolio: 12900 },
  { time: "17:00", portfolio: 14000 },
  { time: "18:00", portfolio: 13700 },
  { time: "19:00", portfolio: 13500 },
  { time: "20:00", portfolio: 14500 },
  { time: "21:00", portfolio: 14200 },
  { time: "22:00", portfolio: 14300 },
  { time: "23:00", portfolio: 14800 },
];

const ANIMATION_DURATION = 900;

function percentageChange(value, baseline = 10000) {
  if (!baseline) return "0.0";
  return ((value / baseline - 1) * 100).toFixed(1);
}

function DefaultValueFormatter(value) {
  if (value === undefined || value === null) return "-";
  return `$${value.toLocaleString()}`;
}

function formatWithSign(formatter, value) {
  if (value === undefined || value === null) return formatter?.(value) ?? "";
  const formattedAbsolute = formatter(Math.abs(value));
  const cleaned =
    typeof formattedAbsolute === "string"
      ? formattedAbsolute.replace(/^[+-]/, "")
      : formattedAbsolute;
  if (value === 0) {
    return formattedAbsolute;
  }
  return `${value >= 0 ? "+" : "-"}${cleaned}`;
}

function CustomTooltip({
  active,
  payload,
  label,
  baseline = 10000,
  valueFormatter = DefaultValueFormatter,
}) {
  if (!active || !payload?.length) return null;

  const [{ value }] = payload;
  const change = percentageChange(value, baseline);
  const numericChange = parseFloat(change);
  const isPositive = !Number.isNaN(numericChange) && numericChange >= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
      <p className="text-gray-600 text-xs mb-1">{label}</p>
      <p className="text-gray-900 font-semibold">
        {valueFormatter(value)}
        {!Number.isNaN(numericChange) && (
          <span
            className={`ml-2 ${isPositive ? "text-green-600" : "text-red-600"}`}
          >
            {isPositive ? "+" : ""}
            {change}%
          </span>
        )}
      </p>
    </div>
  );
}

export default function PerformanceChart({
  customData,
  lineColor = palette.portfolio,
  description = "",
  title = "Performance Dashboard",
  baselineValue,
  valueFormatter = DefaultValueFormatter,
  metricsConfig,
  summaryConfig,
  metricsTitle = "Performance Metrics",
  usePercentageScale,
  showMetrics = true,
  className,
}) {
  const dataToUse = customData || baseData;
  const INITIAL_VISIBLE_POINTS = Math.max(
    2,
    Math.ceil(dataToUse.length * (2 / 3))
  );
  const [visiblePoints, setVisiblePoints] = useState(INITIAL_VISIBLE_POINTS);
  const [chartInstanceKey, setChartInstanceKey] = useState(0);
  const animationFrameRef = useRef(null);
  const animationStartRef = useRef(null);
  const resolvedBaseline = baselineValue ?? dataToUse[0]?.portfolio ?? 10000;
  const shouldUsePercentScale =
    typeof usePercentageScale === "boolean"
      ? usePercentageScale
      : baselineValue === undefined;

  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    animationStartRef.current = null;
  }, []);

  const animateReveal = useCallback(
    (timestamp) => {
      if (!animationStartRef.current) {
        animationStartRef.current = timestamp;
      }

      const elapsed = timestamp - animationStartRef.current;
      const progress = Math.min(1, elapsed / ANIMATION_DURATION);
      const nextCount = Math.max(1, Math.round(progress * dataToUse.length));

      setVisiblePoints((prev) => {
        if (nextCount > prev) {
          return Math.min(nextCount, dataToUse.length);
        }
        return prev;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateReveal);
      } else {
        cancelAnimation();
        setVisiblePoints(dataToUse.length);
      }
    },
    [cancelAnimation, dataToUse.length]
  );

  const startAnimation = useCallback(() => {
    cancelAnimation();
    setVisiblePoints(1);
    setChartInstanceKey((key) => key + 1);
    animationFrameRef.current = requestAnimationFrame(animateReveal);
  }, [animateReveal, cancelAnimation]);

  // Remove hover interactions - chart will animate automatically

  const chartData = useMemo(() => {
    const visibleCount = Math.max(1, Math.min(visiblePoints, dataToUse.length));
    return dataToUse.slice(0, visibleCount).map((point) => ({
      ...point,
      animatedPortfolio: point.portfolio,
    }));
  }, [visiblePoints, dataToUse]);

  useEffect(() => {
    // Start animation automatically when component mounts
    const timer = setTimeout(() => {
      startAnimation();
    }, 500); // Small delay to ensure component is fully mounted

    return () => {
      cancelAnimation();
      clearTimeout(timer);
    };
  }, [startAnimation, cancelAnimation]);

  const [minY, maxY] = useMemo(() => {
    const values = dataToUse.map((point) => point.portfolio);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      return [0, 1];
    }
    const range = maxValue - minValue;
    const padding = Math.max(range * 0.08, 50);
    return [minValue - padding, maxValue + padding];
  }, [dataToUse]);

  // Calculate final metrics
  const finalMetrics = useMemo(() => {
    const firstValue = dataToUse[0]?.portfolio || 10000;
    const lastValue = dataToUse[dataToUse.length - 1]?.portfolio || 10000;
    const maxValue = Math.max(...dataToUse.map((p) => p.portfolio));
    const minValue = Math.min(...dataToUse.map((p) => p.portfolio));

    const totalReturn = (lastValue / firstValue - 1) * 100;
    const maxDrawdown = ((maxValue - minValue) / maxValue) * 100;
    const sharpeRatio =
      totalReturn > 0 ? (totalReturn / 10).toFixed(2) : "0.00";
    const winRate =
      (dataToUse.filter(
        (_, i) => i > 0 && dataToUse[i].portfolio > dataToUse[i - 1].portfolio
      ).length /
        (dataToUse.length - 1)) *
      100;

    return {
      totalReturn: totalReturn.toFixed(1),
      maxDrawdown: maxDrawdown.toFixed(1),
      sharpeRatio,
      winRate: winRate.toFixed(0),
      finalValue: lastValue,
      initialValue: firstValue,
    };
  }, [dataToUse]);

  const metricsToRender = useMemo(() => {
    if (metricsConfig?.length) {
      return metricsConfig.map((metric) => ({
        id: metric.id ?? metric.label,
        ...metric,
      }));
    }

    return [
      {
        id: "total-return",
        label: "Total Return",
        value: `${finalMetrics.totalReturn >= 0 ? "+" : ""}${
          finalMetrics.totalReturn
        }%`,
        tone: finalMetrics.totalReturn >= 0 ? "positive" : "negative",
      },
      {
        id: "final-value",
        label: "Final Value",
        value: valueFormatter(finalMetrics.finalValue),
        tone: "primary",
      },
      {
        id: "max-drawdown",
        label: "Max Drawdown",
        value: `-${finalMetrics.maxDrawdown}%`,
        tone: "negative",
      },
      {
        id: "win-rate",
        label: "Win Rate",
        value: `${finalMetrics.winRate}%`,
        tone: "info",
      },
      {
        id: "sharpe-ratio",
        label: "Sharpe Ratio",
        value: finalMetrics.sharpeRatio,
        tone: "warning",
      },
    ];
  }, [metricsConfig, finalMetrics, valueFormatter]);

  const summaryToRender = useMemo(() => {
    if (summaryConfig === null) {
      return null;
    }

    if (summaryConfig) {
      return summaryConfig;
    }

    const profitLoss = finalMetrics.finalValue - finalMetrics.initialValue;

    return {
      label: "Profit/Loss",
      value: formatWithSign(valueFormatter, profitLoss),
      tone: profitLoss >= 0 ? "positive" : "negative",
    };
  }, [summaryConfig, finalMetrics, valueFormatter]);

  const tooltipRenderer = useCallback(
    (props) => (
      <CustomTooltip
        {...props}
        baseline={resolvedBaseline}
        valueFormatter={valueFormatter}
      />
    ),
    [resolvedBaseline, valueFormatter]
  );

  const wrapperClassName = ["chart-wrapper", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClassName}>
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-title">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>

        <div
          className={`chart-content ${
            showMetrics ? "has-metrics" : "no-metrics"
          }`}
        >
          {/* Chart Section */}
          <div className="chart-section">
            <div className="chart-area">
              <div className="chart-interactive">
                <div className="chart-overlay" />
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart
                    key={chartInstanceKey}
                    data={chartData}
                    margin={{ left: 40, right: 40, top: 20, bottom: 40 }}
                  >
                    <defs>
                      <linearGradient
                        id="gridGradient"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgba(11, 11, 11, 0.1)"
                          stopOpacity="0.5"
                        />
                        <stop
                          offset="100%"
                          stopColor="rgba(11, 11, 11, 0.05)"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="url(#gridGradient)"
                      strokeDasharray="3 3"
                      vertical={true}
                      horizontal={true}
                    />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "rgba(11, 11, 11, 0.7)", fontSize: 12 }}
                      axisLine={true}
                      tickLine={true}
                      interval={1}
                      height={30}
                    />
                    <YAxis
                      domain={[minY, maxY]}
                      tick={{ fill: "rgba(11, 11, 11, 0.7)", fontSize: 12 }}
                      axisLine={true}
                      tickLine={true}
                      tickFormatter={(value) =>
                        shouldUsePercentScale
                          ? `${percentageChange(value, resolvedBaseline)}%`
                          : valueFormatter(value)
                      }
                      width={shouldUsePercentScale ? 60 : 80}
                    />
                    <Tooltip
                      content={tooltipRenderer}
                      cursor={{
                        stroke: "rgba(11, 11, 11, 0.2)",
                        strokeWidth: 1,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="animatedPortfolio"
                      stroke={lineColor}
                      strokeWidth={3}
                      dot={false}
                      name="Portfolio"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Metrics Panel */}
          {showMetrics && (
            <div className="metrics-panel">
              <div className="metrics-header">
                <h4>{metricsTitle}</h4>
              </div>

              <div className="metrics-grid">
                {metricsToRender.map((metric) => (
                  <div className="metric-item" key={metric.id ?? metric.label}>
                    <span className="metric-label">{metric.label}</span>
                    <span className={`metric-value ${metric.tone ?? ""}`}>
                      {metric.value}
                    </span>
                  </div>
                ))}
              </div>

              {summaryToRender && (
                <div className="metrics-summary">
                  <div className="summary-item">
                    <span className="summary-label">
                      {summaryToRender.label}
                    </span>
                    <span
                      className={`summary-value ${summaryToRender.tone ?? ""}`}
                    >
                      {summaryToRender.value}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

PerformanceChart.propTypes = {
  customData: PropTypes.arrayOf(
    PropTypes.shape({
      time: PropTypes.string.isRequired,
      portfolio: PropTypes.number.isRequired,
    })
  ),
  lineColor: PropTypes.string,
  mode: PropTypes.string,
  description: PropTypes.string,
  title: PropTypes.string,
  baselineValue: PropTypes.number,
  valueFormatter: PropTypes.func,
  metricsConfig: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      tone: PropTypes.string,
    })
  ),
  summaryConfig: PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    tone: PropTypes.string,
  }),
  metricsTitle: PropTypes.string,
  usePercentageScale: PropTypes.bool,
  showMetrics: PropTypes.bool,
  className: PropTypes.string,
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.string,
  baseline: PropTypes.number,
  valueFormatter: PropTypes.func,
};
