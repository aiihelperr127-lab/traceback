import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';

/* ── Animated Particle Canvas ─────────────────────── */
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    function resize() {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function createParticles() {
      particles = [];
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const count = Math.floor((w * h) / 12000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.5 + 0.5,
          o: Math.random() * 0.4 + 0.1,
        });
      }
    }

    function draw() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,211,238,${p.o})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(34,211,238,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

/* ── Typing Animation Hook ────────────────────────── */
function useTypingEffect(texts, typingSpeed = 80, deletingSpeed = 40, pauseDuration = 2000) {
  const [displayText, setDisplayText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFullText = texts[textIndex];
    let timeout;

    if (!isDeleting && displayText === currentFullText) {
      timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % texts.length);
    } else {
      timeout = setTimeout(() => {
        setDisplayText(
          isDeleting
            ? currentFullText.substring(0, displayText.length - 1)
            : currentFullText.substring(0, displayText.length + 1)
        );
      }, isDeleting ? deletingSpeed : typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return displayText;
}

/* ── Scroll Reveal Hook ───────────────────────────── */
function useScrollReveal() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

/* ── Feature Data ─────────────────────────────────── */
const FEATURES = [
  {
    title: 'Jeopardy Challenges',
    desc: 'Web, crypto, pwn, reversing, forensics, and more categories to test every skill.',
    icon: '🎯',
    gradient: 'linear-gradient(135deg, #22d3ee22, #a78bfa22)',
  },
  {
    title: 'Team-Based Competition',
    desc: 'Form teams, collaborate on problems, and combine your strengths.',
    icon: '👥',
    gradient: 'linear-gradient(135deg, #34d39922, #22d3ee22)',
  },
  {
    title: 'Live Leaderboard',
    desc: 'Real-time rankings that update as teams solve challenges.',
    icon: '📊',
    gradient: 'linear-gradient(135deg, #fbbf2422, #f8717122)',
  },
  {
    title: 'Timed Events',
    desc: 'Compete within time-bound competitions with a live countdown.',
    icon: '⏱️',
    gradient: 'linear-gradient(135deg, #f8717122, #a78bfa22)',
  },
  {
    title: 'Secure Validation',
    desc: 'Server-side flag checks prevent cheating. All submissions are logged.',
    icon: '🛡️',
    gradient: 'linear-gradient(135deg, #34d39922, #fbbf2422)',
  },
  {
    title: 'Admin Control Panel',
    desc: 'Full management suite for challenges, users, teams, and events.',
    icon: '⚙️',
    gradient: 'linear-gradient(135deg, #a78bfa22, #22d3ee22)',
  },
];

/* ── Stats Counter Animation ──────────────────────── */
function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Main Home Component ──────────────────────────── */
export default function Home() {
  const { user } = useAuth();
  const typedText = useTypingEffect(
    ['Hacking', 'Exploiting', 'Cracking', 'Decrypting', 'Pwning'],
    90, 50, 1800
  );
  const [featuresRef, featuresVisible] = useScrollReveal();
  const [statsRef, statsVisible] = useScrollReveal();

  return (
    <div className="page home-page">
      {/* ═══ HERO SECTION ═══ */}
      <section className="home-hero">
        <ParticleField />

        {/* Animated gradient orbs */}
        <div className="home-orb home-orb-1" />
        <div className="home-orb home-orb-2" />
        <div className="home-orb home-orb-3" />

        <div className="container home-hero-inner">
          {/* LEFT — Text Content */}
          <div className="home-hero-text">
            <div className="home-hero-badge home-stagger-1">
              <span className="home-badge-dot" />
              <span>&#x276F;_ capture the flag</span>
            </div>

            <h1 className="home-hero-title home-stagger-2">
              <span className="home-title-line">Test Your</span>
              <span className="home-title-line">
                <span className="home-typed-wrap">
                  <span className="home-typed-text">{typedText}</span>
                  <span className="home-typed-cursor">|</span>
                </span>{' '}
                Skills
              </span>
            </h1>

            <p className="home-hero-desc home-stagger-3">
              Compete in Jeopardy-style CTF challenges. Solve problems across web exploitation,
              cryptography, reverse engineering, forensics, and more. Form a team and climb the leaderboard.
            </p>

            <div className="home-hero-actions home-stagger-4">
              {user ? (
                <>
                  <Link to="/challenges" className="home-btn-primary">
                    <span>View Challenges</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </Link>
                  <Link to="/leaderboard" className="home-btn-ghost">Leaderboard</Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="home-btn-primary">
                    <span>Get Started</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </Link>
                  <Link to="/login" className="home-btn-ghost">Sign In</Link>
                </>
              )}
            </div>

            {/* Terminal-style decoration */}
            <div className="home-terminal home-stagger-5">
              <div className="home-terminal-bar">
                <span className="home-terminal-dot home-terminal-dot-red" />
                <span className="home-terminal-dot home-terminal-dot-yellow" />
                <span className="home-terminal-dot home-terminal-dot-green" />
              </div>
              <div className="home-terminal-body">
                <span className="home-terminal-prompt">$</span>{' '}
                <span className="home-terminal-cmd">./traceback</span>{' '}
                <span className="home-terminal-flag">--ctf</span>{' '}
                <span className="home-terminal-arg">start</span>
              </div>
            </div>
          </div>

          {/* RIGHT — Mascot */}
          <div className="home-hero-mascot home-stagger-3">
            <div className="home-mascot-glow" />
            <img
              src="/mascot.png"
              alt="TracebackCTF Mascot — Hacker character"
              className="home-mascot-img"
            />
            {/* Floating badges around mascot */}
            <div className="home-float-badge home-float-badge-1">🏁 CTF</div>
            <div className="home-float-badge home-float-badge-2">🔐 Crypto</div>
            <div className="home-float-badge home-float-badge-3">💻 Web</div>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="home-stats-section" ref={statsRef}>
        <div className="container">
          <div className={`home-stats-bar ${statsVisible ? 'home-reveal' : ''}`}>
            <div className="home-stat-item">
              <div className="home-stat-val"><AnimatedCounter target={8} suffix="+" /></div>
              <div className="home-stat-label">Categories</div>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat-item">
              <div className="home-stat-val"><AnimatedCounter target={50} suffix="+" /></div>
              <div className="home-stat-label">Challenges</div>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat-item">
              <div className="home-stat-val"><AnimatedCounter target={100} suffix="+" /></div>
              <div className="home-stat-label">Players</div>
            </div>
            <div className="home-stat-divider" />
            <div className="home-stat-item">
              <div className="home-stat-val"><AnimatedCounter target={24} suffix="h" /></div>
              <div className="home-stat-label">Non-Stop</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section className="home-features-section" ref={featuresRef}>
        <div className="container">
          <div className={`home-features-header ${featuresVisible ? 'home-reveal' : ''}`}>
            <span className="home-section-eyebrow">PLATFORM FEATURES</span>
            <h2 className="home-section-title">Everything you need to run a<br /><span>professional CTF</span></h2>
          </div>
          <div className="home-features-grid">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`home-feature-card ${featuresVisible ? 'home-reveal' : ''}`}
                style={{
                  transitionDelay: `${0.1 * i}s`,
                  background: f.gradient,
                }}
              >
                <div className="home-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="home-cta-section">
        <div className="container">
          <div className="home-cta-card">
            <div className="home-cta-glow" />
            <h2>Ready to hack?</h2>
            <p>Join the competition and prove your cybersecurity skills.</p>
            {user ? (
              <Link to="/challenges" className="home-btn-primary home-btn-cta">
                <span>Go to Challenges</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            ) : (
              <Link to="/register" className="home-btn-primary home-btn-cta">
                <span>Create Account</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
