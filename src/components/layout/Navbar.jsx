import { useState, useEffect } from "react";
import "./navbar.scss";

export default function Navbar() {
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

  return (
    <header className={`nav-wrap ${!isVisible ? 'collapsed' : ''}`}>
      <div className="nav-inner">
        <div className="logo">VTrade</div>
        <nav className="links">
          <a href="#build">BUILD</a>
          <a href="#test">TEST</a>
          <a href="#trade">TRADE</a>
          <a href="#faq">FAQ</a>
          <a href="#contact">CONTACT US</a>
        </nav>
      </div>
    </header>
  );
}
