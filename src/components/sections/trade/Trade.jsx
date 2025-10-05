import { useEffect, useRef, useState } from "react";
import { animate, createScope, onScroll } from "animejs";
import PerformanceChart from "../test/PerformanceChart";
import "./trade.scss";

const marketPresets = {
  btc: {
    label: "BTC/USDT",
    color: "#22c55e",
    timeframes: {
      "1H": {
        label: "1H",
        description: "High-frequency scalping with adaptive liquidity routing.",
        latency: "3.2ms",
        data: [
          { time: "06:00", portfolio: 46510 },
          { time: "07:00", portfolio: 46640 },
          { time: "08:00", portfolio: 46420 },
          { time: "09:00", portfolio: 46890 },
          { time: "10:00", portfolio: 47220 },
          { time: "11:00", portfolio: 47080 },
          { time: "12:00", portfolio: 47460 },
          { time: "13:00", portfolio: 47680 },
          { time: "14:00", portfolio: 47820 },
          { time: "15:00", portfolio: 47510 },
          { time: "16:00", portfolio: 47940 },
          { time: "17:00", portfolio: 48210 },
        ],
        metrics: [
          {
            id: "btc-last-1h",
            label: "Last Price",
            value: "$48,210",
            tone: "primary",
          },
          {
            id: "btc-change-1h",
            label: "24h Change",
            value: "+2.4%",
            tone: "positive",
          },
          {
            id: "btc-vol-1h",
            label: "24h Volume",
            value: "32,450 BTC",
            tone: "info",
          },
          {
            id: "btc-fill-1h",
            label: "Avg Fill",
            value: "$47,180",
            tone: "warning",
          },
          {
            id: "btc-hit-1h",
            label: "Hit Rate",
            value: "68%",
            tone: "positive",
          },
        ],
        summary: { label: "Active Orders", value: "3 Live", tone: "info" },
        orders: [
          {
            id: "BTC-3421",
            side: "LONG",
            size: "0.80 BTC",
            status: "Filled @ 47,180",
            time: "12:14",
          },
          {
            id: "BTC-3422",
            side: "SHORT",
            size: "0.40 BTC",
            status: "Working @ 48,050",
            time: "12:26",
          },
          {
            id: "BTC-3423",
            side: "LONG",
            size: "0.30 BTC",
            status: "Filled @ 47,640",
            time: "12:31",
          },
        ],
        signals: ["Momentum ↑", "Funding +0.013%"],
      },
      "4H": {
        label: "4H",
        description:
          "Mid-term swing book balanced across derivatives and spot liquidity.",
        latency: "4.6ms",
        data: [
          { time: "Mon 00:00", portfolio: 44210 },
          { time: "Mon 04:00", portfolio: 44640 },
          { time: "Mon 08:00", portfolio: 45120 },
          { time: "Mon 12:00", portfolio: 44820 },
          { time: "Mon 16:00", portfolio: 45480 },
          { time: "Mon 20:00", portfolio: 46240 },
          { time: "Tue 00:00", portfolio: 45850 },
          { time: "Tue 04:00", portfolio: 46730 },
          { time: "Tue 08:00", portfolio: 47210 },
          { time: "Tue 12:00", portfolio: 46980 },
          { time: "Tue 16:00", portfolio: 47660 },
          { time: "Tue 20:00", portfolio: 48190 },
        ],
        metrics: [
          {
            id: "btc-last-4h",
            label: "Last Price",
            value: "$48,190",
            tone: "primary",
          },
          {
            id: "btc-change-4h",
            label: "Weekly Change",
            value: "+5.3%",
            tone: "positive",
          },
          {
            id: "btc-vwap-4h",
            label: "VWAP Deviation",
            value: "0.8%",
            tone: "info",
          },
          {
            id: "btc-exposure-4h",
            label: "Net Exposure",
            value: "1.6 BTC",
            tone: "warning",
          },
          {
            id: "btc-rv-4h",
            label: "Realized Vol",
            value: "43%",
            tone: "info",
          },
        ],
        summary: { label: "PnL (WTD)", value: "+$12,480", tone: "positive" },
        orders: [
          {
            id: "BTC-SW1",
            side: "LONG",
            size: "1.20 BTC",
            status: "Trailing @ 48,500",
            time: "12:40",
          },
          {
            id: "BTC-SW2",
            side: "SHORT",
            size: "0.75 BTC",
            status: "Alert @ 47,200",
            time: "11:55",
          },
          {
            id: "BTC-SW3",
            side: "LONG",
            size: "0.50 BTC",
            status: "Filled @ 46,880",
            time: "09:22",
          },
        ],
        signals: ["Range Expansion", "CVD Divergence"],
      },
      "1D": {
        label: "1D",
        description:
          "Long-horizon systematic trend following with adaptive hedging.",
        latency: "5.0ms",
        data: [
          { time: "Jul 01", portfolio: 41890 },
          { time: "Jul 02", portfolio: 42510 },
          { time: "Jul 03", portfolio: 43240 },
          { time: "Jul 04", portfolio: 42780 },
          { time: "Jul 05", portfolio: 43660 },
          { time: "Jul 06", portfolio: 44230 },
          { time: "Jul 07", portfolio: 45120 },
          { time: "Jul 08", portfolio: 44750 },
          { time: "Jul 09", portfolio: 45580 },
          { time: "Jul 10", portfolio: 46210 },
        ],
        metrics: [
          {
            id: "btc-last-1d",
            label: "Last Price",
            value: "$46,210",
            tone: "primary",
          },
          {
            id: "btc-change-1d",
            label: "30d ROI",
            value: "+7.8%",
            tone: "positive",
          },
          {
            id: "btc-dd-1d",
            label: "Max Drawdown",
            value: "-4.5%",
            tone: "negative",
          },
          {
            id: "btc-liq-1d",
            label: "Liquidity Score",
            value: "92 / 100",
            tone: "info",
          },
          {
            id: "btc-var-1d",
            label: "VaR (95%)",
            value: "$3,420",
            tone: "warning",
          },
        ],
        summary: {
          label: "Net PnL (30d)",
          value: "+$38,960",
          tone: "positive",
        },
        orders: [
          {
            id: "BTC-P1",
            side: "LONG",
            size: "2.40 BTC",
            status: "Rebalanced @ 45,900",
            time: "10 Jul",
          },
          {
            id: "BTC-P2",
            side: "SHORT",
            size: "1.00 BTC",
            status: "Hedge @ 46,750",
            time: "10 Jul",
          },
          {
            id: "BTC-P3",
            side: "LONG",
            size: "0.80 BTC",
            status: "Queued @ 45,300",
            time: "Pending",
          },
        ],
        signals: ["Macro Trend ↑", "Funding +0.025%"],
      },
    },
  },
  eth: {
    label: "ETH/USDT",
    color: "#6366f1",
    timeframes: {
      "1H": {
        label: "1H",
        description:
          "Layer-2 aware execution capturing ETH breakout rotations.",
        latency: "2.7ms",
        data: [
          { time: "06:00", portfolio: 3320 },
          { time: "07:00", portfolio: 3348 },
          { time: "08:00", portfolio: 3312 },
          { time: "09:00", portfolio: 3365 },
          { time: "10:00", portfolio: 3398 },
          { time: "11:00", portfolio: 3382 },
          { time: "12:00", portfolio: 3420 },
          { time: "13:00", portfolio: 3436 },
          { time: "14:00", portfolio: 3474 },
          { time: "15:00", portfolio: 3450 },
          { time: "16:00", portfolio: 3498 },
          { time: "17:00", portfolio: 3522 },
        ],
        metrics: [
          {
            id: "eth-last-1h",
            label: "Last Price",
            value: "$3,522",
            tone: "primary",
          },
          {
            id: "eth-change-1h",
            label: "24h Change",
            value: "+3.1%",
            tone: "positive",
          },
          {
            id: "eth-vol-1h",
            label: "24h Volume",
            value: "210K ETH",
            tone: "info",
          },
          {
            id: "eth-gas-1h",
            label: "Avg Gas",
            value: "28 gwei",
            tone: "warning",
          },
          {
            id: "eth-hit-1h",
            label: "Hit Rate",
            value: "63%",
            tone: "positive",
          },
        ],
        summary: { label: "Open Positions", value: "2 Live", tone: "info" },
        orders: [
          {
            id: "ETH-551",
            side: "LONG",
            size: "35 ETH",
            status: "Filled @ 3,418",
            time: "12:07",
          },
          {
            id: "ETH-552",
            side: "SHORT",
            size: "18 ETH",
            status: "Working @ 3,560",
            time: "12:28",
          },
          {
            id: "ETH-553",
            side: "LONG",
            size: "20 ETH",
            status: "Filled @ 3,480",
            time: "12:41",
          },
        ],
        signals: ["Staking Yield 3.9%", "L2 Flow ↑"],
      },
      "4H": {
        label: "4H",
        description:
          "Directional delta overlay with dynamic hedging across perpetuals.",
        latency: "3.4ms",
        data: [
          { time: "Mon 00:00", portfolio: 2980 },
          { time: "Mon 04:00", portfolio: 3025 },
          { time: "Mon 08:00", portfolio: 3090 },
          { time: "Mon 12:00", portfolio: 3062 },
          { time: "Mon 16:00", portfolio: 3138 },
          { time: "Mon 20:00", portfolio: 3204 },
          { time: "Tue 00:00", portfolio: 3176 },
          { time: "Tue 04:00", portfolio: 3248 },
          { time: "Tue 08:00", portfolio: 3310 },
          { time: "Tue 12:00", portfolio: 3286 },
          { time: "Tue 16:00", portfolio: 3354 },
          { time: "Tue 20:00", portfolio: 3398 },
        ],
        metrics: [
          {
            id: "eth-last-4h",
            label: "Last Price",
            value: "$3,398",
            tone: "primary",
          },
          {
            id: "eth-change-4h",
            label: "Weekly Change",
            value: "+6.2%",
            tone: "positive",
          },
          {
            id: "eth-yield-4h",
            label: "Staking Yield",
            value: "3.8%",
            tone: "info",
          },
          {
            id: "eth-exposure-4h",
            label: "Net Exposure",
            value: "1,120 ETH",
            tone: "warning",
          },
          {
            id: "eth-vol-4h",
            label: "Realized Vol",
            value: "51%",
            tone: "info",
          },
        ],
        summary: { label: "PnL (WTD)", value: "+$182,400", tone: "positive" },
        orders: [
          {
            id: "ETH-SW1",
            side: "LONG",
            size: "120 ETH",
            status: "Scaled @ 3,320",
            time: "10:18",
          },
          {
            id: "ETH-SW2",
            side: "SHORT",
            size: "80 ETH",
            status: "Alert @ 3,260",
            time: "08:42",
          },
          {
            id: "ETH-SW3",
            side: "LONG",
            size: "95 ETH",
            status: "Filled @ 3,210",
            time: "05:33",
          },
        ],
        signals: ["Options Skew +12", "Flows Net Long"],
      },
      "1D": {
        label: "1D",
        description:
          "Macro factor model allocating across staking and derivatives yield.",
        latency: "3.1ms",
        data: [
          { time: "Jul 01", portfolio: 2760 },
          { time: "Jul 02", portfolio: 2825 },
          { time: "Jul 03", portfolio: 2890 },
          { time: "Jul 04", portfolio: 2840 },
          { time: "Jul 05", portfolio: 2950 },
          { time: "Jul 06", portfolio: 3015 },
          { time: "Jul 07", portfolio: 3098 },
          { time: "Jul 08", portfolio: 3042 },
          { time: "Jul 09", portfolio: 3124 },
          { time: "Jul 10", portfolio: 3188 },
        ],
        metrics: [
          {
            id: "eth-last-1d",
            label: "Last Price",
            value: "$3,188",
            tone: "primary",
          },
          {
            id: "eth-change-1d",
            label: "30d ROI",
            value: "+11.2%",
            tone: "positive",
          },
          {
            id: "eth-dd-1d",
            label: "Max Drawdown",
            value: "-5.8%",
            tone: "negative",
          },
          { id: "eth-tvl-1d", label: "TVL Flow", value: "$1.9B", tone: "info" },
          {
            id: "eth-var-1d",
            label: "VaR (95%)",
            value: "$620",
            tone: "warning",
          },
        ],
        summary: {
          label: "Net PnL (30d)",
          value: "+$214,600",
          tone: "positive",
        },
        orders: [
          {
            id: "ETH-P1",
            side: "LONG",
            size: "420 ETH",
            status: "Rebalance @ 3,040",
            time: "09 Jul",
          },
          {
            id: "ETH-P2",
            side: "SHORT",
            size: "150 ETH",
            status: "Gamma Hedge @ 3,210",
            time: "08 Jul",
          },
          {
            id: "ETH-P3",
            side: "LONG",
            size: "200 ETH",
            status: "Queued @ 2,980",
            time: "Pending",
          },
        ],
        signals: ["Network Fees ↓", "Dev Releases ↑"],
      },
    },
  },
  sol: {
    label: "SOL/USDT",
    color: "#f97316",
    timeframes: {
      "1H": {
        label: "1H",
        description:
          "Latency-sensitive execution on high velocity SOL order flow.",
        latency: "1.9ms",
        data: [
          { time: "06:00", portfolio: 146 },
          { time: "07:00", portfolio: 147 },
          { time: "08:00", portfolio: 145 },
          { time: "09:00", portfolio: 148 },
          { time: "10:00", portfolio: 152 },
          { time: "11:00", portfolio: 151 },
          { time: "12:00", portfolio: 155 },
          { time: "13:00", portfolio: 157 },
          { time: "14:00", portfolio: 159 },
          { time: "15:00", portfolio: 156 },
          { time: "16:00", portfolio: 160 },
          { time: "17:00", portfolio: 163 },
        ],
        metrics: [
          {
            id: "sol-last-1h",
            label: "Last Price",
            value: "$163",
            tone: "primary",
          },
          {
            id: "sol-change-1h",
            label: "24h Change",
            value: "+4.6%",
            tone: "positive",
          },
          {
            id: "sol-vol-1h",
            label: "24h Volume",
            value: "19M SOL",
            tone: "info",
          },
          {
            id: "sol-fill-1h",
            label: "Fill Rate",
            value: "92%",
            tone: "positive",
          },
          {
            id: "sol-risk-1h",
            label: "Risk Budget",
            value: "Under 35%",
            tone: "warning",
          },
        ],
        summary: { label: "Active Bots", value: "4 Running", tone: "info" },
        orders: [
          {
            id: "SOL-221",
            side: "LONG",
            size: "4,800 SOL",
            status: "Filled @ 151.8",
            time: "12:10",
          },
          {
            id: "SOL-222",
            side: "SHORT",
            size: "2,600 SOL",
            status: "Working @ 165.0",
            time: "12:24",
          },
          {
            id: "SOL-223",
            side: "LONG",
            size: "3,100 SOL",
            status: "Filled @ 156.2",
            time: "12:38",
          },
        ],
        signals: ["NFT Flow ↑", "Funding +0.21%"],
      },
      "4H": {
        label: "4H",
        description: "Cross-exchange arb capturing SOL basis spreads.",
        latency: "2.5ms",
        data: [
          { time: "Mon 00:00", portfolio: 128 },
          { time: "Mon 04:00", portfolio: 131 },
          { time: "Mon 08:00", portfolio: 135 },
          { time: "Mon 12:00", portfolio: 133 },
          { time: "Mon 16:00", portfolio: 138 },
          { time: "Mon 20:00", portfolio: 142 },
          { time: "Tue 00:00", portfolio: 140 },
          { time: "Tue 04:00", portfolio: 145 },
          { time: "Tue 08:00", portfolio: 149 },
          { time: "Tue 12:00", portfolio: 147 },
          { time: "Tue 16:00", portfolio: 152 },
          { time: "Tue 20:00", portfolio: 156 },
        ],
        metrics: [
          {
            id: "sol-last-4h",
            label: "Last Price",
            value: "$156",
            tone: "primary",
          },
          {
            id: "sol-change-4h",
            label: "Weekly Change",
            value: "+9.1%",
            tone: "positive",
          },
          {
            id: "sol-basis-4h",
            label: "Basis Capture",
            value: "1.6%",
            tone: "info",
          },
          {
            id: "sol-exposure-4h",
            label: "Net Exposure",
            value: "58K SOL",
            tone: "warning",
          },
          {
            id: "sol-vol-4h",
            label: "Realized Vol",
            value: "67%",
            tone: "info",
          },
        ],
        summary: { label: "PnL (WTD)", value: "+$286,400", tone: "positive" },
        orders: [
          {
            id: "SOL-SW1",
            side: "LONG",
            size: "12,000 SOL",
            status: "Hedge @ 154.0",
            time: "11:48",
          },
          {
            id: "SOL-SW2",
            side: "SHORT",
            size: "7,500 SOL",
            status: "Alert @ 148.5",
            time: "10:12",
          },
          {
            id: "SOL-SW3",
            side: "LONG",
            size: "6,200 SOL",
            status: "Filled @ 146.0",
            time: "07:05",
          },
        ],
        signals: ["CEX Liquidity ↑", "Perp Basis 0.9%"],
      },
      "1D": {
        label: "1D",
        description:
          "Momentum plus liquidity provisioning across SOL ecosystems.",
        latency: "2.2ms",
        data: [
          { time: "Jul 01", portfolio: 114 },
          { time: "Jul 02", portfolio: 118 },
          { time: "Jul 03", portfolio: 123 },
          { time: "Jul 04", portfolio: 119 },
          { time: "Jul 05", portfolio: 126 },
          { time: "Jul 06", portfolio: 131 },
          { time: "Jul 07", portfolio: 136 },
          { time: "Jul 08", portfolio: 132 },
          { time: "Jul 09", portfolio: 140 },
          { time: "Jul 10", portfolio: 146 },
        ],
        metrics: [
          {
            id: "sol-last-1d",
            label: "Last Price",
            value: "$146",
            tone: "primary",
          },
          {
            id: "sol-change-1d",
            label: "30d ROI",
            value: "+14.6%",
            tone: "positive",
          },
          {
            id: "sol-dd-1d",
            label: "Max Drawdown",
            value: "-6.2%",
            tone: "negative",
          },
          {
            id: "sol-liq-1d",
            label: "Liquidity Score",
            value: "88 / 100",
            tone: "info",
          },
          {
            id: "sol-risk-1d",
            label: "VaR (95%)",
            value: "$280",
            tone: "warning",
          },
        ],
        summary: {
          label: "Net PnL (30d)",
          value: "+$96,400",
          tone: "positive",
        },
        orders: [
          {
            id: "SOL-P1",
            side: "LONG",
            size: "20,000 SOL",
            status: "Provision @ 138.0",
            time: "09 Jul",
          },
          {
            id: "SOL-P2",
            side: "SHORT",
            size: "6,500 SOL",
            status: "Hedge @ 142.5",
            time: "08 Jul",
          },
          {
            id: "SOL-P3",
            side: "LONG",
            size: "8,400 SOL",
            status: "Queued @ 134.0",
            time: "Pending",
          },
        ],
        signals: ["Validator Uptime 99.9%", "DeFi TVL ↑"],
      },
    },
  },
};

