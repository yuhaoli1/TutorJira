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
    title: "拍照建题库",
    desc: "拍一张试卷，AI自动识别题目、分类知识点，秒速入库",
  },
  {
    icon: Icons.target,
    title: "精准练习",
    desc: "按知识点、难度自由组卷，哪里不会练哪里",
  },
  {
    icon: Icons.book,
    title: "智能错题本",
    desc: "错题自动收集，一键重做，直到彻底掌握",
  },
  {
    icon: Icons.chart,
    title: "数据看板",
    desc: "学习进度、正确率、薄弱环节，数据说话",
  },
  {
    icon: Icons.family,
    title: "家长实时看",
    desc: "孩子做了多少题、对了几道，手机随时看",
  },
  {
    icon: Icons.clipboard,
    title: "老师布任务",
    desc: "一键布置练习任务，进度自动追踪，省心省力",
  },
];

const STEPS = [
  { icon: Icons.sparkle, title: "注册登录", desc: "老师创建机构，邀请学生和家长" },
  { icon: Icons.upload, title: "建立题库", desc: "拍照上传试卷，AI自动提取题目" },
  { icon: Icons.clipboard, title: "布置练习", desc: "按知识点给学生布置任务" },
  { icon: Icons.trending, title: "数据追踪", desc: "实时查看学习进度和成绩" },
];

