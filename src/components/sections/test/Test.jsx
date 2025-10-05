import React from "react";
import PerformanceChart from "./PerformanceChart";
import "./trade.scss";

export default function Test() {
  return (
    <>
      {/* Trade Section */}
      <section id="trade" className="trade">
        <div className="container">
          <h2>Trade</h2>
          <p className="sub">
            Backtest, simulate and deploy to exchanges securely.
          </p>

          <div className="cards">
            <div className="card">
              <h3>Backtest</h3>
              <p>Run your bot against historical data with one click.</p>
            </div>
            <div className="card">
              <h3>Paper Trade</h3>
              <p>Simulate live markets without risking capital.</p>
            </div>
            <div className="card">
              <h3>Deploy</h3>
              <p>Connect to major exchanges and deploy in minutes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Chart Section */}
      <div className="min-h-screen w-full bg-[#05070d] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
          <PerformanceChart />
        </div>
      </div>
    </>
  );
}
