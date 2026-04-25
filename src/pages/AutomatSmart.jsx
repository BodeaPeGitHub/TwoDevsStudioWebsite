import { useEffect } from "react";
import { Link } from "react-router-dom";

const LANDING_URL = "https://twodevsstudio.com/smart-vending";
const CONTACT_EMAIL = "contact@twodevsstudio.com";
const FOOTER_EMAIL = "twodevsstudios@gmail.com";

const MAIL_SUBJECT_CALL = "Smart Vending — 20-min call";
const MAIL_BODY_CALL = `Hi! We'd like to book a 20-min call about Smart Vending.

Company:
Team size:
City:
Current badge/access system (if known):
Perk setup (company-paid / budgets / employee-paid):
Products you'd like:

Thanks!`;

const MAIL_SUBJECT_PILOT = "Smart Vending — Pilot Partner";
const MAIL_BODY_PILOT = `Hi! We'd like to become a Pilot Partner for Smart Vending.

Company:
Team size:
City:
Target start date:
Perk setup (company-paid / budgets / employee-paid):

Thanks!`;

function buildMailtoHref(subject, body) {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

function AutomatSmart() {
  useEffect(() => {
    document.title = "Smart Vending · Two Devs Studio";
  }, []);

  const mailtoCallHref = buildMailtoHref(MAIL_SUBJECT_CALL, MAIL_BODY_CALL);
  const mailtoPilotHref = buildMailtoHref(MAIL_SUBJECT_PILOT, MAIL_BODY_PILOT);
  const mailtoEmailHref = `mailto:${CONTACT_EMAIL}`;

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
            <span>Smart Vending</span>
          </Link>

          <div className="landing-nav-links">
            <a href="#why">Why</a>
            <a href="#for-hr">For HR</a>
            <a href="#pilot-partner">Pilot</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
          </div>

          <a className="landing-nav-cta" href="#contact">
            Book a 20-min call
          </a>
        </nav>

        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-badge" aria-label="Smart Vending">
              <span className="landing-badge-icon" aria-hidden="true">
                ✓
              </span>
              <span>No cash. No friction.</span>
            </div>

            <p className="landing-goldline">
              Your employee badge just became a benefit card.
            </p>

            <h1 className="landing-title">
              Smart office perks,{" "}
              <span className="landing-title-accent">made effortless.</span>
            </h1>

            <p className="landing-subtitle">
              Snacks, drinks and essentials available instantly through the
              employee badge your team already uses. No cash. No friction.
            </p>

            <div className="landing-actions">
              <a className="landing-button primary" href={mailtoCallHref}>
                Book a 20-min call
              </a>
              <a className="landing-button ghost" href="#pilot-partner">
                Become a Pilot Partner
              </a>
            </div>

          </div>

          <div className="landing-hero-media" aria-hidden="true">
            <div className="landing-hero-card smartvending-hero-card">
              <img
                className="landing-hero-illustration smartvending-hero-illustration"
                src="/automat-desc.png"
                alt=""
              />
            </div>
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-band landing-band--alt" id="for-hr">
          <div className="landing-container">
            <p className="section-eyebrow">Built for HR &amp; Office Managers</p>
            <h2>Full control without extra admin work.</h2>
            <p className="section-subtitle">
              Manage usage, budgets and access rules from one simple dashboard.
            </p>
          </div>

          <div className="landing-dashboard-block landing-dashboard-block--left">
            <div className="landing-dashboard-inner">
              <div className="landing-dashboard-copy">
                <h3 className="landing-dashboard-title">Dashboard overview</h3>
                <p className="landing-dashboard-subtitle">
                  A clear view of usage, budgets, and what people actually take —
                  in real time.
                </p>
              </div>
              <div className="landing-dashboard-media landing-dashboard-media--left">
                <img src="/overview.png" alt="Dashboard overview" />
              </div>
            </div>
          </div>

          <div className="landing-dashboard-block landing-dashboard-block--right">
            <div className="landing-dashboard-inner">
              <div className="landing-dashboard-copy">
                <h3 className="landing-dashboard-title">Rules &amp; access</h3>
                <p className="landing-dashboard-subtitle">
                  You can manage rules — or only log what’s happening.
                </p>
              </div>
              <div className="landing-dashboard-media landing-dashboard-media--right">
                <img src="/rules-and-access.png" alt="Rules & access overview" />
              </div>
            </div>
          </div>

          <div className="landing-container">
            <div className="tag-list" aria-label="Dashboard features">
              <span className="tag">Employee-level limits</span>
              <span className="tag">Department budgets</span>
              <span className="tag">Daily / monthly allowances</span>
              <span className="tag">Reports &amp; analytics</span>
              <span className="tag">Company policy rules</span>
              <span className="tag">Fast local support in Cluj-Napoca</span>
            </div>
          </div>
        </section>

        <section className="landing-band" id="why">
          <div className="landing-container">
            <p className="section-eyebrow">Why Smart Vending</p>
            <h2>A benefit employees actually use every day.</h2>
            <p className="section-subtitle">
              Forget generic perks nobody touches. Give your team something
              practical, immediate and appreciated daily.
            </p>

            <ol className="landing-steps">
              <li className="landing-step-card">
                <p className="landing-step-index">01</p>
                <h3>Instant Access</h3>
                <p>
                  Employees scan their existing badge and take what they need
                  in seconds.
                </p>
              </li>
              <li className="landing-step-card">
                <p className="landing-step-index">02</p>
                <h3>Better Workplace Experience</h3>
                <p>No more unnecessary store runs for snacks or drinks.</p>
              </li>
              <li className="landing-step-card">
                <p className="landing-step-index">03</p>
                <h3>Flexible Payments</h3>
                <p>
                  Company-paid, monthly budgets, or employee-paid directly
                  through badge balance.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="landing-band landing-band--alt" id="pilot-partner">
          <div className="landing-container">
            <p className="section-eyebrow">Pilot Partner Program</p>
            <h2>Help shape the future of workplace perks.</h2>
            <p className="section-subtitle">
              We’re looking for our first partner companies in Romania.
            </p>

            <div className="landing-info-grid">
              <div className="landing-info-card">
                <h3>Founder-level support</h3>
              </div>
              <div className="landing-info-card">
                <h3>Priority setup</h3>
              </div>
              <div className="landing-info-card">
                <h3>Direct feature input</h3>
              </div>
              <div className="landing-info-card">
                <h3>Preferential pricing</h3>
              </div>
            </div>

            <div className="landing-actions">
              <a className="landing-button primary" href={mailtoPilotHref}>
                Become a Pilot Partner
              </a>
              <a className="landing-button ghost" href={mailtoCallHref}>
                Book a 20-min call
              </a>
            </div>

            <p className="landing-footnote">
              Setup available first in Cluj-Napoca and surrounding areas.
            </p>
          </div>
        </section>

        <section className="landing-band landing-band--alt" id="faq">
          <div className="landing-container">
            <p className="section-eyebrow">FAQ</p>
            <h2>Quick answers</h2>
            <p className="section-subtitle">
              If you have a question not covered here, email us and we’ll reply
              quickly.
            </p>

            <details className="landing-faq">
              <summary>Do employees need a new card?</summary>
              <div className="landing-faq-body">
                <p>
                  No. Smart Vending works with the badge system they already
                  use.
                </p>
              </div>
            </details>

            <details className="landing-faq">
              <summary>Can we offer free monthly budgets?</summary>
              <div className="landing-faq-body">
                <p>Yes. You can set allowances by employee or department.</p>
              </div>
            </details>

            <details className="landing-faq">
              <summary>What products can we include?</summary>
              <div className="landing-faq-body">
                <p>We customize the machine based on your team’s needs.</p>
              </div>
            </details>
          </div>
        </section>

      </main>

      <footer className="landing-footer" id="contact">
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

export default AutomatSmart;