const AUDIENCES = [
  {
    icon: Icons.student,
    label: "学生",
    tagline: "做题像闯关，越学越上瘾",
    points: ["趣味做题界面", "错题自动收集", "知识点闯关"],
  },
  {
    icon: Icons.parents,
    label: "家长",
    tagline: "孩子学了什么，一眼就知道",
    points: ["实时成绩报告", "学习趋势分析", "薄弱点提醒"],
  },
  {
    icon: Icons.school,
    label: "机构 / 老师",
    tagline: "轻松管理，专注教学",
    points: ["AI题库建设", "任务一键布置", "学生数据看板"],
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ background: LIGHT_BG }}>
      {/* ────── Nav ────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b-[3px] border-[#E8F5D6]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <LogoIcon size={36} />
            <span className="text-xl font-black tracking-tight" style={{ color: DARK }}>
              拾萤
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-bold rounded-xl transition-colors hover:bg-gray-100"
              style={{ color: DARK }}
            >
              登录
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-bold text-white rounded-xl border-b-[3px] hover:-translate-y-0.5 active:translate-y-0 active:border-b-0 transition-all duration-150"
              style={{ background: GREEN, borderBottomColor: GREEN_DARK }}
            >
              免费开始
            </Link>
          </div>
        </div>
      </nav>

      {/* ────── Hero (Night Forest) ────── */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 px-6 overflow-hidden" style={{ background: "linear-gradient(180deg, #0B1D0E 0%, #132A17 40%, #1A3520 70%, #1F4028 100%)" }}>
        {/* Stars */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { x: 10, y: 15, s: 2, d: 3 }, { x: 25, y: 8, s: 1.5, d: 5 }, { x: 45, y: 20, s: 2, d: 2 },
            { x: 65, y: 12, s: 1, d: 4 }, { x: 80, y: 18, s: 2.5, d: 3.5 }, { x: 90, y: 8, s: 1.5, d: 6 },
            { x: 15, y: 30, s: 1, d: 4.5 }, { x: 55, y: 5, s: 2, d: 2.5 }, { x: 35, y: 25, s: 1.5, d: 5.5 },
            { x: 72, y: 28, s: 1, d: 3.2 },
          ].map((star, i) => (
            <div
              key={`star-${i}`}
              className="absolute rounded-full bg-white animate-twinkle"
              style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.s, height: star.s, animationDelay: `${star.d}s` }}
            />
          ))}
        </div>

        {/* Firefly glow particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { x: 8, y: 40, d: 0 }, { x: 20, y: 60, d: 1.5 }, { x: 35, y: 35, d: 3 },
            { x: 50, y: 55, d: 0.8 }, { x: 65, y: 45, d: 2.2 }, { x: 78, y: 65, d: 4 },
            { x: 88, y: 35, d: 1 }, { x: 42, y: 70, d: 3.5 }, { x: 15, y: 75, d: 2.8 },
            { x: 72, y: 25, d: 4.5 }, { x: 58, y: 80, d: 1.2 }, { x: 30, y: 50, d: 5 },
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

        {/* Tree silhouettes (SVG) */}
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 200" fill="none" preserveAspectRatio="none" style={{ height: "180px" }}>
          {/* Back layer - lighter */}
          <path d="M0,200 L0,120 Q30,80 60,120 Q80,60 100,100 Q120,50 140,90 Q160,40 180,80 Q200,30 220,70 Q240,20 260,60 Q280,30 300,70 Q320,40 340,80 Q360,50 380,90 Q400,60 420,100 Q440,50 460,90 Q480,40 500,80 Q520,30 540,70 Q560,40 580,80 Q600,50 620,90 Q640,60 660,100 Q680,50 700,90 Q720,40 740,80 Q760,30 780,70 Q800,20 820,60 Q840,30 860,70 Q880,40 900,80 Q920,50 940,90 Q960,60 980,100 Q1000,50 1020,90 Q1040,40 1060,80 Q1080,30 1100,70 Q1120,40 1140,80 Q1160,50 1180,90 Q1200,60 1220,100 Q1240,50 1260,90 Q1280,40 1300,80 Q1320,30 1340,70 Q1360,20 1380,60 Q1400,40 1420,80 L1440,120 L1440,200 Z" fill="#0F2513" fillOpacity="0.5" />
          {/* Front layer - darker */}
          <path d="M0,200 L0,150 Q40,110 80,140 Q110,90 140,130 Q170,80 200,120 Q230,70 260,110 Q290,80 320,120 Q350,90 380,130 Q410,100 440,140 Q470,90 500,130 Q530,80 560,120 Q590,70 620,110 Q650,80 680,120 Q710,90 740,130 Q770,100 800,140 Q830,90 860,130 Q890,80 920,120 Q950,70 980,110 Q1010,80 1040,120 Q1070,90 1100,130 Q1130,100 1160,140 Q1190,90 1220,130 Q1250,80 1280,120 Q1310,70 1340,110 Q1370,80 1400,120 L1440,150 L1440,200 Z" fill="#0F2513" fillOpacity="0.8" />
        </svg>

        {/* Content */}
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            {/* Left: Text */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold mb-6 border border-white/20 bg-white/10 text-green-300 backdrop-blur-sm">
                <Icon size={20}>{Icons.sparkle}</Icon>
                AI驱动的智能学习平台
              </div>

              <h1 className="text-4xl md:text-[3.5rem] font-black leading-[1.15] tracking-tight text-white">
                让每个孩子
                <br />
                <span style={{ color: "#CCFF44" }}>爱上学习</span>
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed max-w-lg text-green-100/80">
                源自「囊萤映雪」—— 拾起萤火，照亮求知之路。
                <br />
                AI建题库、智能练习、错题追踪，让学习更高效。
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 md:justify-start justify-center">
                <Link
                  href="/login"
                  className="group px-8 py-4 text-base font-bold text-[#0B1D0E] rounded-2xl border-b-4 hover:-translate-y-0.5 active:translate-y-0 active:border-b-0 transition-all duration-150 shadow-lg"
                  style={{ background: "#CCFF44", borderBottomColor: "#9ABF33", boxShadow: "0 8px 24px rgba(200,255,50,0.3)" }}
                >
                  免费开始使用
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <a
                  href="#features"
                  className="px-8 py-4 text-base font-bold rounded-2xl border-2 border-white/20 text-white/80 hover:border-green-400/50 hover:text-white transition-colors backdrop-blur-sm"
                >
                  了解更多
                </a>
              </div>
            </div>

            {/* Right: Mascot with glow */}
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 rounded-full blur-3xl opacity-20" style={{ background: "#CCFF44" }} />
              <LogoIcon size={360} className="relative z-10 drop-shadow-[0_0_40px_rgba(200,255,50,0.3)]" />
            </div>
          </div>
        </div>
      </section>

      {/* ────── Social proof ────── */}
      <section className="py-10 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-6 md:gap-10">
          {[
            { num: "AI", label: "Claude · GPT · DeepSeek · Gemini", sub: "自由切换，不绑定任何模型" },
            { num: "4角色", label: "学生·家长·老师·管理", sub: "多角色协同" },
            { num: "∞", label: "题库无限扩展", sub: "拍照即入库" },
          ].map((s, i) => (
            <div
              key={i}
              className="text-center px-5 py-3 rounded-2xl border-2 border-b-4"
              style={{ borderColor: "#C8E6A0", background: "white" }}
            >
              <div className="text-lg md:text-xl font-black" style={{ color: DARK }}>{s.num}</div>
              <div className="text-xs font-bold mt-0.5" style={{ color: GREEN_DARK }}>{s.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: GRAY }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ────── Audiences ────── */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-3" style={{ color: DARK }}>
            为<span style={{ color: GREEN }}>每个人</span>而设计
          </h2>
          <p className="text-center mb-12 text-base" style={{ color: GRAY }}>
            学生、家长、机构，都能找到属于自己的价值
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {AUDIENCES.map((a, i) => (
              <div
                key={i}
                className="rounded-3xl p-7 border-2 border-b-4 hover:-translate-y-2 transition-all duration-300"
                style={{ background: GREEN_LIGHT, borderColor: GREEN }}
              >
                <Icon size={56}>{a.icon}</Icon>
                <h3 className="text-xl font-black mb-1 mt-3" style={{ color: DARK }}>{a.label}</h3>
                <p className="text-sm font-bold mb-4" style={{ color: GREEN_DARK }}>{a.tagline}</p>
                <ul className="space-y-2">
                  {a.points.map((p, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm" style={{ color: DARK }}>
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: GREEN }}
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

      {/* ────── Features ────── */}
      <section id="features" className="py-16 md:py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-3" style={{ color: DARK }}>
            <span style={{ color: GREEN }}>6大功能</span>，让学习更简单
          </h2>
          <p className="text-center mb-12 text-base" style={{ color: GRAY }}>
            每一个功能都是为了让孩子学得更好、家长更放心
          </p>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 border-2 border-b-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
                style={{ background: GREEN_BG, borderColor: "#C8E6A0" }}
              >
                <div className="mb-3 group-hover:scale-110 transition-transform origin-left">
                  <Icon size={44}>{f.icon}</Icon>
                </div>
                <h3 className="text-lg font-black mb-1.5" style={{ color: DARK }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: GRAY }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────── How it works ────── */}
      <section className="py-16 md:py-24 px-6" style={{ background: GREEN_BG }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-3" style={{ color: DARK }}>
            4步开始，<span style={{ color: GREEN }}>超级简单</span>
          </h2>
          <p className="text-center mb-14 text-base" style={{ color: GRAY }}>
            不需要复杂的配置，注册即用
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
            为什么叫<span style={{ color: GREEN }}>「拾萤」</span>？
          </h2>
          <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: GRAY }}>
            晋代车胤家贫，夏日捕捉萤火虫照明读书 —— 这就是
            <span className="font-bold" style={{ color: DARK }}>「囊萤映雪」</span>的故事。
            <br className="hidden md:block" />
            千年后的今天，我们用AI重新「拾」起那些萤火，
            <br className="hidden md:block" />
            <span className="font-bold" style={{ color: GREEN_DARK }}>
              让科技成为照亮学习之路的微光。
            </span>
          </p>
          <div
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl border-2 border-b-4 text-sm font-bold"
            style={{ borderColor: GREEN, background: GREEN_LIGHT, color: GREEN_DARK }}
          >
            <LogoIcon size={24} />
            拾起萤火，点亮未来
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
              准备好开始了吗？
            </h2>
            <p className="text-lg md:text-xl opacity-90 mb-8 relative z-10">
              免费注册，让AI帮助孩子更聪明地学习
            </p>
            <Link
              href="/login"
              className="inline-block px-10 py-4 text-lg font-black rounded-2xl border-b-4 border-gray-200 bg-white hover:-translate-y-1 active:translate-y-0 active:border-b-0 transition-all duration-150 shadow-xl relative z-10"
              style={{ color: GREEN_DARK }}
            >
              立即体验 →
            </Link>
          </div>
        </div>
      </section>

      {/* ────── Footer ────── */}
      <footer className="py-8 px-6 bg-white border-t-[3px]" style={{ borderColor: GREEN_LIGHT }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <LogoIcon size={28} />
            <span className="text-lg font-black" style={{ color: DARK }}>拾萤</span>
            <span className="text-sm ml-1" style={{ color: GRAY }}>AI智能学习平台</span>
          </div>
          <p className="text-sm" style={{ color: GRAY }}>
            © {new Date().getFullYear()} 拾萤 ShiYing. All rights reserved.
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
