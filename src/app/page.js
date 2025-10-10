"use client";

import Link from "next/link";
import Image from "next/image";
import { Inter, JetBrains_Mono } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import "./globals.css";

/* Fonts */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
});
const jetmono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

/* Enhanced Background Animation */
function BackgroundAnimation() {
  useEffect(() => {
    const container = document.querySelector(".animation-container");
    if (!container) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    const PARTICLE_RATE = prefersReduced ? 0 : isMobile ? 1200 : 700;
    const CODE_RATE = prefersReduced ? 0 : isMobile ? 1600 : 1100;
    const SEED_PARTICLES = prefersReduced ? 0 : isMobile ? 8 : 16;
    const SEED_CODES = prefersReduced ? 0 : isMobile ? 6 : 12;

    const createRandomParticle = () => {
      if (!container) return;
      const particle = document.createElement("div");
      particle.className = `particle type-${Math.floor(Math.random() * 4) + 1}`;
      const sizeBase = isMobile ? 7 : 10;
      const size = Math.random() * sizeBase + 4;
      Object.assign(particle.style, {
        width: `${size}px`,
        height: `${size}px`,
        left: `${Math.random() * 100}%`,
        top: "110%",
        opacity: String(0.25 + Math.random() * 0.45),
        animationDelay: `${Math.random() * 1.5}s`,
        animationDuration: `${(isMobile ? 8 : 10) + Math.random() * 6}s`,
      });
      container.appendChild(particle);
      setTimeout(
        () => particle.parentNode && particle.parentNode.removeChild(particle),
        16000
      );
    };

    const symbols = [
      "{}",
      "</>",
      "[]",
      "()",
      "++",
      "--",
      "=>",
      "&&",
      "||",
      "!=",
      "==",
      "+=",
      "-=",
      "*=",
      "/=",
      "%=",
      "<?",
      "?>",
      "#!",
      "//",
      "/*",
      "*/",
      "@@",
      "::",
      ";;",
      "~~",
      "^^",
      "<<",
      ">>",
      "&=",
      "|=",
      "^=",
      "**",
      "..",
      "...",
      "?.",
      "??",
      "!!",
      "<%",
      "%>",
      "<-",
      "->",
    ];

    const createCodeSnippet = () => {
      if (!container) return;
      const snippet = document.createElement("div");
      snippet.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      snippet.className = "code-symbol";
      const fs = isMobile ? 0.95 : 1.1;
      Object.assign(snippet.style, {
        left: `${Math.random() * 100}%`,
        top: "110%",
        fontSize: `${fs + Math.random() * 0.8}rem`,
        color:
          Math.random() > 0.5
            ? "rgba(6, 182, 212, 0.16)"
            : "rgba(139, 92, 246, 0.16)",
        animationDuration: `${(isMobile ? 8 : 9) + Math.random() * 5}s`,
        animationDelay: `${Math.random() * 1.2}s`,
      });
      container.appendChild(snippet);
      setTimeout(
        () => snippet.parentNode && snippet.parentNode.removeChild(snippet),
        15000
      );
    };

    for (let i = 0; i < SEED_PARTICLES; i++) createRandomParticle();
    for (let i = 0; i < SEED_CODES; i++) createCodeSnippet();

    const particleInterval = PARTICLE_RATE
      ? setInterval(createRandomParticle, PARTICLE_RATE)
      : null;
    const codeInterval = CODE_RATE
      ? setInterval(createCodeSnippet, CODE_RATE)
      : null;

    return () => {
      if (particleInterval) clearInterval(particleInterval);
      if (codeInterval) clearInterval(codeInterval);
    };
  }, []);

  return (
    <>
      <div className="animation-container" aria-hidden="true">
        <div className="bg-shape shape-1" />
        <div className="bg-shape shape-2" />
        <div className="bg-shape shape-3" />
        <div className="bg-orb orb-1" />
        <div className="bg-orb orb-2" />
      </div>
    </>
  );
}

/* Scroll Animation Hook */
function useScrollAnimation() {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
        }
      });
    }, observerOptions);

    document
      .querySelectorAll(".scroll-animate")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

