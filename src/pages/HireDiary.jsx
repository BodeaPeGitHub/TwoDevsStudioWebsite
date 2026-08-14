import { useEffect } from "react";
import { Link } from "react-router-dom";

const FOOTER_EMAIL = "twodevsstudios@gmail.com";
const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.twodevsstudio.hirediary";

const featureCards = [
  {
    title: "Track Applications",
    description:
      "Keep every application, status change, and follow-up in one place.",
    icon: "clipboard"
  },
  {
    title: "Scan Job Posts",
    description:
      "Capture a job post and let AI extract the key details instantly.",
    icon: "scan"
  },
  {
    title: "Set Reminders",
    description: "Never miss a follow-up, interview, or application deadline.",
    icon: "bell"
  },
  {
    title: "Analytics",
    description: "Visualize your progress with charts and insights.",
    icon: "chart"
  },
  {
    title: "Export Data",
    description: "Export to CSV or PDF for sharing or backup.",
    icon: "download"
  },
  {
    title: "Clean UX",
    description: "Focused, distraction-free interface built for speed.",
    icon: "sparkle"
  }
];

function FeatureIcon({ name }) {
  switch (name) {
    case "clipboard":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 4h6a2 2 0 0 1 2 2v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a2 2 0 0 1 2-2zm0 4h6V6H9v2z"
            fill="currentColor"
          />
        </svg>
      );
    case "scan":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 8V6a2 2 0 0 1 2-2h2M20 8V6a2 2 0 0 0-2-2h-2M4 16v2a2 2 0 0 0 2 2h2M20 16v2a2 2 0 0 1-2 2h-2"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M7 12h10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 9a6 6 0 1 1 12 0v4l2 2H4l2-2V9z"
            fill="currentColor"
          />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0" fill="currentColor" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 19h16M8 16V9M12 16V6M16 16v-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "download":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 4v9m0 0 4-4m-4 4-4-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M5 19h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "sparkle":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return null;
  }
}

function HireDiary() {
  useEffect(() => {
    document.title = "HireDiary · Two Devs Studio";
  }, []);

  return (
    <div className="site landing product-page hirediary-page">
      <header className="landing-hero">
        <nav className="landing-nav">
          <Link className="landing-brand" to="/">
            <img
              className="landing-brand-logo"
              src="/hirediary-logo.webp"
              alt="HireDiary logo"
            />
            <span>HireDiary</span>
          </Link>

          <div className="landing-nav-links">
            <Link to="/">Studio</Link>
            <a href="#features">Features</a>
            <a href="#privacy">Privacy</a>
            <a href="#contact">Contact</a>
          </div>

          <a
            className="landing-nav-cta"
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noreferrer"
          >
            Google Play
          </a>
        </nav>

        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-badge" aria-label="Trusted by job seekers">
              <span className="landing-badge-icon" aria-hidden="true">
                ✓
              </span>
              <span>Live on Google Play</span>
            </div>

            <p className="landing-goldline">
              Track applications. Follow up on time. Stay organized.
            </p>

            <h1 className="landing-title">
              Organize your path to the{" "}
              <span className="landing-title-accent">perfect job.</span>
            </h1>

            <p className="landing-subtitle">
              HireDiary helps job seekers organize applications, reminders,
              interview stages, notes, and exports without turning the job
              search into another spreadsheet.
            </p>

            <div className="landing-actions">
              <a
                className="landing-button primary"
                href={GOOGLE_PLAY_URL}
                target="_blank"
                rel="noreferrer"
              >
                Get on Google Play
              </a>
              <a className="landing-button ghost" href="#features">
                Explore Features
              </a>
            </div>
          </div>

          <div className="landing-hero-media" aria-hidden="true">
            <div className="landing-hero-card hirediary-hero-card">
              <img
                className="landing-hero-illustration hirediary-hero-illustration"
                src="/hero-graphic.png"
                alt=""
              />
            </div>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-band" id="features">
          <div className="landing-container">
            <p className="section-eyebrow">Simplify your job search</p>
            <h2>Everything you need in one place</h2>
            <p className="section-subtitle">
              Track progress, capture job posts, and keep your next steps clear.
            </p>
            <div className="feature-grid">
              {featureCards.map((item) => (
                <div key={item.title} className="feature-card">
                  <div className="feature-icon">
                    <FeatureIcon name={item.icon} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-band landing-band--alt" id="privacy">
          <div className="landing-container">
            <p className="section-eyebrow">Built for focus</p>
            <h2>Your job search data stays simple and portable.</h2>
            <p className="section-subtitle">
              HireDiary is designed around practical control: add opportunities
              quickly, keep your next steps visible, and export your data when
              you need a backup or report.
            </p>

            <div className="landing-info-grid">
              <div className="landing-info-card">
                <h3>No account required</h3>
                <p>Use the app without creating another login.</p>
              </div>
              <div className="landing-info-card">
                <h3>Private by design</h3>
                <p>Your application data stays on your device.</p>
              </div>
              <div className="landing-info-card">
                <h3>Export anytime</h3>
                <p>Download your applications as CSV or PDF.</p>
              </div>
              <div className="landing-info-card">
                <h3>Fast entry</h3>
                <p>Add jobs manually or extract details from photos and text.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-band" id="about">
          <div className="landing-container">
            <p className="section-eyebrow">Made by TwoDevsStudio</p>
            <h2>A small startup team building practical products.</h2>
            <p className="section-subtitle">
              HireDiary is our first public Android app. We built it because
              job hunting becomes hard to manage once applications, interviews,
              contacts, reminders, and notes spread across too many places.
            </p>
            <div className="landing-actions">
              <Link className="landing-button ghost" to="/">
                About the studio
              </Link>
              <a className="landing-button primary" href={GOOGLE_PLAY_URL} target="_blank" rel="noreferrer">
                Open Google Play
              </a>
            </div>
          </div>
        </section>

        <section className="landing-band landing-band--alt" id="contact">
          <div className="landing-container">
            <p className="section-eyebrow">Contact</p>
            <h2>Questions, feedback, or support?</h2>
            <p className="section-subtitle">
              Email us and we will reply directly.
            </p>
            <div className="landing-actions">
              <a className="landing-button primary" href={`mailto:${FOOTER_EMAIL}?subject=HireDiary%20feedback`}>
                Email TwoDevsStudio
              </a>
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

export default HireDiary;
