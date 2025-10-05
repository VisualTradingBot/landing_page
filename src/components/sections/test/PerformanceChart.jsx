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
  return ((value / baseline - 1) * 100).toFixed(1);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const [{ value }] = payload;
  const change = ((value / 10000 - 1) * 100).toFixed(1);
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
      <p className="text-gray-600 text-xs mb-1">{label}</p>
      <p className="text-gray-900 font-semibold">
        ${value?.toLocaleString()}
        <span className={`ml-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{change}%
        </span>
      </p>
    </div>
  );
}

export default function PerformanceChart({ customData, lineColor = palette.portfolio, mode = 'backtest', description = '' }) {
  const dataToUse = customData || baseData;
  const INITIAL_VISIBLE_POINTS = Math.max(
    2,
    Math.ceil(dataToUse.length * (2 / 3))
  );
  const [visiblePoints, setVisiblePoints] = useState(INITIAL_VISIBLE_POINTS);
  const [chartInstanceKey, setChartInstanceKey] = useState(0);
  const animationFrameRef = useRef(null);
  const animationStartRef = useRef(null);

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
    [cancelAnimation]
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
    return [minValue - 150, maxValue + 150];
  }, [dataToUse]);

  // Calculate final metrics
  const finalMetrics = useMemo(() => {
    const firstValue = dataToUse[0]?.portfolio || 10000;
    const lastValue = dataToUse[dataToUse.length - 1]?.portfolio || 10000;
    const maxValue = Math.max(...dataToUse.map(p => p.portfolio));
    const minValue = Math.min(...dataToUse.map(p => p.portfolio));
    
    const totalReturn = ((lastValue / firstValue - 1) * 100);
    const maxDrawdown = ((maxValue - minValue) / maxValue * 100);
    const sharpeRatio = totalReturn > 0 ? (totalReturn / 10).toFixed(2) : '0.00';
    const winRate = dataToUse.filter((_, i) => i > 0 && dataToUse[i].portfolio > dataToUse[i-1].portfolio).length / (dataToUse.length - 1) * 100;
    
    return {
      totalReturn: totalReturn.toFixed(1),
      maxDrawdown: maxDrawdown.toFixed(1),
      sharpeRatio,
      winRate: winRate.toFixed(0),
      finalValue: lastValue,
      initialValue: firstValue
    };
  }, [dataToUse]);

  return (
    <div className="chart-wrapper">
      <div className="chart-container">
        <div className="chart-header">
          <div className="chart-title">
            <h3>Performance Dashboard</h3>
            <p>{description}</p>
          </div>
        </div>
        
        <div className="chart-content">
          {/* Chart Section */}
          <div className="chart-section">
            <div className="chart-area">
              <div
                className="chart-interactive"
              >
                <div className="chart-overlay" />
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart
                    key={chartInstanceKey}
                    data={chartData}
                    margin={{ left: 40, right: 40, top: 20, bottom: 40 }}
                  >
                    <defs>
                      <linearGradient id="gridGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(11, 11, 11, 0.1)" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="rgba(11, 11, 11, 0.05)" stopOpacity="0" />
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
                      tickFormatter={(value) => `${percentageChange(value)}%`}
                      width={60}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "rgba(11, 11, 11, 0.2)", strokeWidth: 1 }}
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
          <div className="metrics-panel">
            <div className="metrics-header">
              <h4>Performance Metrics</h4>
            </div>
            
            <div className="metrics-grid">
              <div className="metric-item">
                <span className="metric-label">Total Return</span>
                <span className={`metric-value ${finalMetrics.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                  {finalMetrics.totalReturn >= 0 ? '+' : ''}{finalMetrics.totalReturn}%
                </span>
              </div>
              
              <div className="metric-item">
                <span className="metric-label">Final Value</span>
                <span className="metric-value primary">
                  ${finalMetrics.finalValue?.toLocaleString()}
                </span>
              </div>
              
              <div className="metric-item">
                <span className="metric-label">Max Drawdown</span>
                <span className="metric-value negative">
                  -{finalMetrics.maxDrawdown}%
                </span>
              </div>
              
              <div className="metric-item">
                <span className="metric-label">Win Rate</span>
                <span className="metric-value info">
                  {finalMetrics.winRate}%
                </span>
              </div>
              
              <div className="metric-item">
                <span className="metric-label">Sharpe Ratio</span>
                <span className="metric-value warning">
                  {finalMetrics.sharpeRatio}
                </span>
              </div>
            </div>

            <div className="metrics-summary">
              <div className="summary-item">
                <span className="summary-label">Profit/Loss</span>
                <span className={`summary-value ${finalMetrics.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                  ${((finalMetrics.finalValue - finalMetrics.initialValue)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
