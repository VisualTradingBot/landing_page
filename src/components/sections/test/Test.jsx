import React, { useState } from "react";
import PerformanceChart from "./PerformanceChart";
import "./trade.scss";

export default function Test() {
  const [activeMode, setActiveMode] = useState('backtest');

  const handleCardClick = (mode) => {
    setActiveMode(mode);
  };

  const getChartData = () => {
    switch (activeMode) {
      case 'backtest':
        return {
          title: "Historical Backtest Results",
          description: "Simulated performance over 6 months of historical data",
          color: "#10b981", // Green for profits
          data: [
            { time: "Jan", portfolio: 10000 },
            { time: "Feb", portfolio: 10800 },
            { time: "Mar", portfolio: 10200 },
            { time: "Apr", portfolio: 11500 },
            { time: "May", portfolio: 12000 },
            { time: "Jun", portfolio: 13500 }
          ]
        };
      case 'paper':
        return {
          title: "Paper Trading Performance",
          description: "Live simulation with real market data",
          color: "#3b82f6", // Blue for simulation
          data: [
            { time: "00:00", portfolio: 10000 },
            { time: "04:00", portfolio: 10200 },
            { time: "08:00", portfolio: 9850 },
            { time: "12:00", portfolio: 10300 },
            { time: "16:00", portfolio: 10750 },
            { time: "20:00", portfolio: 11200 },
            { time: "24:00", portfolio: 10950 }
          ]
        };
      case 'deploy':
        return {
          title: "Live Trading Dashboard",
          description: "Real money performance with live market execution",
          color: "#ef4444", // Red for live trading
          data: [
            { time: "09:00", portfolio: 10000 },
            { time: "10:00", portfolio: 10150 },
            { time: "11:00", portfolio: 9950 },
            { time: "12:00", portfolio: 10200 },
            { time: "13:00", portfolio: 10400 },
            { time: "14:00", portfolio: 10650 },
            { time: "15:00", portfolio: 10800 }
          ]
        };
      default:
        return null;
    }
  };

  return (
    <>
      {/* Test Section */}
      <section id="test" className="test-section">
        <div className="container">
          <h2>Test</h2>
          <p className="sub">
            Backtest, simulate and deploy to exchanges securely.
          </p>

          <div className="cards">
            <div 
              className={`card ${activeMode === 'backtest' ? 'active' : ''}`}
              onClick={() => handleCardClick('backtest')}
            >
              <h3>Backtest</h3>
              <p>Run your bot against historical data with one click.</p>
            </div>
            <div 
              className={`card ${activeMode === 'paper' ? 'active' : ''}`}
              onClick={() => handleCardClick('paper')}
            >
              <h3>Paper Trade</h3>
              <p>Simulate live markets without risking capital.</p>
            </div>
            <div 
              className={`card ${activeMode === 'deploy' ? 'active' : ''}`}
              onClick={() => handleCardClick('deploy')}
            >
              <h3>Deploy</h3>
              <p>Connect to major exchanges and deploy in minutes.</p>
            </div>
          </div>
          </div>
        </section>

        {/* Performance Chart Section */}
      <div className="min-h-screen w-full bg-[#05070d] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
          
          <PerformanceChart 
            customData={getChartData()?.data} 
            lineColor={getChartData()?.color}
            mode={activeMode}
            description={getChartData()?.description}
          />
        </div>
        <div className="divider"></div>
      </div>
    </>
  );
}
