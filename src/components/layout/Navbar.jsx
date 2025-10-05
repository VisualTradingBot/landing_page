import "./navbar.scss";

export default function Navbar() {
  return (
    <header className="nav-wrap">
      <div className="nav-inner">
        <div className="logo">M</div>
        <nav className="links">
          <a href="#build">BUILD</a>
          <a href="#trade">TRADE</a>
          <a href="#docs">DOCS</a>
        </nav>
      </div>
    </header>
  );
}