export default function Page() {
  useScrollAnimation();

  return (
    <main className={`lp-root ${inter.className}`}>
      <BackgroundAnimation />

      <EnhancedNavigation />
      <EnhancedHero />

      <section className="lp-section scroll-animate" id="features">
        <h2 className="lp-h2">Why CodePupil?</h2>
        <p className="lp-subtle">
          Everything required to plan, proctor, evaluate, and analyze coding
          assessments.
        </p>

        <div className="lp-grid">
          <Card
            icon="controls"
            title="Live test controls"
            desc="Publish, lock, and broadcast announcements in real time during the test."
            delay={0}
          />
          <Card
            icon="check"
            title="Auto-grading"
            desc="Fast evaluation with custom scoring, outputs, and crash detection."
            delay={0.1}
          />
          <Card
            icon="plus"
            title="Plagiarism checks"
            desc="Similarity detection across students with flagging and analytics."
            delay={0.2}
          />
          <Card
            icon="clock"
            title="IST timestamps"
            desc="Timestamps aligned with India Standard Time for consistency."
            delay={0.3}
          />
          <Card
            icon="safe"
            title="Offline-safe snapshots"
            desc="Continuous code snapshots reduce data loss during unstable connectivity."
            delay={0.4}
          />
          <Card
            icon="bars"
            title="Rich analytics"
            desc="Completion rate, duration, score distributions, and flagged outliers."
            delay={0.5}
          />
        </div>
      </section>

      <section className="how-it-works-section scroll-animate">
        <div className="section-header">
          <span className="section-badge">
            <span className="badge-shine" />
            Process
          </span>
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            Three simple steps to transform your coding assessments
          </p>
        </div>

        <div className="steps-container">
          <Step
            n={1}
            title="Create & publish"
            desc="Prepare problems, configure duration, and publish for a batch."
            delay={0.2}
          />
          <Step
            n={2}
            title="Monitor live"
            desc="Track progress, push announcements, and resolve issues instantly."
            delay={0.4}
          />
          <Step
            n={3}
            title="Evaluate & analyze"
            desc="Get graded outputs, similarity flags, and performance dashboards."
            delay={0.6}
          />
        </div>
      </section>

      <CTASection />

      <ModernFooter />
    </main>
  );
}

