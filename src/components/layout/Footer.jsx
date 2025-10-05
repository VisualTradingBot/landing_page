import "./footer.scss";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-left">
            <div className="brand">CRYPTIQ — Visual Trading Studio</div>
            <div className="contact-info">
              <div className="address">
                123 Trading Street, Finance District, NY 10001
              </div>
            </div>
          </div>
          <div className="footer-right">
            <div className="social-links">
              <a
                href="https://instagram.com/vtrade"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                Instagram
              </a>
              <a
                href="https://x.com/vtrade"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                X
              </a>
              <a
                href="https://tiktok.com/@vtrade"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                TikTok
              </a>
            </div>
            <a href="mailto:contact@cryptiq.com" className="email">
              contact@cryptiq.com
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
