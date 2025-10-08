import { useState } from "react";
import Navbar from "./components/layout/Navbar";
import Hero from "./components/sections/hero/Hero";
import Build from "./components/sections/build/Build";
import Test from "./components/sections/test/Test";
import Trade from "./components/sections/trade/Trade";
import FAQ from "./components/sections/faq/FAQ";
import CTA from "./components/sections/cta/CTA";
import Footer from "./components/layout/Footer";
import ContactModal from "./components/layout/ContactModal";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import "./styles/App.css";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="app-root">
      <Navbar onOpenModal={openModal} />
      <main>
        <Hero onOpenModal={openModal} />
        <Build />
        <Test />
        <Trade />
        <FAQ />
        <CTA onOpenModal={openModal} />
      </main>

      <Footer />
      <ContactModal isOpen={isModalOpen} onClose={closeModal} />
      
      {/* Analytics Dashboard - Only visible in development */}
      {import.meta.env.DEV && <AnalyticsDashboard />}
    </div>
  );
}

export default App;