/* ENHANCED NAVIGATION HEADER - WITH LOGO IMAGE */
function EnhancedNavigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header className={`premium-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-container">
          <div className="nav-glass" />

          <div className="nav-content">
            <Link href="/" className="brand-link">
              <div className="brand-section">
                <div className="logo-wrapper">
                  <div className="logo-glow" />
                  <div className="logo-container">
                    <Image
                      src="/code-pupil.jpg"
                      alt="CodePupil Logo"
                      width={50}
                      height={50}
                      className="logo-image"
                      priority
                    />
                    <div className="logo-shine" />
                    <div className="logo-ring" />
                  </div>
                </div>

                <div className="brand-text">
                  <div className="brand-name">
                    CodePupil
                    <span className="brand-dot">.</span>
                  </div>
                  <div className="brand-subtitle">Assessment Platform</div>
                </div>
              </div>
            </Link>

            <div className="nav-actions">
              <div className="nav-links">
                <Link href="#features" className="nav-link">
                  Features
                </Link>
              </div>

              <Link href="/auth/student/">
                <button className="student-login-btn">
                  <span className="btn-background" />
                  <span className="btn-border" />
                  <span className="btn-content">
                    <svg
                      className="btn-icon"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Student Login
                    <svg
                      className="btn-arrow"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

/* ENHANCED HERO SECTION */
/* ENHANCED HERO SECTION - WITHOUT IMAGE */
function EnhancedHero() {
  return (
    <>
      <section className="premium-hero" id="top">
        <div className="hero-grid" />

        <div className="hero-orb orb-1" />
        <div className="hero-orb orb-2" />
        <div className="hero-orb orb-3" />

        <div className="hero-container">
          <div className="status-badge">
            <div className="badge-glow" />
            <div className="badge-content">
              <span className="badge-dot-wrapper">
                <span className="badge-dot" />
                <span className="badge-ping" />
              </span>
              <span className="badge-text">Live-ready platform</span>
            </div>
          </div>

          <h1 className="hero-title">
            <span className="title-line line-1">Conduct coding tests</span>
            <span className="title-line line-2">
              with confidence
              <span className="title-accent">.</span>
            </span>
          </h1>

          <p className="hero-subtitle">
            Live announcements, plagiarism checks, auto-grading, and rich
            analytics — all in one place.
          </p>

          <div className="hero-cta">
            <Link href="/auth/student/">
              <button className="primary-cta-btn">
                <span className="btn-shine" />
                <span className="btn-text">
                  <span className="btn-icon-left">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Start as Student
                  <span className="btn-arrow">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </button>
            </Link>

            <Link href="#features">
              <button className="secondary-cta-btn">
                <span className="secondary-btn-bg" />
                <span className="secondary-btn-border" />
                <span className="secondary-btn-text">
                  Explore Features
                  <svg
                    className="explore-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M15 3h6v6M9 21L21 9"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
            </Link>
          </div>

          <div className="stats-marquee">
            <div className="marquee-container">
              <div className="marquee-content">
                {[
                  "Active Batches",
                  "Tests Conducted",
                  "Auto-graded",
                  "Uptime 99.9%",
                  "IST Time",
                ].map((stat, i) => (
                  <div className="stat-pill" key={i}>
                    <span className="pill-icon">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </span>
                    <span className="pill-text">{stat}</span>
                  </div>
                ))}
                {[
                  "Active Batches",
                  "Tests Conducted",
                  "Auto-graded",
                  "Uptime 99.9%",
                  "IST Time",
                ].map((stat, i) => (
                  <div className="stat-pill" key={`dup-${i}`}>
                    <span className="pill-icon">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                    </span>
                    <span className="pill-text">{stat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* Icon chooser for cards */
function CardIcon({ name }) {
  const common = {
    className: "lp-fi",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
  };
  switch (name) {
    case "controls":
      return (
        <svg {...common}>
          <path
            d="M4 8h16M4 16h16M8 4v4m0 8v4"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path
            d="M5 12l4 4L19 6"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 6v12M6 12h12" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <path
            d="M12 6v6l4 2"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="9" strokeWidth="1.2" />
        </svg>
      );
    case "safe":
      return (
        <svg {...common}>
          <path
            d="M4 7h16M7 7v10a3 3 0 003 3h4a3 3 0 003-3V7"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "bars":
      return (
        <svg {...common}>
          <path
            d="M4 13h4v7H4zM10 9h4v11h-4zM16 5h4v15h-4z"
            strokeWidth="1.2"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="6" strokeWidth="1.8" />
        </svg>
      );
  }
}

/* PROFESSIONAL ANIMATED CARD COMPONENT */
function Card({ icon, title, desc, delay }) {
  const cardRef = useRef(null);
  const glowRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.animationDelay = `${delay}s`;
    }
  }, [delay]);

  const handleMouseMove = (e) => {
    if (!cardRef.current || !glowRef.current) return;

    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * 8;
    const rotateY = ((centerX - x) / centerX) * 8;

    card.style.transform = `
      perspective(1000px) 
      rotateX(${-rotateX}deg) 
      rotateY(${rotateY}deg)
      translateZ(20px)
      scale3d(1.02, 1.02, 1.02)
    `;
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (cardRef.current) {
      cardRef.current.style.transform = "";
    }
  };

  return (
    <>
      <div
        className="premium-card"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="card-border" />
        <div className="glass-layer" />
        <div className="spotlight" ref={glowRef} />
        <div className="shimmer" />

        <div className="card-inner">
          <div className="icon-wrapper">
            <div className="icon-bg" />
            <div className="icon-container">
              <CardIcon name={icon} />
            </div>
          </div>

          <div className="title-section">
            <h3 className="card-title">{title}</h3>
            <span className="card-badge">
              <span className="badge-dot" />
              New
            </span>
          </div>

          <p className="card-description">{desc}</p>

          <div className="card-footer">
            <Link href="#features" className="card-link">
              <span>Learn more</span>
              <svg
                className="arrow-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <div className="feature-indicator">
              <div className="indicator-dot" />
              <span>Premium</span>
            </div>
          </div>
        </div>

        <div className="card-particles">
          <div className="particle p1" />
          <div className="particle p2" />
          <div className="particle p3" />
        </div>
      </div>
    </>
  );
}

/* ENHANCED STEP COMPONENT */
function Step({ n, title, desc, delay }) {
  const stepRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay * 1000);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (stepRef.current) {
      observer.observe(stepRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <>
      <div
        className={`premium-step ${isVisible ? "is-visible" : ""}`}
        ref={stepRef}
      >
        <div className="step-line" />

        <div className="step-number-wrapper">
          <div className="number-glow" />
          <div className="number-pulse" />
          <div className="step-number">
            <span className="number-text">{n}</span>
            <div className="number-shine" />
          </div>
        </div>

        <div className="step-card">
          <div className="step-border" />
          <div className="glass-background" />
          <div className="step-spotlight" />

          <div className="step-content">
            <div className="step-icon-bar">
              <div className="icon-dot" />
              <div className="icon-dot" />
              <div className="icon-dot" />
            </div>

            <h3 className="step-title">
              {title}
              <div className="title-underline" />
            </h3>

            <p className="step-description">{desc}</p>

            <div className="step-footer">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(n / 3) * 100}%` }} />
              </div>
              <span className="step-label">Step {n} of 3</span>
            </div>
          </div>

          <div className="step-particles">
            <div className="particle p1" />
            <div className="particle p2" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ENHANCED CTA SECTION - FIXED */
