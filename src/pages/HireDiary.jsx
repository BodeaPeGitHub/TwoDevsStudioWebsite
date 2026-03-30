import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

const team = [
  "TwoDevsStudio is a two-person independent development team.",
  "We build practical apps with clean UX and useful automation.",
  "HireDiary focuses on helping people stay organized during job search."
];

const stats = [
  { label: "Passionate Devs", value: "2" },
  { label: "Independent", value: "100%" },
  { label: "Apps Built", value: "12+" }
];

const CONTACT_DEFAULTS = {
  name: "",
  email: "",
  type: "Feature request",
  message: ""
};

const FEATURE_DEFAULTS = {
  title: "",
  description: ""
};

function getOrCreateVoterKey() {
  try {
    const existing = localStorage.getItem("hirediary_voter_key");
    if (existing) return existing;

    const generated = crypto.randomUUID();
    localStorage.setItem("hirediary_voter_key", generated);
    return generated;
  } catch {
    return "anonymous-voter";
  }
}

function normalizeErrorMessage(message) {
  if (!message) return "Unexpected error. Please try again.";
  if (message.toLowerCase().includes("relation")) {
    return "Database tables are not ready yet. Run the SQL setup script first.";
  }
  return message;
}

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

function ContactIcon({ name }) {
  if (name === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2 8 5 8-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4a6 6 0 0 1 6 6c0 4-6 10-6 10S6 14 6 10a6 6 0 0 1 6-6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="10" r="2.5" fill="currentColor" />
    </svg>
  );
}

