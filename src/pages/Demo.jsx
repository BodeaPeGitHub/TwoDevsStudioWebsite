import { useEffect } from "react";
import { Link } from "react-router-dom";

const CONTACT_EMAIL = "twodevsstudios@gmail.com";

function Demo() {
  useEffect(() => {
    document.title = "Demo · Two Devs Studio";
  }, []);

  return (
    <div className="site landing demo-page">
      <header className="landing-hero demo-hero">
        <nav className="landing-nav">
          <Link className="landing-brand" to="/">
            <img
              className="landing-brand-logo"
              src="/twodevsstudio-logo.png"
              alt="TwoDevsStudio logo"
            />
            <span>TwoDevsStudio Demo</span>
          </Link>

          <div className="landing-nav-links">
            <a href="#flow">Flow</a>
            <a href="#metrics">Metrics</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
          </div>

          <a className="landing-nav-cta" href={`mailto:${CONTACT_EMAIL}?subject=Demo%20feedback`}>
            Send feedback
          </a>
        </nav>

        <div className="landing-hero-grid demo-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-badge" aria-label="Prototype demo">
              <span className="landing-badge-icon" aria-hidden="true">✓</span>
              <span>Short interactive concept</span>
            </div>

            <p className="landing-goldline">AI receptionist concept for local service businesses.</p>

            <h1 className="landing-title">
              A missed call becomes a booked appointment,
              <span className="landing-title-accent"> in under one minute.</span>
            </h1>

            <p className="landing-subtitle">
              This demo shows how a small clinic, salon, or repair shop could capture calls,
              answer common questions, and confirm bookings automatically.
            </p>

            <div className="landing-actions">
              <a className="landing-button primary" href="#demo-card">View demo</a>
              <a className="landing-button ghost" href={`mailto:${CONTACT_EMAIL}?subject=AI%20Receptionist%20pilot`}>
                Pilot request
              </a>
            </div>
          </div>

          <div className="demo-phone-wrap" id="demo-card" aria-label="AI receptionist demo preview">
            <div className="demo-phone">
              <div className="demo-phone-top">
                <span>Incoming call</span>
                <strong>+40 7xx xxx xxx</strong>
              </div>
              <div className="demo-chat">
                <div className="demo-bubble customer">Bună, aveți loc azi pentru un consult?</div>
                <div className="demo-bubble assistant">Da. Am liber la 16:30 sau 18:00. Pentru ce serviciu doriți programarea?</div>
                <div className="demo-bubble customer">Consultație rapidă, prefer 18:00.</div>
                <div className="demo-bubble assistant">Perfect. Am rezervat 18:00 și v-am trimis confirmarea prin SMS.</div>
              </div>
              <div className="demo-status">
                <span className="demo-dot" /> Booking confirmed · synced to calendar
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="landing-main demo-main">
        <section className="landing-band" id="flow">
          <div className="landing-container">
            <p className="section-eyebrow">Demo flow</p>
            <h2>What the prototype does</h2>
            <p className="section-subtitle">
              A lightweight preview of the core value: fewer missed leads, faster answers,
              and clean handoff to the business owner.
            </p>

            <ol className="landing-steps demo-steps">
              <li className="landing-step-card">
                <p className="landing-step-index">01</p>
                <h3>Answers instantly</h3>
                <p>Handles basic availability, pricing, address, and service questions.</p>
              </li>
              <li className="landing-step-card">
                <p className="landing-step-index">02</p>
                <h3>Books or qualifies</h3>
                <p>Collects name, need, preferred time, and urgency before sending a summary.</p>
              </li>
              <li className="landing-step-card">
                <p className="landing-step-index">03</p>
                <h3>Hands off safely</h3>
                <p>Escalates edge cases to a human and keeps a full transcript for review.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="landing-band landing-band--alt" id="metrics">
          <div className="landing-container demo-metrics-grid">
            <div>
              <p className="section-eyebrow">Pilot target</p>
              <h2>Success metric: recovered revenue from missed calls.</h2>
              <p className="section-subtitle">
                The pilot should prove one thing: does the receptionist recover enough missed
                opportunities to pay for itself?
              </p>
            </div>
            <div className="demo-metric-card">
              <span>7 days</span>
              <strong>small pilot</strong>
              <p>Track missed calls answered, bookings created, and owner time saved.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Demo;
