"use client";

import Link from "next/link";
import Image from "next/image";
import { LogoIcon } from "@/components/shared/logo";

/* ── Brand Colors (from logo) ── */
const GREEN = "#8CC63F";
const GREEN_DARK = "#5A9A1F";
const GREEN_LIGHT = "#E8F5D6";
const GREEN_BG = "#F2FAE8";
const DARK = "#2D2D2D";
const GRAY = "#6B7280";
const LIGHT_BG = "#F9FDF4";
const STROKE = "#2D2D2D";

/* ── SVG Icons (bold stroke, rounded, matching logo style) ── */
const Icons = {
  camera: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="4" y="14" width="40" height="26" rx="6" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 14l2-6h10l2 6" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="24" cy="27" r="8" fill={GREEN} stroke={STROKE} strokeWidth="3" />
      <circle cx="24" cy="27" r="3" fill="white" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="24" r="18" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" />
      <circle cx="24" cy="24" r="11" fill="white" stroke={STROKE} strokeWidth="3" />
      <circle cx="24" cy="24" r="4" fill={GREEN} stroke={STROKE} strokeWidth="3" />
      <line x1="24" y1="2" x2="24" y2="10" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="46" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <line x1="2" y1="24" x2="10" y2="24" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <line x1="38" y1="24" x2="46" y2="24" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M8 8h12c4 0 4 2 4 4v28c0-3-2-4-4-4H8V8z" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 8H28c-4 0-4 2-4 4v28c0-3 2-4 4-4h12V8z" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <line x1="14" y1="16" x2="20" y2="16" stroke={GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="14" y1="22" x2="19" y2="22" stroke={GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="16" x2="34" y2="16" stroke={GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="28" y1="22" x2="33" y2="22" stroke={GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="40" height="40" rx="8" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <rect x="12" y="24" width="6" height="14" rx="2" fill={GREEN} stroke={STROKE} strokeWidth="2" />
      <rect x="21" y="16" width="6" height="22" rx="2" fill={GREEN_DARK} stroke={STROKE} strokeWidth="2" />
      <rect x="30" y="20" width="6" height="18" rx="2" fill={GREEN} stroke={STROKE} strokeWidth="2" />
    </svg>
  ),
  family: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="16" cy="14" r="6" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" />
      <circle cx="34" cy="14" r="5" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" />
      <path d="M6 38c0-8 4-12 10-12s10 4 10 12" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <path d="M26 36c0-7 3-10 8-10s8 3 8 10" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="14" r="2" fill={STROKE} />
      <circle cx="34" cy="14" r="1.5" fill={STROKE} />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="8" y="8" width="32" height="36" rx="6" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <rect x="16" y="4" width="16" height="8" rx="3" fill={GREEN} stroke={STROKE} strokeWidth="3" />
      <line x1="16" y1="22" x2="32" y2="22" stroke={GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="29" x2="28" y2="29" stroke={GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="16" y1="36" x2="24" y2="36" stroke={GREEN_DARK} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  student: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="24" cy="22" r="10" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" />
      <path d="M8 46c0-10 6-16 16-16s16 6 16 16" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="21" r="2" fill={STROKE} />
      <circle cx="28" cy="21" r="2" fill={STROKE} />
      <path d="M21 26c1 1.5 5 1.5 6 0" stroke={STROKE} strokeWidth="2" strokeLinecap="round" fill="none" />
      <polygon points="24,2 38,10 24,14 10,10" fill={GREEN} stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M14 10v4c0 2 4.5 4 10 4s10-2 10-4v-4" fill={GREEN_DARK} stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <line x1="38" y1="10" x2="38" y2="18" stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="19" r="2" fill={GREEN} stroke={STROKE} strokeWidth="1.5" />
    </svg>
  ),
  parents: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <circle cx="17" cy="14" r="7" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" />
      <circle cx="33" cy="16" r="6" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" />
      <path d="M4 42c0-10 5-14 13-14s13 4 13 14" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <path d="M28 40c0-8 3-11 7-11s7 3 7 11" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="14" cy="13" r="1.5" fill={STROKE} />
      <circle cx="20" cy="13" r="1.5" fill={STROKE} />
      <path d="M15 17c0.5 1.5 3.5 1.5 4 0" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  ),
  school: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="6" y="18" width="36" height="24" rx="4" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M6 18l18-12 18 12" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <rect x="18" y="28" width="12" height="14" rx="2" fill={GREEN} stroke={STROKE} strokeWidth="2.5" />
      <circle cx="24" cy="14" r="3" fill={GREEN} stroke={STROKE} strokeWidth="2" />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <path d="M24 4l4 14h14l-11 8 4 14-11-8-11 8 4-14L6 18h14z" fill={GREEN} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
    </svg>
  ),
  upload: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="6" y="6" width="36" height="36" rx="8" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 32V16" stroke={GREEN_DARK} strokeWidth="3" strokeLinecap="round" />
      <path d="M17 22l7-7 7 7" stroke={GREEN_DARK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="14" y1="36" x2="34" y2="36" stroke={GREEN_DARK} strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  trending: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="40" height="40" rx="8" fill={GREEN_LIGHT} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M10 34l10-10 6 6 12-14" stroke={GREEN_DARK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M32 16h8v8" stroke={GREEN_DARK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
};

/* ── Icon wrapper with consistent sizing ── */
function Icon({ children, size = 48 }: { children: React.ReactNode; size?: number }) {
  return <div style={{ width: size, height: size }}>{children}</div>;
}

/* ── Data ── */
const FEATURES = [
  {
    icon: Icons.camera,
    title: "Photo to question bank",
    desc: "Snap a worksheet — AI extracts questions, tags topics, and adds them to your bank in seconds.",
  },
  {
    icon: Icons.target,
    title: "Targeted practice",
    desc: "Build practice sets by topic and difficulty. Drill exactly what's weak.",
  },
  {
    icon: Icons.book,
    title: "Smart mistakes notebook",
    desc: "Mistakes are collected automatically. Re-do them in one click until mastered.",
  },
  {
    icon: Icons.chart,
    title: "Data dashboard",
    desc: "Progress, accuracy, weak spots — let the data speak.",
  },
  {
    icon: Icons.family,
    title: "Parents in the loop",
    desc: "How much your child practiced and how they're doing — anytime, on any phone.",
  },
  {
    icon: Icons.clipboard,
    title: "Teachers assign tasks",
    desc: "Assign practice in one click. Progress tracks itself.",
  },
];

const STEPS = [
  { icon: Icons.sparkle, title: "Sign up", desc: "Create your studio and invite students and parents." },
  { icon: Icons.upload, title: "Build a question bank", desc: "Upload worksheet photos. AI extracts the questions." },
  { icon: Icons.clipboard, title: "Assign practice", desc: "Send students tasks by topic." },
  { icon: Icons.trending, title: "Track progress", desc: "See live learning progress and grades." },
];

const AUDIENCES = [
  {
    icon: Icons.student,
    label: "Students",
    tagline: "Practice that feels like a game.",
    points: ["Playful practice UI", "Automatic mistake tracking", "Topic-by-topic mastery"],
  },
  {
    icon: Icons.parents,
    label: "Parents",
    tagline: "Always know what your child is learning.",
    points: ["Live progress reports", "Learning trend analysis", "Weak-spot alerts"],
  },
  {
    icon: Icons.school,
    label: "Tutors & studios",
    tagline: "Less admin. More teaching.",
    points: ["AI-powered question bank", "One-click task assignment", "Student data dashboard"],
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ background: LIGHT_BG }}>
      {/* ────── Nav ────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/10" style={{ background: "rgba(10, 22, 40, 0.85)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon size={36} />
            <span className="text-xl font-black tracking-tight text-white">
              Firefly
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-bold rounded-xl transition-colors text-white/80 hover:text-white hover:bg-white/10"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-bold rounded-xl border-b-[3px] hover:-translate-y-0.5 active:translate-y-0 active:border-b-0 transition-all duration-150"
              style={{ background: "#CCFF44", borderBottomColor: "#9ABF33", color: "#0A1628" }}
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* ────── Night Sky Zone (Hero → Social → Audiences → Features) ────── */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0A1628 0%, #0F1F3D 30%, #132845 60%, #1A3355 80%, #1F4028 95%, #2A5030 100%)" }}>
        {/* Stars across entire night zone */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { x: 10, y: 3, s: 2, d: 3 }, { x: 25, y: 2, s: 1.5, d: 5 }, { x: 45, y: 5, s: 2, d: 2 },
            { x: 65, y: 3, s: 1, d: 4 }, { x: 80, y: 4, s: 2.5, d: 3.5 }, { x: 90, y: 2, s: 1.5, d: 6 },
            { x: 15, y: 8, s: 1, d: 4.5 }, { x: 55, y: 1, s: 2, d: 2.5 }, { x: 35, y: 6, s: 1.5, d: 5.5 },
            { x: 72, y: 7, s: 1, d: 3.2 }, { x: 5, y: 12, s: 1.5, d: 1.8 }, { x: 48, y: 10, s: 2, d: 4.2 },
            { x: 85, y: 9, s: 1, d: 2.8 }, { x: 32, y: 14, s: 1.5, d: 5.2 }, { x: 62, y: 11, s: 2, d: 1.2 },
            { x: 18, y: 16, s: 1, d: 3.8 }, { x: 95, y: 6, s: 1.5, d: 4.8 }, { x: 42, y: 18, s: 2, d: 2.2 },
          ].map((star, i) => (
            <div
              key={`star-${i}`}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.s, height: star.s, animationDelay: `${star.d}s` }}
            />
          ))}
        </div>

        {/* Firefly glow particles across entire zone */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { x: 8, y: 15, d: 0 }, { x: 20, y: 25, d: 1.5 }, { x: 35, y: 12, d: 3 },
            { x: 50, y: 20, d: 0.8 }, { x: 65, y: 18, d: 2.2 }, { x: 78, y: 28, d: 4 },
            { x: 88, y: 14, d: 1 }, { x: 42, y: 30, d: 3.5 }, { x: 15, y: 35, d: 2.8 },
            { x: 72, y: 10, d: 4.5 }, { x: 58, y: 38, d: 1.2 }, { x: 30, y: 22, d: 5 },
            { x: 12, y: 50, d: 1.8 }, { x: 55, y: 55, d: 3.2 }, { x: 82, y: 45, d: 0.5 },
            { x: 25, y: 60, d: 4.2 }, { x: 68, y: 58, d: 2.5 }, { x: 40, y: 70, d: 1.5 },
            { x: 90, y: 65, d: 3.8 }, { x: 8, y: 72, d: 0.8 }, { x: 75, y: 75, d: 5.5 },
          ].map((f, i) => (
            <div
              key={`fly-${i}`}
              className="absolute animate-firefly-glow"
              style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: `${f.d}s` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: "#CCFF44", boxShadow: "0 0 8px 4px rgba(200,255,50,0.4), 0 0 20px 8px rgba(200,255,50,0.15)" }} />
            </div>
          ))}
        </div>

        {/* ── Hero ── */}
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-20 px-6">
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold mb-6 border border-white/20 bg-white/10 text-blue-200 backdrop-blur-sm">
                  <Icon size={20}>{Icons.sparkle}</Icon>
                  AI-powered learning platform
                </div>

                <h1 className="text-4xl md:text-[3.5rem] font-black leading-[1.15] tracking-tight text-white">
                  Help every child
                  <br />
                  <span style={{ color: "#CCFF44" }}>love learning</span>
                </h1>

                <p className="mt-5 text-base md:text-lg leading-relaxed max-w-lg text-blue-100/70">
                  A small light goes a long way.
                  <br />
                  Build question banks with AI, practice smart, and track every mistake.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 md:justify-start justify-center">
                  <Link
                    href="/login"
                    className="group px-8 py-4 text-base font-bold text-[#0A1628] rounded-2xl border-b-4 hover:-translate-y-0.5 active:translate-y-0 active:border-b-0 transition-all duration-150 shadow-lg"
                    style={{ background: "#CCFF44", borderBottomColor: "#9ABF33", boxShadow: "0 8px 24px rgba(200,255,50,0.3)" }}
                  >
                    Get started free
                    <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                  <a
                    href="#features"
                    className="px-8 py-4 text-base font-bold rounded-2xl border-2 border-white/20 text-white/80 hover:border-blue-400/50 hover:text-white transition-colors backdrop-blur-sm"
                  >
                    Learn more
                  </a>
                </div>
              </div>

              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 rounded-full blur-3xl opacity-20" style={{ background: "#CCFF44" }} />
                <LogoIcon size={360} className="relative z-10 drop-shadow-[0_0_40px_rgba(200,255,50,0.3)]" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Social proof ── */}
        <section className="relative z-10 py-10 px-6">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 md:gap-8">
            {[
              { num: "AI", label: "Claude · GPT · DeepSeek · Gemini", sub: "Switch freely — never locked in" },
              { num: "4 roles", label: "Student · Parent · Teacher · Admin", sub: "Built for collaboration" },
              { num: "∞", label: "Unlimited question bank", sub: "Snap a photo to add" },
            ].map((s, i) => (
              <div
                key={i}
                className="text-center px-4 py-3 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm"
              >
                <div className="text-lg md:text-xl font-black text-white">{s.num}</div>
                <div className="text-xs font-bold mt-0.5" style={{ color: "#CCFF44" }}>{s.label}</div>
                <div className="text-[10px] mt-0.5 text-blue-200/60">{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Audiences ── */}
        <section className="relative z-10 py-16 md:py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-3 text-white">
              Built for <span style={{ color: "#CCFF44" }}>everyone</span>
            </h2>
            <p className="text-center mb-12 text-base text-blue-200/60">
              Students, parents, tutors — everyone gets value.
            </p>

            <div className="grid md:grid-cols-3 gap-5">
              {AUDIENCES.map((a, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-7 border border-white/15 bg-white/5 backdrop-blur-sm hover:-translate-y-2 transition-all duration-300"
                >
                  <Icon size={56}>{a.icon}</Icon>
                  <h3 className="text-xl font-black mb-1 mt-3 text-white">{a.label}</h3>
                  <p className="text-sm font-bold mb-4" style={{ color: "#CCFF44" }}>{a.tagline}</p>
                  <ul className="space-y-2">
                    {a.points.map((p, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-blue-100/80">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[#0A1628] text-[10px] font-bold flex-shrink-0"
                          style={{ background: "#CCFF44" }}
                        >
                          ✓
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="relative z-10 py-16 md:py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-3 text-white">
              <span style={{ color: "#CCFF44" }}>6 features</span> that make learning easier
            </h2>
            <p className="text-center mb-12 text-base text-blue-200/60">
              Every feature is built to help kids learn better and parents worry less.
            </p>

            <div className="grid md:grid-cols-3 gap-5">
              {FEATURES.map((f, i) => (
                <div
                  key={i}
                  className="rounded-2xl p-6 border border-white/15 bg-white/5 backdrop-blur-sm hover:-translate-y-1 hover:bg-white/10 transition-all duration-300 group"
                >
                  <div className="mb-3 group-hover:scale-110 transition-transform origin-left">
                    <Icon size={44}>{f.icon}</Icon>
                  </div>
                  <h3 className="text-lg font-black mb-1.5 text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-blue-200/60">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tree silhouettes at very bottom of night zone */}
        <svg className="relative w-full" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" style={{ height: "100px", marginBottom: "-2px" }}>
          <path d="M0,120 L0,80 Q30,50 60,80 Q80,30 100,60 Q120,20 140,55 Q160,10 180,45 Q200,5 220,40 Q240,15 260,45 Q280,25 300,50 Q320,15 340,45 Q360,25 380,55 Q400,35 420,60 Q440,25 460,55 Q480,15 500,45 Q520,5 540,40 Q560,15 580,45 Q600,25 620,55 Q640,35 660,60 Q680,25 700,55 Q720,15 740,45 Q760,5 780,40 Q800,15 820,45 Q840,25 860,50 Q880,15 900,45 Q920,25 940,55 Q960,35 980,60 Q1000,25 1020,55 Q1040,15 1060,45 Q1080,5 1100,40 Q1120,15 1140,45 Q1160,25 1180,55 Q1200,35 1220,60 Q1240,25 1260,55 Q1280,15 1300,45 Q1320,5 1340,40 Q1360,15 1380,45 Q1400,25 1420,55 L1440,80 L1440,120 Z" fill={LIGHT_BG} />
        </svg>
      </div>

      {/* ────── How it works ────── */}
      <section className="py-16 md:py-24 px-6" style={{ background: GREEN_BG }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-3" style={{ color: DARK }}>
            <span style={{ color: GREEN }}>Get started</span> in 4 simple steps
          </h2>
          <p className="text-center mb-14 text-base" style={{ color: GRAY }}>
            No complicated setup — sign up and go.
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center group">
                <div
                  className="w-16 h-16 mx-auto rounded-2xl border-b-4 flex items-center justify-center p-3 mb-4 group-hover:-translate-y-1 transition-transform bg-white"
                  style={{ borderColor: GREEN_DARK, borderTopColor: GREEN, borderLeftColor: GREEN, borderRightColor: GREEN }}
                >
                  {s.icon}
                </div>
                <div
                  className="text-xs font-black mb-1 tracking-wide"
                  style={{ color: GREEN }}
                >
                  STEP {i + 1}
                </div>
                <h3 className="text-base font-black mb-1" style={{ color: DARK }}>{s.title}</h3>
                <p className="text-sm" style={{ color: GRAY }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Brand Story ────── */}
      <section className="py-16 md:py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <LogoIcon size={80} className="mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-black mb-6" style={{ color: DARK }}>
            Why <span style={{ color: GREEN }}>Firefly</span>?
          </h2>
          <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: GRAY }}>
            A single firefly doesn&rsquo;t look like much. But{" "}
            <span className="font-bold" style={{ color: DARK }}>
              gather enough of them
            </span>{" "}
            and you have light to read by.
            <br className="hidden md:block" />
            That&rsquo;s how learning works too — small wins, collected over time, become real understanding.
            <br className="hidden md:block" />
            <span className="font-bold" style={{ color: GREEN_DARK }}>
              We use AI to help every student gather their own fireflies.
            </span>
          </p>
          <div
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl border-2 border-b-4 text-sm font-bold"
            style={{ borderColor: GREEN, background: GREEN_LIGHT, color: GREEN_DARK }}
          >
            <LogoIcon size={24} />
            Small lights, big learning
          </div>
        </div>
      </section>

      {/* ────── CTA ────── */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="rounded-[2rem] p-10 md:p-16 text-white relative overflow-hidden border-b-[6px]"
            style={{ background: GREEN, borderBottomColor: GREEN_DARK }}
          >
            <LogoIcon size={64} className="mx-auto mb-6 relative z-10 drop-shadow-lg" />
            <h2 className="text-3xl md:text-4xl font-black mb-4 relative z-10">
              Ready to get started?
            </h2>
            <p className="text-lg md:text-xl opacity-90 mb-8 relative z-10">
              Sign up free and let AI help kids learn smarter.
            </p>
            <Link
              href="/login"
              className="inline-block px-10 py-4 text-lg font-black rounded-2xl border-b-4 border-gray-200 bg-white hover:-translate-y-1 active:translate-y-0 active:border-b-0 transition-all duration-150 shadow-xl relative z-10"
              style={{ color: GREEN_DARK }}
            >
              Try it now →
            </Link>
          </div>
        </div>
      </section>

      {/* ────── Footer ────── */}
      <footer className="py-8 px-6 bg-white border-t-[3px]" style={{ borderColor: GREEN_LIGHT }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={28} />
            <span className="text-lg font-black" style={{ color: DARK }}>Firefly</span>
            <span className="text-sm ml-1" style={{ color: GRAY }}>AI learning platform</span>
          </div>
          <p className="text-sm" style={{ color: GRAY }}>
            © {new Date().getFullYear()} Firefly. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ────── Animations ────── */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes firefly-glow {
          0%, 100% { opacity: 0; transform: translateY(0) translateX(0); }
          20% { opacity: 0.8; }
          50% { opacity: 1; transform: translateY(-15px) translateX(8px); }
          80% { opacity: 0.6; }
        }
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        .animate-firefly-glow {
          animation: firefly-glow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
