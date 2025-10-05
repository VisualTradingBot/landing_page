import React from "react";
import Navbar from "./Navbar";
import Hero from "./Hero";
import Build from "./Build";
import Footer from "./Footer";
import Trade from "./pages/TradingPage";
import "./App.css";

function App() {
  return (
    <div className="app-root">
      <Navbar />
      <main>
        <Hero />
        <Build />
        <Trade />
      </main>
      <Footer />
    </div>
  );
}

export default App;
