import { useState, useEffect } from "react";
import { useTrackInteraction } from "../../hooks/useAnalytics";
import "./navbar.scss";

export default function Navbar({ onOpenModal }) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { trackClick } = useTrackInteraction();

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
    trackClick('navbar-contact-us');
    if (onOpenModal) {
      onOpenModal();
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`nav-wrap ${!isVisible ? 'collapsed' : ''}`}>
      <div className="nav-inner">
        <div className="logo" onClick={() => scrollToSection('hero')}>CRYPTIQ</div>
        
        {/* Mobile burger menu button */}
        <button 
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
        >
          <span className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        {/* Desktop navigation */}
        <nav className="links">
          <a href="#build" onClick={(e) => { e.preventDefault(); scrollToSection('build'); }}>BUILD</a>
          <a href="#test" onClick={(e) => { e.preventDefault(); scrollToSection('test'); }}>TEST</a>
          <a href="#trade" onClick={(e) => { e.preventDefault(); scrollToSection('trade'); }}>TRADE</a>
          <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToSection('faq'); }}>FAQ</a>
          <a href="#contact" onClick={handleContactClick}>CONTACT US</a>
        </nav>

        {/* Mobile navigation menu */}
        <nav className={`mobile-links ${isMobileMenuOpen ? 'active' : ''}`}>
          <a href="#build" onClick={(e) => { e.preventDefault(); scrollToSection('build'); closeMobileMenu(); }}>BUILD</a>
          <a href="#test" onClick={(e) => { e.preventDefault(); scrollToSection('test'); closeMobileMenu(); }}>TEST</a>
          <a href="#trade" onClick={(e) => { e.preventDefault(); scrollToSection('trade'); closeMobileMenu(); }}>TRADE</a>
          <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToSection('faq'); closeMobileMenu(); }}>FAQ</a>
          <a href="#contact" onClick={(e) => { e.preventDefault(); handleContactClick(e); closeMobileMenu(); }}>CONTACT US</a>
        </nav>
      </div>
    </header>
  );
}
