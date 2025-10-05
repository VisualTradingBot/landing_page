import React from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Build from "./Build";
import Trade from "./Trade";
import TradingPage from "./pages/TradingPage";
import Footer from "./Footer";
import "./App.css";

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
