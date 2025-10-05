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
  return <div></div>;
}

export default function PerformanceChart() {
  const INITIAL_VISIBLE_POINTS = Math.max(
    2,
    Math.ceil(baseData.length * (2 / 3))
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
      const nextCount = Math.max(1, Math.round(progress * baseData.length));

      setVisiblePoints((prev) => {
        if (nextCount > prev) {
          return Math.min(nextCount, baseData.length);
        }
        return prev;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateReveal);
      } else {
        cancelAnimation();
        setVisiblePoints(baseData.length);
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

  const handleMouseEnter = useCallback(() => {
    startAnimation();
  }, [startAnimation]);

  const handleMouseMove = useCallback(() => {
    if (!animationFrameRef.current) {
      startAnimation();
    }
  }, [startAnimation]);

  const chartData = useMemo(() => {
    const visibleCount = Math.max(1, Math.min(visiblePoints, baseData.length));
    return baseData.map((point, index) => ({
      ...point,
      animatedPortfolio: index < visibleCount ? point.portfolio : null,
    }));
  }, [visiblePoints]);

  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  const [minY, maxY] = useMemo(() => {
    const values = baseData.map((point) => point.portfolio);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    return [minValue - 150, maxValue + 150];
  }, []);

  return (
    <div className="overflow-hidden rounded-3xl border border-[#1f2839] bg-gradient-to-b from-[#111827] via-[#0d121f] to-[#0a0f19] shadow-[0_35px_80px_rgba(0,0,0,0.55)]">
      <div className="space-y-6 px-6 pb-6 pt-5">
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            cancelAnimation();
            setVisiblePoints(INITIAL_VISIBLE_POINTS);
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-[#1c2538]/60 via-transparent to-transparent" />
          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              key={chartInstanceKey}
              data={chartData}
              margin={{ left: 20, right: 20, top: 30, bottom: 60 }}
            >
              <defs>
                <linearGradient id="gridGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#243047" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#111827" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="url(#gridGradient)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#5f6b87", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                interval={1}
                height={40}
              />
              <YAxis
                domain={[minY, maxY]}
                tick={{ fill: "#5f6b87", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${percentageChange(value)}%`}
                width={70}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "#2b3650", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="animatedPortfolio"
                stroke={palette.portfolio}
                strokeWidth={3}
                dot={false}
                name="My Dawg"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
