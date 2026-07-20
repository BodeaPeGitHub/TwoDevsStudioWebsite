import { useEffect } from "react";
import { Link } from "react-router-dom";

const CONTACT_EMAIL = "twodevsstudios@gmail.com";

function Efti() {
  useEffect(() => {
    document.title = "eFTI Ready Demo · Two Devs Studio";
  }, []);

  return (
    <div className="site landing demo-page efti-page">
      <header className="landing-hero demo-hero efti-hero">
        <nav className="landing-nav">
          <Link className="landing-brand" to="/">
            <img
              className="landing-brand-logo"
              src="/twodevsstudio-logo.png"
              alt="TwoDevsStudio logo"
            />
            <span>TwoDevsStudio eFTI</span>
          </Link>

          <div className="landing-nav-links">
            <a href="#conversion">Conversion</a>
            <a href="#ready">eFTI ready</a>
            <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
          </div>

          <a className="landing-nav-cta" href={`mailto:${CONTACT_EMAIL}?subject=eFTI%20ready%20demo`}>
            Request pilot
          </a>
        </nav>

        <div className="landing-hero-grid demo-hero-grid efti-hero-grid">
          <div className="landing-hero-copy">
            <div className="landing-badge" aria-label="eFTI readiness demo">
              <span className="landing-badge-icon" aria-hidden="true">✓</span>
              <span>Transport documents → eFTI ready pack</span>
            </div>

            <p className="landing-goldline">Demo concept for freight, logistics, and dispatch teams.</p>

            <h1 className="landing-title">
              Turn messy shipment paperwork into an
              <span className="landing-title-accent"> eFTI-ready data package.</span>
            </h1>

            <p className="landing-subtitle">
              Upload CMR, delivery note, invoice, or photos. The assistant extracts the shipment data,
              flags missing fields, and prepares a clean digital record that can be shared with platforms,
              authorities, or internal systems.
            </p>

            <div className="landing-actions">
              <a className="landing-button primary" href="#demo-card">View conversion demo</a>
              <a className="landing-button ghost" href={`mailto:${CONTACT_EMAIL}?subject=eFTI%20pilot%20request`}>
                Pilot request
              </a>
            </div>
          </div>

          <div className="efti-converter" id="demo-card" aria-label="eFTI ready conversion preview">
            <div className="efti-panel efti-panel--source">
              <div className="efti-panel-header">
                <span>Input documents</span>
                <strong>Raw</strong>
              </div>
              <div className="efti-doc-stack">
                <div className="efti-doc-card">
                  <span>CMR scan</span>
                  <strong>RO → DE · Pallets</strong>
                </div>
                <div className="efti-doc-card">
                  <span>Invoice PDF</span>
                  <strong>Weight, value, shipper</strong>
                </div>
                <div className="efti-doc-card muted">
                  <span>Driver note</span>
                  <strong>Missing consignee VAT</strong>
                </div>
              </div>
            </div>

            <div className="efti-arrow" aria-hidden="true">→</div>

            <div className="efti-panel efti-panel--ready">
              <div className="efti-panel-header">
                <span>Output</span>
                <strong>eFTI ready</strong>
              </div>
              <ul className="efti-checklist">
                <li>Structured shipment dataset</li>
                <li>Mandatory field validation</li>
                <li>Audit trail + original files</li>
                <li>API/export package prepared</li>
              </ul>
              <div className="efti-score">
                <span className="demo-dot" /> 92% ready · 1 field needs review
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="landing-main demo-main efti-main">
        <section className="landing-band" id="conversion">
          <div className="landing-container">
            <p className="section-eyebrow">Conversion flow</p>
            <h2>From unstructured freight docs to a clean compliance package.</h2>
            <p className="section-subtitle">
              The demo focuses on the practical job: reduce manual data entry, catch compliance gaps,
              and make every shipment easier to prove, share, and archive.
            </p>

            <ol className="landing-steps demo-steps efti-steps">
              <li className="landing-step-card">
                <p className="landing-step-index">01</p>
                <h3>Ingest documents</h3>
                <p>Upload scans, PDFs, photos, emails, or dispatch notes for the shipment.</p>
              </li>
              <li className="landing-step-card">
                <p className="landing-step-index">02</p>
                <h3>Extract + map</h3>
                <p>Pull out shipper, consignee, route, goods, weight, IDs, dates, and references.</p>
              </li>
              <li className="landing-step-card">
                <p className="landing-step-index">03</p>
                <h3>Validate readiness</h3>
                <p>Flag missing or inconsistent fields before the shipment record is exported.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="landing-band landing-band--alt" id="ready">
          <div className="landing-container demo-metrics-grid">
            <div>
              <p className="section-eyebrow">Pilot target</p>
              <h2>Success metric: hours saved per shipment file.</h2>
              <p className="section-subtitle">
                Start with one freight lane and measure document processing time, missing-field rate,
                and how often the final pack passes review without rework.
              </p>
            </div>
            <div className="demo-metric-card">
              <span>2 weeks</span>
              <strong>pilot</strong>
              <p>Convert 50 real shipment folders and compare manual vs assisted processing.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Efti;
