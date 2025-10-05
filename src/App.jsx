import React, { useState, useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import Hero from "./components/sections/hero/Hero";
import Build from "./components/sections/build/Build";
import Test from "./components/sections/test/Test";
import Footer from "./components/layout/Footer";
import ContactModal from "./components/layout/ContactModal";
import "./styles/App.css";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      const scaleIndicator = document.querySelector('.scale-indicator');
      if (!scaleIndicator) return;

      const heroSection = document.getElementById('hero');
      if (heroSection) {
        const heroRect = heroSection.getBoundingClientRect();
        const isInHero = heroRect.bottom > 0 && heroRect.top < window.innerHeight;
        
        if (isInHero) {
          scaleIndicator.classList.add('light-bg');
        } else {
          scaleIndicator.classList.remove('light-bg');
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="app-root">
      {/* Global Scale Indicator */}
      <div className="scale-indicator">
        <div className="vertical-scale">
          {Array.from({ length: 50 }, (_, i) => (
            <div key={i} className="scale-tick" data-value={i % 10 === 0 ? i : ''}></div>
          ))}
        </div>
      </div>
      
      <Navbar />
      <main>
        <Hero onOpenModal={openModal} />
        <Build />
        <Test />
      </main>
      <Footer onOpenModal={openModal} />
      <ContactModal isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default App;
