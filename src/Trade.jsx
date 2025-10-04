import React from "react";
import "./trade.scss";

export default function Trade() {
  return (
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
  );
}
