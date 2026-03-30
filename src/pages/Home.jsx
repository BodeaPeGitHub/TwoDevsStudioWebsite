import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="site">
      <header className="hero">
        <nav className="nav">
          <div className="brand">
            <img
              className="brand-logo"
              src="/twodevsstudio-logo.png"
              alt="TwoDevsStudio logo"
            />
            <span>TwoDevsStudio</span>
          </div>
          <div className="nav-links">
            <a href="#products">Products</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <Link className="nav-cta" to="/hirediary">
              HireDiary
            </Link>
          </div>
        </nav>

        <div className="hero-content single">
          <div className="hero-copy">
            <p className="eyebrow">Independent app studio</p>
            <h1>TwoDevsStudio builds focused apps that respect your time.</h1>
            <p className="subtitle">
              We are a two-person team obsessed with practical software. Our
              flagship product is HireDiary, a job search companion for tracking
              applications, interviews, and follow-ups.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/hirediary">
                Visit HireDiary
              </Link>
              <a className="button ghost" href="#contact">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="section" id="products">
          <p className="section-eyebrow">Our product</p>
          <h2>HireDiary</h2>
          <p className="section-subtitle">
            A modern Android job application tracker with AI-assisted job post
            capture and reminders.
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
                <Link className="button primary" to="/hirediary">
                  Open HireDiary Page
                </Link>
                <a
                  className="button ghost"
                  href="https://play.google.com/store/apps/details?id=com.twodevsstudio.hirediary"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google Play
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="about">
          <p className="section-eyebrow">About the studio</p>
          <h2>TwoDevsStudio</h2>
          <p className="section-subtitle">
            We build small, focused products with strong UX and clear value.
          </p>
          <div className="about-grid">
            <img
              className="studio-logo"
              src="/twodevsstudio-photo.jpeg"
              alt="TwoDevsStudio team photo"
            />
            <div>
              <p>TwoDevsStudio is a two-person independent development team.</p>
              <p>We build practical apps with clean UX and useful automation.</p>
              <p>
                Our goal is to help people stay organized, ship faster, and keep
                momentum on what matters.
              </p>
            </div>
          </div>
        </section>

        <section className="section" id="contact">
          <div className="contact-wrap">
            <div className="contact-info">
              <p className="section-eyebrow">Get in touch</p>
              <h2>Contact TwoDevsStudio</h2>
              <p>
                Tell us what you need help with or what you would like us to
                build next.
              </p>
              <div className="contact-details">
                <p className="contact-line">twodevsstudios@gmail.com</p>
                <p className="contact-line">Europe (Remote)</p>
              </div>
            </div>
            <div className="contact-form-card">
              <p>
                Prefer a product-specific contact form? Visit the HireDiary
                page.
              </p>
              <Link className="button primary" to="/hirediary#contact">
                Go to HireDiary Contact
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} TwoDevsStudio. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Home;
