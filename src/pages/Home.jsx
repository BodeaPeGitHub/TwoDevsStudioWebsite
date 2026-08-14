import { Link } from "react-router-dom";
import { useEffect } from "react";

const FOOTER_EMAIL = "twodevsstudios@gmail.com";

const focusAreas = [
  {
    title: "Product design",
    description:
      "We shape ideas into focused flows, clear screens, and usable product foundations."
  },
  {
    title: "Web & mobile apps",
    description:
      "We build React websites, Android apps, internal tools, dashboards, and launch-ready MVPs."
  },
  {
    title: "Practical automation",
    description:
      "We connect forms, data, workflows, AI helpers, and small systems that save repeated work."
  }
];

function Home() {
  useEffect(() => {
    document.title = "TwoDevsStudio · Two Devs Studio";
  }, []);

  return (
    <div className="site landing studio-page">
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
            <a href="#about">About</a>
            <a href="#work">Work</a>
            <a href="#process">How we work</a>
            <Link to="/hirediary">HireDiary</Link>
            <a href={`mailto:${FOOTER_EMAIL}`}>Contact</a>
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
              <span>3-person startup studio</span>
            </div>

            <p className="landing-goldline">
              Websites, apps, dashboards, automations.
            </p>

            <h1 className="landing-title">
              We build software{" "}
              <span className="landing-title-accent">that gets used.</span>
            </h1>

            <p className="landing-subtitle">
              TwoDevsStudio is a 3-person startup team for clients who need a
              practical product, internal tool, or automation shipped without
              agency overhead.
            </p>

            <div className="landing-actions">
              <a className="landing-button primary" href={`mailto:${FOOTER_EMAIL}`}>
                Start a conversation
              </a>
              <a className="landing-button ghost" href={`mailto:${FOOTER_EMAIL}`}>
                Tell us what you need
              </a>
            </div>
          </div>

          <div className="studio-hero-panel" aria-label="TwoDevsStudio overview">
            <div className="studio-panel-header">
              <span>Now building</span>
              <strong>Studio operating system</strong>
            </div>
            <div className="studio-preview-window">
              <div className="studio-preview-topbar">
                <span />
                <span />
                <span />
              </div>
              <div className="studio-preview-line">
                <span>Scope</span>
                <strong>MVP, website, dashboard, automation</strong>
              </div>
              <div className="studio-preview-line">
                <span>Stack</span>
                <strong>React, Android, APIs, Supabase</strong>
              </div>
              <div className="studio-preview-line">
                <span>Output</span>
                <strong>Working software, not slide decks</strong>
              </div>
            </div>
            <div className="studio-panel-grid">
              <div>
                <span className="studio-panel-number">3</span>
                <p>People focused on design, development, and delivery.</p>
              </div>
              <div>
                <span className="studio-panel-number">1</span>
                <p>Live product on Google Play: HireDiary.</p>
              </div>
            </div>
            <div className="studio-panel-work">
              <p>We can help with</p>
              <ul>
                <li>Startup MVPs</li>
                <li>Business websites</li>
                <li>Internal dashboards</li>
                <li>Workflow automation</li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-band" id="about">
          <div className="landing-container">
            <p className="section-eyebrow">About the studio</p>
            <h2>A small technical team for focused product builds.</h2>
            <p className="section-subtitle">
              We work best with founders and businesses that need a clear first
              version of a product, a better web presence, or a tool that removes
              repeated manual work.
            </p>

            <div className="studio-focus-grid">
              {focusAreas.map((item) => (
                <div key={item.title} className="studio-focus-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-band landing-band--alt" id="work">
          <div className="landing-container">
            <p className="section-eyebrow">Live product</p>
            <h2>Our first public product is live.</h2>
            <p className="section-subtitle">
              A job search tracker for Android, built to replace scattered
              spreadsheets, forgotten follow-ups, and messy notes.
            </p>

            <div className="product-card product-card--featured">
              <div className="product-card-media">
                <img src="/hirediary-logo.webp" alt="HireDiary" />
              </div>
              <div>
                <h3>HireDiary</h3>
                <p>
                  Track applications, capture job posts with AI from photo or
                  text, set reminders, view progress, and export your data when
                  you need it.
                </p>
                <div className="product-actions">
                  <Link className="landing-button primary" to="/hirediary">
                    View HireDiary
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
          </div>
        </section>

        <section className="landing-band" id="process">
          <div className="landing-container">
            <p className="section-eyebrow">How we work</p>
            <h2>Clear scope first. Then build.</h2>
            <p className="section-subtitle">
              Clients usually come to us with an idea, a manual workflow, or a
              product that needs a better shape. We turn that into a practical
              build plan and keep the work visible.
            </p>

            <ol className="landing-steps">
              <li className="landing-step-card">
                <p className="landing-step-index">01</p>
                <h3>Understand</h3>
                <p>We clarify the problem, users, constraints, and success target.</p>
              </li>
              <li className="landing-step-card">
                <p className="landing-step-index">02</p>
                <h3>Shape</h3>
                <p>We define the first useful version and avoid unnecessary scope.</p>
              </li>
              <li className="landing-step-card">
                <p className="landing-step-index">03</p>
                <h3>Build</h3>
                <p>We implement, test, launch, and improve based on real use.</p>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div>
            <p className="landing-footer-brand">TwoDevsStudio</p>
            <p className="landing-footer-muted">
              A small startup team building useful software.
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