function HireDiary() {
  const [contactForm, setContactForm] = useState(CONTACT_DEFAULTS);
  const [contactStatus, setContactStatus] = useState({
    loading: false,
    success: "",
    error: ""
  });
  const [featureForm, setFeatureForm] = useState(FEATURE_DEFAULTS);
  const [featureRequests, setFeatureRequests] = useState([]);
  const [featureListStatus, setFeatureListStatus] = useState({
    loading: true,
    error: ""
  });
  const [featureActionStatus, setFeatureActionStatus] = useState({
    loading: false,
    success: "",
    error: "",
    votingId: null
  });
  const [showStudioLogo, setShowStudioLogo] = useState(true);

  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  const loadFeatureRequests = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setFeatureListStatus({
        loading: false,
        error: "Supabase env vars are missing."
      });
      return;
    }

    setFeatureListStatus({ loading: true, error: "" });
    const { data, error } = await supabase
      .from("feature_requests")
      .select("id, title, description, status, votes, created_at")
      .in("status", ["planned", "in_progress", "done"])
      .order("votes", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      setFeatureListStatus({
        loading: false,
        error: normalizeErrorMessage(error.message)
      });
      return;
    }

    setFeatureRequests(data ?? []);
    setFeatureListStatus({ loading: false, error: "" });
  };

  useEffect(() => {
    loadFeatureRequests();
  }, []);

  const handleContactChange = (event) => {
    const { name, value } = event.target;
    setContactForm((current) => ({ ...current, [name]: value }));
  };

  const handleFeatureChange = (event) => {
    const { name, value } = event.target;
    setFeatureForm((current) => ({ ...current, [name]: value }));
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setContactStatus({
        loading: false,
        success: "",
        error: "Supabase env vars are missing."
      });
      return;
    }

    setContactStatus({ loading: true, success: "", error: "" });

    const payload = {
      name: contactForm.name.trim() || null,
      email: contactForm.email.trim() || null,
      type: contactForm.type,
      message: contactForm.message.trim()
    };

    const { error } = await supabase.from("contact_messages").insert(payload);

    if (error) {
      setContactStatus({
        loading: false,
        success: "",
        error: normalizeErrorMessage(error.message)
      });
      return;
    }

    setContactForm(CONTACT_DEFAULTS);
    setContactStatus({
      loading: false,
      success: "Message sent. Thank you for your feedback.",
      error: ""
    });
  };

  const handleFeatureSubmit = async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setFeatureActionStatus((current) => ({
        ...current,
        loading: false,
        success: "",
        error: "Supabase env vars are missing."
      }));
      return;
    }

    setFeatureActionStatus((current) => ({
      ...current,
      loading: true,
      success: "",
      error: ""
    }));

    const payload = {
      title: featureForm.title.trim(),
      description: featureForm.description.trim() || null,
      status: "under_review"
    };

    const { error } = await supabase.from("feature_requests").insert(payload);

    if (error) {
      setFeatureActionStatus((current) => ({
        ...current,
        loading: false,
        success: "",
        error: normalizeErrorMessage(error.message)
      }));
      return;
    }

    setFeatureForm(FEATURE_DEFAULTS);
    setFeatureActionStatus((current) => ({
      ...current,
      loading: false,
      success: "Thanks! We will review this before publishing.",
      error: ""
    }));
    loadFeatureRequests();
  };

  const handleVote = async (featureId) => {
    if (!isSupabaseConfigured || !supabase) {
      setFeatureActionStatus((current) => ({
        ...current,
        loading: false,
        success: "",
        error: "Supabase env vars are missing."
      }));
      return;
    }

    setFeatureActionStatus((current) => ({
      ...current,
      votingId: featureId,
      error: "",
      success: ""
    }));

    const { error } = await supabase.rpc("cast_feature_vote", {
      feature_id: featureId,
      voter_key: getOrCreateVoterKey()
    });

    if (error) {
      const isDuplicateVote =
        error.message?.toLowerCase().includes("duplicate") ||
        error.message?.toLowerCase().includes("vote");

      setFeatureActionStatus((current) => ({
        ...current,
        votingId: null,
        success: "",
        error: isDuplicateVote
          ? "You already voted for this feature."
          : normalizeErrorMessage(error.message)
      }));
      return;
    }

    setFeatureActionStatus((current) => ({
      ...current,
      votingId: null,
      success: "Vote registered.",
      error: ""
    }));
    loadFeatureRequests();
  };

  return (
    <div className="site">
      <header className="hero">
        <nav className="nav">
          <div className="brand">
            <img
              className="brand-logo"
              src="/hirediary-logo.webp"
              alt="HireDiary logo"
            />
            <span>HireDiary</span>
          </div>
          <div className="nav-links">
            <Link to="/">Studio</Link>
            <a href="#features">Features</a>
            <a href="#vote">Vote</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <a
              className="nav-cta"
              href="https://play.google.com/store/apps/details?id=com.twodevsstudio.hirediary"
              target="_blank"
              rel="noreferrer"
            >
              Google Play
            </a>
          </div>
        </nav>

        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow">Trusted by job seekers</p>
            <h1>Organize your path to the perfect job.</h1>
            <p className="subtitle">
              HireDiary is a simple way to track job applications, follow-ups,
              and interview progress. No more messy spreadsheets.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#features">
                Explore Features
              </a>
              <a
                className="button ghost"
                href="https://play.google.com/store/apps/details?id=com.twodevsstudio.hirediary"
                target="_blank"
                rel="noreferrer"
              >
                Get on Google Play
              </a>
            </div>
          </div>
          <div className="hero-image-wrap">
            <img src="/hero-graphic.png" alt="HireDiary feature preview" />
          </div>
        </div>
      </header>

      <main>
        <section className="section" id="features">
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
        </section>

        <section className="section" id="vote">
          <div className="split">
            <div>
              <p className="section-eyebrow">Shape the future</p>
              <h2>Vote on what we build next</h2>
              <p className="section-subtitle">
                Suggest a feature and vote for existing requests.
              </p>
              {!isSupabaseConfigured && (
                <p className="alert error">
                  Configure Supabase in `.env.local` before using this section.
                </p>
              )}
              <form className="contact-form" onSubmit={handleFeatureSubmit}>
                <label>
                  Feature title
                  <input
                    name="title"
                    type="text"
                    value={featureForm.title}
                    onChange={handleFeatureChange}
                    placeholder="Example: Interview prep checklist"
                    required
                  />
                </label>

                <label>
                  Details (optional)
                  <textarea
                    name="description"
                    rows="4"
                    value={featureForm.description}
                    onChange={handleFeatureChange}
                    placeholder="What should this feature do?"
                  />
                </label>

                <button
                  type="submit"
                  disabled={featureActionStatus.loading || !isSupabaseConfigured}
                >
                  {featureActionStatus.loading
                    ? "Sending..."
                    : "Submit Suggestion"}
                </button>
              </form>

              {featureActionStatus.success && (
                <p className="alert success">{featureActionStatus.success}</p>
              )}
              {featureActionStatus.error && (
                <p className="alert error">{featureActionStatus.error}</p>
              )}
            </div>
            <div>
              {featureListStatus.loading && <p>Loading feature requests...</p>}
              {!featureListStatus.loading && featureListStatus.error && (
                <p className="alert error">{featureListStatus.error}</p>
              )}

              {!featureListStatus.loading &&
                !featureListStatus.error &&
                featureRequests.length === 0 && (
                  <p>
                    No approved feature requests yet. Be the first to add one.
                  </p>
                )}

              {!featureListStatus.loading &&
                !featureListStatus.error &&
                featureRequests.length > 0 && (
                  <ul className="feature-list">
                    {featureRequests.map((item) => (
                      <li key={item.id} className="feature-list-item">
                        <div className="feature-content">
                          <h3>{item.title}</h3>
                          {item.description && <p>{item.description}</p>}
                          <p className="feature-meta">
                            Status:{" "}
                            <span className="feature-status">
                              {(item.status || "planned").replaceAll("_", " ")}
                            </span>{" "}
                            | Votes: {item.votes ?? 0}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleVote(item.id)}
                          disabled={
                            featureActionStatus.votingId === item.id ||
                            !isSupabaseConfigured
                          }
                        >
                          {featureActionStatus.votingId === item.id
                            ? "Voting..."
                            : "Upvote"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              {!featureListStatus.loading && !featureListStatus.error && (
                <p className="section-subtitle">
                  Only approved suggestions are listed here.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="section" id="about">
          <p className="section-eyebrow">The team behind the app</p>
          <h2>Meet TwoDevsStudio</h2>
          <p className="section-subtitle">
            We are a two-person independent studio focused on practical,
            intuitive apps.
          </p>
          <div className="about-grid">
            {showStudioLogo && (
              <img
                className="studio-logo"
                src="/twodevsstudio.png"
                alt="TwoDevsStudio team artwork"
                loading="lazy"
                onError={() => setShowStudioLogo(false)}
              />
            )}
            <div>
              {team.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <div className="stats">
                {stats.map((item) => (
                  <div key={item.label} className="stat">
                    <p className="stat-value">{item.value}</p>
                    <p className="stat-label">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="contact">
          <div className="contact-wrap">
            <div className="contact-info">
              <p className="section-eyebrow">Get in touch</p>
              <h2>Contact TwoDevsStudio</h2>
              <p>
                Share bug reports, feature ideas, or feedback and we will review
                it for the next versions of HireDiary.
              </p>
              <div className="contact-details">
                <p className="contact-line">
                  <span className="contact-icon">
                    <ContactIcon name="mail" />
                  </span>
                  twodevsstudios@gmail.com
                </p>
                <p className="contact-line">
                  <span className="contact-icon">
                    <ContactIcon name="location" />
                  </span>
                  Europe (Remote)
                </p>
              </div>
            </div>
            <div className="contact-form-card">
              <form className="contact-form" onSubmit={handleContactSubmit}>
                <label>
                  Name
                  <input
                    name="name"
                    type="text"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    placeholder="Your name"
                  />
                </label>

                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    placeholder="your@email.com"
                  />
                </label>

                <label>
                  Message type
                  <select
                    name="type"
                    value={contactForm.type}
                    onChange={handleContactChange}
                  >
                    <option>Feature request</option>
                    <option>Bug report</option>
                    <option>General feedback</option>
                  </select>
                </label>

                <label>
                  Message
                  <textarea
                    name="message"
                    rows="6"
                    value={contactForm.message}
                    onChange={handleContactChange}
                    placeholder="Tell us what feature we should build next..."
                    required
                  />
                </label>

                <button
                  type="submit"
                  disabled={contactStatus.loading || !isSupabaseConfigured}
                >
                  {contactStatus.loading ? "Sending..." : "Send Message"}
                </button>
              </form>
              {contactStatus.success && (
                <p className="alert success">{contactStatus.success}</p>
              )}
              {contactStatus.error && (
                <p className="alert error">{contactStatus.error}</p>
              )}
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

export default HireDiary;
