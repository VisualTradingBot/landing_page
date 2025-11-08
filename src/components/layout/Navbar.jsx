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

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen) {
        const mobileMenu = document.querySelector('.mobile-links');
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        
        if (mobileMenu && menuToggle && 
            !mobileMenu.contains(event.target) && 
            !menuToggle.contains(event.target)) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleLogoClick = () => {
    trackClick('logo-click');
    scrollToSection('hero');
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
    trackClick('mobile-menu-toggle');
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`nav-wrap ${!isVisible ? 'collapsed' : ''}`}>
      <div className="nav-inner">
        <div className="logo" onClick={handleLogoClick}>CRYPTIQ</div>
        
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
          <a href="#build" onClick={(e) => { e.preventDefault(); trackClick('desktop-nav-build'); scrollToSection('build'); }}>BUILD</a>
          <a href="#test" onClick={(e) => { e.preventDefault(); trackClick('desktop-nav-test'); scrollToSection('test'); }}>TEST</a>
          <a href="#trade" onClick={(e) => { e.preventDefault(); trackClick('desktop-nav-trade'); scrollToSection('trade'); }}>TRADE</a>
          <a href="#demo" onClick={(e) => { e.preventDefault(); trackClick('desktop-nav-demo'); scrollToSection('demo'); }}>DEMO</a>
          <a href="#faq" onClick={(e) => { e.preventDefault(); trackClick('desktop-nav-faq'); scrollToSection('faq'); }}>FAQ</a>
          <a href="#contact" onClick={handleContactClick}>CONTACT US</a>
        </nav>


        {/* Mobile navigation menu */}
        <nav className={`mobile-links ${isMobileMenuOpen ? 'active' : ''}`}>
          {/* Navigation links - only show on screens < 1024px */}
          <div className="mobile-nav-links">
            <a href="#build" onClick={(e) => { e.preventDefault(); trackClick('mobile-nav-build'); scrollToSection('build'); closeMobileMenu(); }}>BUILD</a>
            <a href="#demo" onClick={(e) => { e.preventDefault(); trackClick('mobile-nav-demo'); scrollToSection('demo'); closeMobileMenu(); }}>DEMO</a>
            <a href="#test" onClick={(e) => { e.preventDefault(); trackClick('mobile-nav-test'); scrollToSection('test'); closeMobileMenu(); }}>TEST</a>
            <a href="#trade" onClick={(e) => { e.preventDefault(); trackClick('mobile-nav-trade'); scrollToSection('trade'); closeMobileMenu(); }}>TRADE</a>
            <a href="#faq" onClick={(e) => { e.preventDefault(); trackClick('mobile-nav-faq'); scrollToSection('faq'); closeMobileMenu(); }}>FAQ</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); trackClick('mobile-nav-contact'); handleContactClick(e); closeMobileMenu(); }}>CONTACT US</a>
          </div>
          
          {/* Social media links - show on all screens */}
          <div className="mobile-social-links">
            <a
              href="https://www.instagram.com/cryptiq_startup/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link instagram"
              onClick={() => trackClick('social-instagram')}
              aria-label="Instagram"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href="https://x.com/Cryptiq_startUp"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link x"
              onClick={() => trackClick('social-twitter')}
              aria-label="X (Twitter)"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@cryptiq_startup"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link tiktok"
              onClick={() => trackClick('social-tiktok')}
              aria-label="TikTok"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
