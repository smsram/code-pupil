"use client";

import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import BackgroundAnimation from "./components/BackgroundAnimation";

const inter = Inter({ subsets: ["latin"], display: "swap", weight: ["400", "600", "700", "800", "900"] });
const jetmono = JetBrains_Mono({ subsets: ["latin"], display: "swap", weight: ["400", "600", "700"] });

export default function Page() {
  return (
    <main className={`${inter.className} lp-root`}>
      {/* Background animation behind everything */}
      <BackgroundAnimation />

      {/* Top nav */}
      <header className="lp-nav">
        <div className="lp-wrap">
          <div className="lp-brand">
            <div className="lp-logo">CP</div>
            <div className="lp-brand-text">
              <div className="lp-title">CodePupil</div>
              <div className="lp-sub">Assessment Platform</div>
            </div>
          </div>
          <div className="lp-actions">
            <Link href="/auth/student/">
              <button className="lp-btn ghost">Student Login</button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero" id="top">
        <span className="lp-badge">
          <i className="lp-dot" />
          Live-ready platform
        </span>

        <h1 className="lp-hero-title">
          Conduct coding tests with confidence<span className="lp-accent">.</span>
        </h1>
        <p className="lp-hero-sub">
          Live announcements, plagiarism checks, auto-grading, and rich analytics — all in one place.
        </p>

        <div className="lp-hero-cta">
          <Link href="/auth/student/">
            <button className="lp-btn primary">
              Start as Student
              <svg viewBox="0 0 24 24" className="lp-icon">
                <path
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14M12 5l7 7-7 7"
                />
              </svg>
            </button>
          </Link>
          <a href="#features" className="lp-btn secondary">Explore Features</a>
        </div>

        {/* Soft marquee row */}
        <div className="lp-marquee">
          <div className="lp-marquee-track">
            {["Active Batches", "Tests Conducted", "Auto‑graded", "Uptime 99.9%", "IST Time"].map((t, i) => (
              <div className="lp-pill" key={i}>
                <span className="lp-pill-dot" />
                {t}
              </div>
            ))}
            {["Active Batches", "Tests Conducted", "Auto‑graded", "Uptime 99.9%", "IST Time"].map((t, i) => (
              <div className="lp-pill" key={`dup-${i}`}>
                <span className="lp-pill-dot" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      <style jsx global>{`
        :root {
          /* Primary */
          --student-primary-cyan: #06b6d4;
          --student-primary-blue: #3b82f6;
          --student-primary-purple: #8b5cf6;
          --student-primary-green: #22c55e;

          /* Status */
          --student-success-color: #22c55e;
          --student-warning-color: #f59e0b;
          --student-danger-color: #ef4444;

          /* Background */
          --student-bg-primary: #0b1220;
          --student-bg-secondary: #0f172a;

          /* Text */
          --student-text-primary: #e2e8f0;
          --student-text-muted: #94a3b8;

          /* Border & ring */
          --student-border-focus: rgba(6, 182, 212, 0.45);
          --student-ring: rgba(6, 182, 212, 0.28);

          /* Shadows */
          --student-shadow-neon: 0 0 24px rgba(6, 182, 212, 0.4);

          /* Fonts */
          --student-font-mono: ${jetmono.style.fontFamily}, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
          --student-font-sans: ${inter.style.fontFamily}, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Inter, Arial;
        }

        html, body { height: 100%; }
        body {
          margin: 0;
          background: radial-gradient(1200px 800px at 50% 0%, rgba(6, 182, 212, 0.06), transparent 50%), var(--student-bg-primary);
          color: var(--student-text-primary);
          font-family: var(--student-font-sans);
        }
      `}</style>

      <style jsx>{`
        .lp-root {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          z-index: 1;
        }

        /* Nav */
        .lp-nav {
          position: sticky;
          top: 0;
          z-index: 5;
          background: linear-gradient(180deg, rgba(2, 6, 23, 0.75), rgba(2, 6, 23, 0.35), transparent);
          backdrop-filter: blur(10px);
        }
        .lp-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .lp-brand { display: flex; gap: 12px; align-items: center; }
        .lp-logo {
          width: 40px; height: 40px; border-radius: 12px;
          display: grid; place-items: center;
          font-weight: 900; letter-spacing: 0.5px; color: #00181d;
          background: linear-gradient(135deg, var(--student-primary-cyan), #34d399);
          box-shadow: 0 12px 30px rgba(6, 182, 212, 0.35);
        }
        .lp-logo.small { width: 34px; height: 34px; border-radius: 10px; font-size: 12px; }
        .lp-brand-text .lp-title { font-weight: 800; font-size: 15px; letter-spacing: 0.2px; }
        .lp-brand-text .lp-sub { font-size: 12px; color: var(--student-text-muted); }

        .lp-actions .lp-btn.ghost {
          background: rgba(6, 182, 212, 0.12);
          border: 1px solid var(--student-ring);
          color: var(--student-text-primary);
        }

        /* Hero */
        .lp-hero {
          position: relative;
          max-width: 1100px;
          margin: 24px auto 0;
          padding: 24px 20px 0;
          text-align: center;
        }
        .lp-badge {
          display: inline-flex; gap: 8px; align-items: center;
          padding: 8px 12px; border-radius: 999px;
          background: rgba(6, 182, 212, 0.12);
          border: 1px solid var(--student-ring);
          color: var(--student-text-muted);
          font-size: 12px;
        }
        .lp-dot {
          width: 8px; height: 8px; border-radius: 999px; background: var(--student-primary-cyan);
          position: relative; display: inline-block;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.6);
        }
        .lp-dot::after {
          content: ""; position: absolute; inset: -6px; border-radius: 999px;
          border: 2px solid rgba(6, 182, 212, 0.45); animation: pulse 1.6s ease-out infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .lp-hero-title {
          margin: 16px auto 10px;
          font-weight: 900; letter-spacing: 0.3px; line-height: 1.1;
          font-size: clamp(34px, 4.3vw, 58px);
          max-width: 900px;
          text-shadow: 0 6px 40px rgba(0, 0, 0, 0.35);
        }
        .lp-accent {
          background: linear-gradient(135deg, var(--student-primary-cyan), var(--student-primary-purple));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .lp-hero-sub {
          margin: 6px auto 18px; max-width: 780px;
          color: var(--student-text-muted); font-size: clamp(14px, 1.7vw, 18px);
        }

        .lp-hero-cta { display: flex; gap: 12px; align-items: center; justify-content: center; margin-top: 6px; }
        .lp-btn {
          padding: 12px 16px; border-radius: 10px; border: 1px solid transparent;
          background: rgba(148, 163, 184, 0.08);
          color: var(--student-text-primary); font-weight: 700; letter-spacing: 0.2px;
          cursor: pointer; transition: all 0.2s ease;
        }
        .lp-btn:hover { transform: translateY(-1px); }
        .lp-btn.primary {
          background: linear-gradient(135deg, var(--student-primary-cyan), var(--student-primary-purple));
          box-shadow: 0 18px 40px rgba(6, 182, 212, 0.28);
          color: #021318;
        }
        .lp-btn.secondary { border-color: rgba(148, 163, 184, 0.2); }
        .lp-btn.jumbo { padding: 14px 20px; font-size: 16px; }
        .lp-icon { width: 18px; height: 18px; margin-left: 10px; }

        .lp-marquee {
          overflow: hidden; margin: 26px auto 0; max-width: 1000px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(15, 23, 42, 0.45);
          border-radius: 14px;
        }
        .lp-marquee-track {
          white-space: nowrap; display: flex; gap: 12px;
          padding: 10px 12px; animation: marquee 18s linear infinite;
        }
        .lp-pill {
          display: inline-flex; gap: 8px; align-items: center;
          padding: 8px 12px; border-radius: 999px;
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid var(--student-ring);
          color: var(--student-text-primary);
          font-size: 12.5px;
        }
        .lp-pill-dot {
          width: 6px; height: 6px; border-radius: 999px; background: var(--student-primary-cyan);
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.55);
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Sections */
        .lp-section { position: relative; max-width: 1100px; margin: 52px auto 0; padding: 0 20px; }
        .lp-h2 { font-size: clamp(22px, 2.6vw, 28px); font-weight: 900; text-align: center; }
        .lp-subtle { text-align: center; color: var(--student-text-muted); margin: 6px auto 0; max-width: 760px; }

        /* Grid */
        .lp-grid {
          margin-top: 22px;
          display: grid; gap: 14px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 940px) { .lp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .lp-grid { grid-template-columns: 1fr; } }

        .lp-card {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 14px;
          padding: 16px;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .lp-card:hover { transform: translateY(-3px); border-color: var(--student-border-focus); box-shadow: 0 12px 32px rgba(2, 6, 23, 0.5); }
        .lp-fi { width: 22px; height: 22px; color: var(--student-primary-cyan); flex: none; }
        .lp-card-head { display: flex; gap: 10px; align-items: center; font-weight: 800; margin-bottom: 8px; }
        .lp-card-desc { color: var(--student-text-muted); line-height: 1.55; font-size: 14.5px; }

        /* Steps */
        .lp-steps {
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 16px;
        }
        @media (max-width: 940px) { .lp-steps { grid-template-columns: 1fr; } }
        .lp-step {
          padding: 16px; border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 12px; background: rgba(15, 23, 42, 0.45);
        }
        .lp-step-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .lp-step-n {
          width: 26px; height: 26px; display: grid; place-items: center;
          border-radius: 999px; font-weight: 900; color: #00181d; font-size: 13px;
          background: linear-gradient(135deg, var(--student-primary-cyan), var(--student-primary-purple));
          box-shadow: 0 10px 28px rgba(6, 182, 212, 0.28);
        }
        .lp-step-title { font-weight: 800; }
        .lp-step-desc { color: var(--student-text-muted); font-size: 14.5px; }

        /* CTA */
        .lp-cta { max-width: 1100px; margin: 44px auto 0; padding: 0 20px 40px; text-align: center; }
        .lp-cta-title { font-weight: 900; font-size: clamp(18px, 2.4vw, 24px); }
        .lp-cta-sub { color: var(--student-text-muted); margin: 6px 0 12px; }

        /* Footer */
        .lp-footer { border-top: 1px solid rgba(148, 163, 184, 0.18); background: linear-gradient(180deg, transparent, rgba(2, 6, 23, 0.6)); }
        .lp-foot-wrap { max-width: 1100px; margin: 0 auto; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .lp-foot-brand { display: flex; align-items: center; gap: 10px; }
        .lp-foot-title { font-weight: 800; font-size: 14px; }
        .lp-foot-sub { color: var(--student-text-muted); font-size: 12.5px; }
        .lp-foot-links { display: flex; gap: 12px; }
        .lp-foot-links a {
          color: var(--student-text-muted);
          border: 1px solid rgba(148, 163, 184, 0.16);
          padding: 6px 10px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .lp-foot-links a:hover { border-color: var(--student-border-focus); color: #e6fbff; }

        /* Responsive tweaks */
  @media (max-width: 1024px) {
    .lp-wrap { padding: 12px 16px; }
    .lp-hero { padding: 20px 16px 0; }
    .lp-grid { gap: 12px; }
    .lp-steps { gap: 10px; }
  }

  @media (max-width: 820px) {
    .lp-hero-title { font-size: clamp(30px, 5.4vw, 46px); }
    .lp-hero-sub { font-size: 15px; }
    .lp-hero-cta { flex-wrap: wrap; row-gap: 10px; }
    .lp-marquee { margin-top: 20px; }
    .lp-pill { padding: 7px 10px; font-size: 12px; }
    .lp-pill-dot { width: 5px; height: 5px; }
  }

  @media (max-width: 640px) {
    .lp-wrap { gap: 10px; }
    .lp-brand-text .lp-title { font-size: 14px; }
    .lp-brand-text .lp-sub { font-size: 11px; }
    .lp-actions .lp-btn { padding: 10px 12px; font-size: 13px; }
    .lp-hero-title { font-size: clamp(26px, 7vw, 38px); }
    .lp-hero-sub { font-size: 14px; max-width: 92%; }
    .lp-btn { padding: 10px 12px; font-size: 14px; }
    .lp-btn.jumbo { padding: 12px 14px; font-size: 15px; }
    .lp-grid { grid-template-columns: 1fr; }
    .lp-steps { grid-template-columns: 1fr; }
    .lp-foot-wrap { flex-direction: column; align-items: flex-start; gap: 10px; }
  }

  @media (max-width: 420px) {
    .lp-logo { width: 34px; height: 34px; }
    .lp-actions .lp-btn.ghost { padding: 8px 10px; font-size: 12px; }
    .lp-hero-cta { gap: 8px; }
    .lp-pill { padding: 6px 8px; font-size: 11px; }
  }
      `}</style>
    </main>
  );
}

function Card({ icon, title, desc }) {
  return (
    <div className="lp-card">
      <div className="lp-card-head">
        {icon}
        <span>{title}</span>
      </div>
      <div className="lp-card-desc">{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }) {
  return (
    <div className="lp-step">
      <div className="lp-step-head">
        <div className="lp-step-n">{n}</div>
        <div className="lp-step-title">{title}</div>
      </div>
      <div className="lp-step-desc">{desc}</div>
    </div>
  );
}
