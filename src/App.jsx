import React, { useState } from "react";
import Navbar from "./components/layout/Navbar";
import Hero from "./components/sections/hero/Hero";
import Build from "./components/sections/build/Build";
import Trade from "./components/sections/trade/Trade";
import TradingPage from "./components/trading/TradingPage";
import Footer from "./components/layout/Footer";
import ContactModal from "./components/layout/ContactModal";
import "./styles/App.css";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="app-root">
      <Navbar />
      <main>
        <Hero onOpenModal={openModal} />
        <Build />
        <Trade />
        <TradingPage />
      </main>
      <Footer onOpenModal={openModal} />
      <ContactModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default App;
