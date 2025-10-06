import "./footer.scss";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-left">
            <div className="brand">CRYPTIQ — Visual Trading Studio</div>
            <div className="contact-info">
              <div className="address">Enschede, Netherlands</div>
            </div>
          </div>
          <div className="footer-right">
            <div className="social-links">
              <a
                href="https://www.instagram.com/cryptiq_startup/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                Instagram
              </a>
              <a
                href="https://x.com/Cryptiq_startUp"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                X
              </a>
              <a
                href="https://www.tiktok.com/@cryptiq_startup"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                TikTok
              </a>
            </div>
            <a href="mailto:contact@cryptiq.com" className="email">
              contact@cryptiq.trade
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="legal-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#cookies">Cookie Policy</a>
          </div>
          <div className="copyright">© 2024 CRYPTIQ. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
