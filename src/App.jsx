import React from "react";
import Navbar from "./components/layout/Navbar";
import Hero from "./components/sections/hero/Hero";
import Build from "./components/sections/build/Build";
import Trade from "./components/sections/trade/Trade";
import TradingPage from "./components/trading/TradingPage";
import Footer from "./components/layout/Footer";
import "./styles/App.css";

function App() {
  return (
    <div className="app-root">
      <Navbar />
      <main>
        <Hero />
        <Build />
        <Trade />
        <TradingPage />
      </main>
      <Footer />
    </div>
  );
}

export default App;
