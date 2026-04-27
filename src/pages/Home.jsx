import { Link } from "react-router-dom";
import { useEffect } from "react";

const FOOTER_EMAIL = "twodevsstudios@gmail.com";

function Home() {
  useEffect(() => {
    document.title = "TwoDevsStudio · Two Devs Studio";
  }, []);

  return (
    <div className="site landing">
      <header className="landing-hero">
        <nav className="landing-nav">
          <Link className="landing-brand" to="/">
            <img
              className="landing-brand-logo"
              src="/twodevsstudio-logo.png"
              alt="TwoDevsStudio logo"
            />
            <span>TwoDevsStudio</span>
          </Link>

          <div className="landing-nav-links">
            <a href="#products">Products</a>
            <a href="#about">About</a>
            <a href={`mailto:${FOOTER_EMAIL}`}>Contact</a>
            <Link to="/hirediary">HireDiary</Link>
            <Link to="/smart-vending">Smart Vending</Link>
          </div>

          <a className="landing-nav-cta" href={`mailto:${FOOTER_EMAIL}`}>
            Contact
          </a>
        </nav>

        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-badge" aria-label="Independent studio">
              <span className="landing-badge-icon" aria-hidden="true">
                ✓
              </span>
              <span>Independent app studio</span>
            </div>

            <p className="landing-goldline">
              Focused apps, strong UX, practical automation.
            </p>

            <h1 className="landing-title">
              Two-person studio,{" "}
              <span className="landing-title-accent">shipping software that lasts.</span>
            </h1>

            <p className="landing-subtitle">
              We build practical apps that respect your time — from consumer
              products to internal tools.
            </p>

            <div className="landing-actions">
              <Link className="landing-button primary" to="/hirediary">
                Visit HireDiary
              </Link>
              <a className="landing-button ghost" href={`mailto:${FOOTER_EMAIL}`}>
                Contact Us
              </a>
            </div>
          </div>

          <div className="landing-hero-media" aria-hidden="true">
            <div className="landing-hero-card home-hero-card">
              <img
                className="landing-hero-illustration home-hero-illustration"
                src="/twodevsstudio-photo.jpeg"
                alt=""
              />
            </div>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-band" id="products">
          <div className="landing-container">
            <p className="section-eyebrow">Our products</p>
            <h2>Products</h2>
            <p className="section-subtitle">
              Focused products built by a small team — from consumer apps to
              internal tools.
            </p>

            <div className="product-card">
              <div className="product-card-media">
                <img src="/hirediary-logo.webp" alt="HireDiary" />
              </div>
              <div>
                <h3>HireDiary</h3>
                <p>
                  Track applications, follow-ups, interviews, and offers in one
                  place. Export data, visualize progress, and keep momentum.
                </p>
                <div className="product-actions">
                  <Link className="landing-button primary" to="/hirediary">
                    Open HireDiary Page
                  </Link>
                  <a
                    className="landing-button ghost"
                    href="https://play.google.com/store/apps/details?id=com.twodevsstudio.hirediary"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Play
                  </a>
                </div>
              </div>
            </div>

            <div className="product-card">
              <div className="product-card-media">
                <img
                  className="product-card-logo product-card-logo--vending"
                  src="/smart-vending-logo.svg"
                  alt="Smart Vending"
                />
              </div>
              <div>
                <h3>Smart Vending</h3>
                <p>
                  Smart vending for employee perks: access products using the
                  existing employee badge, with limits and a real-time HR
                  dashboard.
                </p>
                <div className="product-actions">
                  <Link className="landing-button primary" to="/smart-vending">
                    Open Landing Page
                  </Link>
                  <a
                    className="landing-button ghost"
                    href="mailto:twodevsstudios@gmail.com?subject=Smart%20Vending"
                  >
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-band landing-band--alt" id="about">
          <div className="landing-container">
            <p className="section-eyebrow">About the studio</p>
            <h2>TwoDevsStudio</h2>
            <p className="section-subtitle">
              We build small, focused products with strong UX and clear value.
            </p>
            <div className="about-copy">
              <p>TwoDevsStudio is a two-person independent development team.</p>
              <p>We build practical apps with clean UX and useful automation.</p>
              <p>
                Our goal is to help people stay organized, ship faster, and keep
                momentum on what matters.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div>
            <p className="landing-footer-brand">TwoDevsStudio</p>
            <p className="landing-footer-muted">
              Focused apps built by a small team.
            </p>
          </div>

          <div>
            <p className="landing-footer-title">Contact</p>
            <p className="landing-footer-link">
              <a href={`mailto:${FOOTER_EMAIL}`}>{FOOTER_EMAIL}</a>
            </p>
          </div>

          <div>
            <p className="landing-footer-title">Location</p>
            <p className="landing-footer-muted">Europe (Remote)</p>
          </div>
        </div>

        <div className="landing-container landing-footer-bottom">
          <p>© {new Date().getFullYear()} TwoDevsStudio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
