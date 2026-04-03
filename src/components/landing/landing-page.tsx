"use client";

import Link from "next/link";
import Image from "next/image";

/* ── Brand Colors (from logo) ── */
const GREEN = "#8CC63F";
const GREEN_DARK = "#5A9A1F";
const GREEN_LIGHT = "#E8F5D6";
const GREEN_BG = "#F2FAE8";
const DARK = "#2D2D2D";
const GRAY = "#6B7280";
const LIGHT_BG = "#F9FDF4";

/* ── Data ── */
const FEATURES = [
  {
    icon: "📷",
    title: "拍照建题库",
    desc: "拍一张试卷，AI自动识别题目、分类知识点，秒速入库",
    border: "border-green-200",
    bg: "bg-green-50",
  },
  {
    icon: "🎯",
    title: "精准练习",
    desc: "按知识点、难度自由组卷，哪里不会练哪里",
    border: "border-blue-200",
    bg: "bg-blue-50",
  },
  {
    icon: "📕",
    title: "智能错题本",
    desc: "错题自动收集，一键重做，直到彻底掌握",
    border: "border-red-200",
    bg: "bg-red-50",
  },
  {
    icon: "📊",
    title: "数据看板",
    desc: "学习进度、正确率、薄弱环节，数据说话",
    border: "border-purple-200",
    bg: "bg-purple-50",
  },
  {
    icon: "👨‍👩‍👧",
    title: "家长实时看",
    desc: "孩子做了多少题、对了几道，手机随时看",
    border: "border-amber-200",
    bg: "bg-amber-50",
  },
  {
    icon: "📋",
    title: "老师布任务",
    desc: "一键布置练习任务，进度自动追踪，省心省力",
    border: "border-teal-200",
    bg: "bg-teal-50",
  },
];

const STEPS = [
  { num: "1", title: "注册登录", desc: "老师创建机构，邀请学生和家长", icon: "✨" },
  { num: "2", title: "建立题库", desc: "拍照上传试卷，AI自动提取题目", icon: "📷" },
  { num: "3", title: "布置练习", desc: "按知识点给学生布置任务", icon: "📋" },
  { num: "4", title: "数据追踪", desc: "实时查看学习进度和成绩", icon: "📈" },
];

