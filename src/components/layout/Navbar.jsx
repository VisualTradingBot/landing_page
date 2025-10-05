import { useState, useEffect } from "react";
import "./navbar.scss";

export default function Navbar({ onOpenModal }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        // Always show when at the very top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide header
        setIsVisible(false);
      } else {
        // Scrolling up - show header
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    if (onOpenModal) {
      onOpenModal();
    }
  };

  return (
    <header className={`nav-wrap ${!isVisible ? 'collapsed' : ''}`}>
      <div className="nav-inner">
        <div className="logo" onClick={() => scrollToSection('hero')}>CRYPTIQ</div>
        <nav className="links">
          <a href="#build" onClick={(e) => { e.preventDefault(); scrollToSection('build'); }}>BUILD</a>
          <a href="#test" onClick={(e) => { e.preventDefault(); scrollToSection('test'); }}>TEST</a>
          <a href="#trade" onClick={(e) => { e.preventDefault(); scrollToSection('trade'); }}>TRADE</a>
          <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToSection('faq'); }}>FAQ</a>
          <a href="#contact" onClick={handleContactClick}>CONTACT US</a>
        </nav>
      </div>
    </header>
  );
}