function CTASection() {
  const ctaRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!ctaRef.current) return;
      const rect = ctaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMousePosition({ x, y });
      
      // Set CSS custom properties directly on the element
      if (ctaRef.current) {
        ctaRef.current.style.setProperty('--mouse-x', `${x}px`);
        ctaRef.current.style.setProperty('--mouse-y', `${y}px`);
      }
    };

    const cta = ctaRef.current;
    if (cta) {
      cta.addEventListener("mousemove", handleMouseMove);
      return () => cta.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  return (
    <>
      <section
        className="premium-cta scroll-animate"
        ref={ctaRef}
      >
        <div className="cta-bg-grid" />
        <div className="cta-gradient-orb orb-1" />
        <div className="cta-gradient-orb orb-2" />
        <div className="cta-spotlight" />

        <div className="cta-glass-container">
          <div className="glass-border" />
          <div className="glass-bg" />

          <div className="cta-content">
            <div className="cta-badge">
              <span className="badge-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Get Started
            </div>

            <h3 className="cta-title">Ready to take a test?</h3>

            <p className="cta-subtitle">
              Log in to the student portal to begin your assessment journey
            </p>

            <Link href="/auth/student/">
              <button className="cta-button">
                <span className="button-content">
                  <span className="button-icon">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Login at /auth/student/
                  <span className="button-arrow">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M5 12h14M12 5l7 7-7 7"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
                <div className="button-glow" />
                <div className="button-shine" />
              </button>
            </Link>

            <div className="cta-features">
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                Instant Access
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                Live Monitoring
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                Auto-grading
              </div>
            </div>
          </div>
        </div>

        <div className="cta-particles">
          <div className="cta-particle p1" />
          <div className="cta-particle p2" />
          <div className="cta-particle p3" />
          <div className="cta-particle p4" />
        </div>
      </section>
    </>
  );
}

/* REDESIGNED MODERN FOOTER - WITH LOGO IMAGE */
function ModernFooter() {
  return (
    <>
      <footer className="modern-footer">
        <div className="footer-wave">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
              fill="rgba(6, 182, 212, 0.05)"
            />
          </svg>
        </div>

        <div className="footer-content">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="brand-logo-wrapper">
                <div className="brand-logo">
                  <Image
                    src="/code-pupil.jpg"
                    alt="CodePupil Logo"
                    width={56}
                    height={56}
                    className="footer-logo-image"
                  />
                  <div className="logo-shine" />
                </div>
              </div>
              <div className="brand-info">
                <h3 className="brand-name">CodePupil</h3>
                <p className="brand-tagline">Assessment Platform</p>
                <p className="brand-description">
                  Build, conduct, and measure coding skill with live monitoring,
                  auto-grading, and comprehensive analytics.
                </p>
              </div>
              <div className="social-links">
                <Link href="#" className="social-link" aria-label="GitHub">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                </Link>
                <Link href="#" className="social-link" aria-label="Twitter">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                  </svg>
                </Link>
                <Link href="#" className="social-link" aria-label="LinkedIn">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
                    <circle cx="4" cy="4" r="2" />
                  </svg>
                </Link>
                <Link href="#" className="social-link" aria-label="Discord">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="footer-column">
              <h4 className="column-title">Quick Links</h4>
              <ul className="footer-links">
                <li>
                  <Link href="#features" className="footer-link">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#top" className="footer-link">
                    Top
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="footer-link">
                    How it Works
                  </Link>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="column-title">Resources</h4>
              <ul className="footer-links">
                <li>
                  <Link href="#docs" className="footer-link">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="#api" className="footer-link">
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link href="#tutorials" className="footer-link">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link href="#support" className="footer-link">
                    Support
                  </Link>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="column-title">Portals</h4>
              <ul className="footer-links">
                <li>
                  <Link href="/auth/faculty/" className="footer-link featured-link">
                  <span className="link-icon">→</span>
                    Faculty Login
                  </Link>
                </li>
                <li>
                  <Link href="/faculty/" className="footer-link">
                    Faculty Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/student/"
                    className="footer-link featured-link"
                  >
                    <span className="link-icon">→</span>
                    Student Login
                  </Link>
                </li>
                <li>
                  <Link href="/student/" className="footer-link">
                    Test Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-divider" />

          <div className="footer-bottom">
            <div className="footer-legal">
              <p className="copyright">
                © {new Date().getFullYear()} CodePupil. All rights reserved.
              </p>
              <div className="legal-links">
                <Link href="#privacy" className="legal-link">
                  Privacy Policy
                </Link>
                <span className="legal-separator">•</span>
                <Link href="#terms" className="legal-link">
                  Terms of Service
                </Link>
                <span className="legal-separator">•</span>
                <Link href="#cookies" className="legal-link">
                  Cookie Policy
                </Link>
              </div>
            </div>
            <div className="footer-badge">
              <span className="badge-dot" />
              Made with ❤️ for Educators
            </div>
          </div>
        </div>

        <div className="footer-decoration">
          <div className="decoration-orb orb-1" />
          <div className="decoration-orb orb-2" />
        </div>
      </footer>
    </>
  );
}