const AUDIENCES = [
  {
    emoji: "🧒",
    label: "学生",
    tagline: "做题像闯关，越学越上瘾",
    points: ["趣味做题界面", "错题自动收集", "知识点闯关"],
    color: "bg-[#FFE8CC]",
    borderColor: "border-orange-300",
  },
  {
    emoji: "👨‍👩‍👧",
    label: "家长",
    tagline: "孩子学了什么，一眼就知道",
    points: ["实时成绩报告", "学习趋势分析", "薄弱点提醒"],
    color: "bg-[#D6F0FF]",
    borderColor: "border-blue-300",
  },
  {
    emoji: "🏫",
    label: "机构 / 老师",
    tagline: "轻松管理，专注教学",
    points: ["AI题库建设", "任务一键布置", "学生数据看板"],
    color: "bg-[#E8F5D6]",
    borderColor: "border-green-300",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden" style={{ background: LIGHT_BG }}>
      {/* ────── Nav ────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b-[3px] border-[#E8F5D6]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="拾萤" width={36} height={36} className="object-contain" />
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

      {/* ────── Hero ────── */}
      <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 px-6">
        {/* Background blobs */}
        <div className="absolute top-10 left-0 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: GREEN_LIGHT }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: "#D6F0FF" }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
            {/* Left: Text */}
            <div className="flex-1 text-center md:text-left">
              <div
                className="inline-block px-4 py-1.5 rounded-full text-sm font-bold mb-6 border-2"
                style={{ background: GREEN_LIGHT, color: GREEN_DARK, borderColor: GREEN }}
              >
                ✨ AI驱动的智能学习平台
              </div>

              <h1 className="text-4xl md:text-[3.5rem] font-black leading-[1.15] tracking-tight" style={{ color: DARK }}>
                让每个孩子
                <br />
                <span style={{ color: GREEN }}>爱上学习</span>
              </h1>

              <p className="mt-5 text-base md:text-lg leading-relaxed max-w-lg" style={{ color: GRAY }}>
                源自「囊萤映雪」—— 拾起萤火，照亮求知之路。
                <br />
                AI建题库、智能练习、错题追踪，让学习更高效。
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 md:justify-start justify-center">
                <Link
                  href="/login"
                  className="group px-8 py-4 text-base font-bold text-white rounded-2xl border-b-4 hover:-translate-y-0.5 active:translate-y-0 active:border-b-0 transition-all duration-150 shadow-lg"
                  style={{ background: GREEN, borderBottomColor: GREEN_DARK, boxShadow: `0 8px 24px ${GREEN}40` }}
                >
                  免费开始使用
                  <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </Link>
                <a
                  href="#features"
                  className="px-8 py-4 text-base font-bold rounded-2xl border-2 border-gray-200 hover:border-green-300 transition-colors"
                  style={{ color: GRAY }}
                >
                  了解更多
                </a>
              </div>
            </div>

            {/* Right: Mascot */}
            <div className="flex-shrink-0 relative">
              <div className="relative">
                {/* Glow behind mascot */}
                <div
                  className="absolute inset-0 rounded-full blur-2xl opacity-30 scale-90"
                  style={{ background: GREEN }}
                />
                <Image
                  src="/logo.png"
                  alt="拾萤"
                  width={320}
                  height={320}
                  className="relative z-10 object-contain drop-shadow-2xl animate-mascot-float"
                  priority
                />
              </div>
              {/* Floating badges */}
              <div className="absolute -top-2 -right-2 px-3 py-1.5 bg-white rounded-xl shadow-lg border-2 border-green-200 text-sm font-bold animate-badge-float" style={{ color: GREEN_DARK }}>
                🎯 精准练习
              </div>
              <div className="absolute -bottom-4 -left-4 px-3 py-1.5 bg-white rounded-xl shadow-lg border-2 border-blue-200 text-sm font-bold animate-badge-float-delayed text-blue-600">
                📕 错题追踪
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────── Trusted By (social proof strip) ────── */}
      <section className="py-8 border-y-[3px]" style={{ borderColor: GREEN_LIGHT, background: "white" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-8 md:gap-16 px-6">
          {[
            { num: "AI", label: "智能驱动" },
            { num: "4角色", label: "学生·家长·老师·管理" },
            { num: "∞", label: "题库无限扩展" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-xl md:text-2xl font-black" style={{ color: DARK }}>{s.num}</div>
              <div className="text-xs md:text-sm mt-0.5" style={{ color: GRAY }}>{s.label}</div>
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
                className={`${a.color} rounded-3xl p-7 border-2 ${a.borderColor} border-b-4 hover:-translate-y-2 transition-all duration-300`}
              >
                <div className="text-4xl mb-3">{a.emoji}</div>
                <h3 className="text-xl font-black mb-1" style={{ color: DARK }}>{a.label}</h3>
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
                className={`${f.bg} rounded-2xl p-6 border-2 ${f.border} border-b-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group`}
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">
                  {f.icon}
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
                  className="w-16 h-16 mx-auto rounded-2xl border-b-4 flex items-center justify-center text-2xl font-black text-white mb-4 group-hover:-translate-y-1 transition-transform"
                  style={{ background: GREEN, borderBottomColor: GREEN_DARK }}
                >
                  {s.icon}
                </div>
                <div
                  className="text-xs font-black mb-1 tracking-wide"
                  style={{ color: GREEN }}
                >
                  STEP {s.num}
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
          <Image src="/logo.png" alt="拾萤" width={80} height={80} className="mx-auto mb-6 object-contain" />
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
            <Image src="/logo.png" alt="拾萤" width={24} height={24} className="object-contain" />
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
            {/* Floating circles */}
            <div className="absolute top-6 left-10 w-20 h-20 rounded-full bg-white/10 animate-mascot-float" />
            <div className="absolute bottom-10 right-10 w-14 h-14 rounded-full bg-white/10 animate-badge-float" />
            <div className="absolute top-1/2 right-1/4 w-8 h-8 rounded-full bg-white/10 animate-badge-float-delayed" />

            <Image src="/logo.png" alt="拾萤" width={64} height={64} className="mx-auto mb-6 object-contain relative z-10 drop-shadow-lg" />
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
            <Image src="/logo.png" alt="拾萤" width={28} height={28} className="object-contain" />
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
        @keyframes mascot-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes badge-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes badge-float-delayed {
          0%, 100% { transform: translateY(0) rotate(2deg); }
          50% { transform: translateY(-10px) rotate(-2deg); }
        }
        .animate-mascot-float {
          animation: mascot-float 3s ease-in-out infinite;
        }
        .animate-badge-float {
          animation: badge-float 3.5s ease-in-out infinite;
        }
        .animate-badge-float-delayed {
          animation: badge-float-delayed 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