const tradeBenefits = [
  {
    id: "latency",
    title: "Latency Optimized Routing",
    description:
      "Co-located exchange gateways deliver sub-5ms reactions to order book shifts.",
  },
  {
    id: "risk",
    title: "Adaptive Risk Controls",
    description:
      "Dynamic position sizing and kill-switches react instantly to volatility spikes.",
  },
  {
    id: "hedge",
    title: "Inventory Hedging",
    description:
      "Perpetual and spot inventory is auto-hedged to keep exposure on target.",
  },
  {
    id: "intel",
    title: "Streaming Intelligence",
    description:
      "Real-time analytics attribute P&L down to each fill for rapid iteration.",
  },
];

export default function Trade() {
  const root = useRef(null);
  const scopeRef = useRef(null);
  const [selectedPair, setSelectedPair] = useState("btc");
  const [selectedTimeframe, setSelectedTimeframe] = useState("1H");

  useEffect(() => {
    const availableTimeframes = Object.keys(
      marketPresets[selectedPair].timeframes
    );
    if (!availableTimeframes.includes(selectedTimeframe)) {
      setSelectedTimeframe(availableTimeframes[0]);
    }
  }, [selectedPair, selectedTimeframe]);

  useEffect(() => {
    scopeRef.current = createScope({ root }).add(() => {
      animate(".trade-title", {
        opacity: [0, 1],
        translateY: [20, 0],
        easing: "easeOutExpo",
        duration: 800,
        autoplay: onScroll({
          target: ".trade-header",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      animate(".toggle-button", {
        opacity: [0, 1],
        translateY: [16, 0],
        easing: "easeOutExpo",
        duration: 500,
        delay: (el, i) => i * 60,
        autoplay: onScroll({
          target: ".trade-switchers",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      animate(".trade-order", {
        opacity: [0, 1],
        translateX: [-20, 0],
        easing: "easeOutExpo",
        duration: 400,
        delay: (el, i) => i * 80,
        autoplay: onScroll({
          target: ".trade-activity",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      animate(".feature-row", {
        opacity: [0, 1],
        translateY: [24, 0],
        easing: "easeOutExpo",
        duration: 500,
        delay: (el, i) => i * 80,
        autoplay: onScroll({
          target: ".trade-highlights",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });

      animate(".trade-chart .chart-container", {
        opacity: [0, 1],
        translateY: [32, 0],
        easing: "easeOutExpo",
        duration: 600,
        autoplay: onScroll({
          target: ".trade-chart",
          enter: "bottom center",
          leave: "center top",
          sync: true,
        }),
      });
    });

    return () => scopeRef.current?.revert();
  }, []);

  const activePair = marketPresets[selectedPair];
  const timeframeOptions = Object.keys(activePair.timeframes);
  const activeTimeframe =
    activePair.timeframes[selectedTimeframe] ||
    activePair.timeframes[timeframeOptions[0]];

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return "-";
    const absolute = Math.abs(value);
    const formatter = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: absolute < 100 ? 2 : 0,
      maximumFractionDigits: absolute < 100 ? 2 : 0,
    });
    const formatted = `$${formatter.format(absolute)}`;
    if (value < 0) {
      return `-${formatted}`;
    }
    return formatted;
  };

  const chartTitle = `${activePair.label} • ${activeTimeframe.label}`;

  return (
    <section id="trade" className="trade" ref={root}>
      <div className="container">
        <div className="trade-header">
          <h2 className="trade-title">Trade</h2>
          <p className="trade-subtitle">
            Deploy institutional-grade execution across leading digital asset
            venues with real-time telemetry.
          </p>
        </div>

        <div className="trade-grid">
          <div className="trade-left">
            <div className="trade-switchers">
              <div className="toggle-group">
                <span className="toggle-label">Market</span>
                <div className="toggle-buttons">
                  {Object.entries(marketPresets).map(([id, config]) => (
                    <button
                      key={id}
                      type="button"
                      className={`toggle-button trade-pair-button ${
                        selectedPair === id ? "is-active" : ""
                      }`}
                      onClick={() => setSelectedPair(id)}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="toggle-group">
                <span className="toggle-label">Timeframe</span>
                <div className="toggle-buttons">
                  {timeframeOptions.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      className={`toggle-button trade-timeframe-button ${
                        selectedTimeframe === tf ? "is-active" : ""
                      }`}
                      onClick={() => setSelectedTimeframe(tf)}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="trade-activity">
              <div className="trade-activity-header">
                <h3>Execution Feed</h3>
                <span className="feed-meta">
                  Latency {activeTimeframe.latency}
                </span>
              </div>

              <div className="trade-orders">
                {(activeTimeframe.orders ?? []).map((order) => (
                  <div key={order.id} className="trade-order">
                    <div className="trade-order-meta">
                      <span
                        className={`trade-order-side ${order.side.toLowerCase()}`}
                      >
                        {order.side}
                      </span>
                      <span className="trade-order-size">{order.size}</span>
                    </div>
                    <div className="trade-order-details">
                      <span>{order.status}</span>
                      <span className="trade-order-time">{order.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {(activeTimeframe.signals ?? []).length > 0 && (
                <div className="trade-signals">
                  {activeTimeframe.signals.map((signal) => (
                    <span key={signal} className="trade-signal-badge">
                      {signal}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="trade-chart">
            <PerformanceChart
              customData={activeTimeframe.data}
              lineColor={activePair.color}
              description={activeTimeframe.description}
              baselineValue={activeTimeframe.data?.[0]?.portfolio}
              valueFormatter={formatCurrency}
              title={chartTitle}
              usePercentageScale={false}
              showMetrics={false}
              metricsConfig={null}
              summaryConfig={null}
              className="Performance-Chart"
            />
          </div>
        </div>

        <div className="trade-highlights">
          {tradeBenefits.map((benefit) => (
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
