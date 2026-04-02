"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

const FIREFLY_COUNT = 12;

function Firefly({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <div
      className="absolute w-2 h-2 rounded-full bg-yellow-300 opacity-0 animate-firefly pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}

const fireflies = Array.from({ length: FIREFLY_COUNT }, (_, i) => ({
  delay: Math.random() * 5,
  x: Math.random() * 100,
  y: Math.random() * 100,
}));

const FEATURES = [
  {
    emoji: "🎯",
    title: "智能题库",
    desc: "AI自动识别、分类题目，按知识点精准练习",
    color: "bg-orange-100",
  },
  {
    emoji: "📊",
    title: "错题追踪",
    desc: "自动收集错题，智能分析薄弱环节，重做巩固",
    color: "bg-blue-100",
  },
  {
    emoji: "👨‍👩‍👧",
    title: "家长监管",
    desc: "实时查看孩子学习进度、成绩趋势，放心托管",
    color: "bg-green-100",
  },
  {
    emoji: "🏫",
    title: "机构管理",
    desc: "老师布置任务、管理学生，数据一目了然",
    color: "bg-purple-100",
  },
  {
    emoji: "🤖",
    title: "AI辅助",
    desc: "拍照上传试卷，AI自动提取题目入库，省时省力",
    color: "bg-pink-100",
  },
  {
    emoji: "🎮",
    title: "趣味学习",
    desc: "游戏化做题体验，让孩子爱上学习、主动练习",
    color: "bg-yellow-100",
  },
];

const AUDIENCES = [
  {
    emoji: "👧",
    label: "学生",
    tagline: "做题像闯关，越学越上瘾",
    points: ["趣味做题界面", "错题智能复习", "知识点闯关模式"],
    gradient: "from-amber-400 to-orange-400",
    bgLight: "bg-orange-50",
  },
  {
    emoji: "👨‍👩‍👧",
    label: "家长",
    tagline: "孩子学了什么，一眼就知道",
    points: ["实时成绩报告", "学习趋势分析", "薄弱知识点提醒"],
    gradient: "from-green-400 to-emerald-400",
    bgLight: "bg-green-50",
  },
  {
    emoji: "🏫",
    label: "机构",
    tagline: "轻松管理，专注教学",
    points: ["AI题库自动建设", "任务一键布置", "学生数据看板"],
    gradient: "from-blue-400 to-indigo-400",
    bgLight: "bg-blue-50",
  },
];

export function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFDF7] overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFDF7]/80 backdrop-blur-md border-b border-amber-100/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-1.5">
            <Image src="/logo.png" alt="拾萤" width={32} height={32} className="object-contain" />
            <span className="text-xl font-extrabold text-[#2E3338] tracking-tight">拾萤</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-semibold text-[#2E3338] hover:text-amber-600 transition-colors"
            >
              登录
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-400 to-orange-400 rounded-full shadow-lg shadow-amber-200/50 hover:shadow-xl hover:shadow-amber-300/50 hover:-translate-y-0.5 transition-all duration-200"
            >
              免费开始
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-6 overflow-hidden">
        {/* Fireflies */}
        <div className="absolute inset-0">
          {fireflies.map((f, i) => (
            <Firefly key={i} {...f} />
          ))}
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Mascot area */}
          <div className="mb-8 relative inline-block">
            <Image src="/logo.png" alt="拾萤" width={160} height={160} className="object-contain animate-bounce-slow" />
            {/* Small floating elements */}
            <div className="absolute -top-2 -right-4 w-8 h-8 bg-green-300 rounded-xl rotate-12 flex items-center justify-center text-lg animate-float-delayed">
              ✨
            </div>
            <div className="absolute -bottom-1 -left-6 w-10 h-10 bg-blue-200 rounded-2xl -rotate-6 flex items-center justify-center text-xl animate-float">
              📖
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-[#2E3338] tracking-tight leading-tight">
            拾萤
            <span className="block text-2xl md:text-3xl mt-2 font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              用AI点亮每一步学习之路
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-[#6B7280] max-w-2xl mx-auto leading-relaxed">
            源自<span className="text-amber-600 font-medium">「囊萤映雪」</span>的古老智慧 ——
            <br className="hidden md:block" />
            拾起萤火，照亮求知的旅途。AI驱动的智能学习平台，
            <br className="hidden md:block" />
            让每个孩子都能找到属于自己的光。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="group px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl shadow-xl shadow-amber-200/50 hover:shadow-2xl hover:shadow-amber-300/50 hover:-translate-y-1 transition-all duration-300"
            >
              开始使用
              <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a
              href="#features"
              className="px-8 py-4 text-lg font-semibold text-[#6B7280] bg-white rounded-2xl border-2 border-gray-200 hover:border-amber-300 hover:text-amber-600 transition-all duration-200"
            >
              了解更多
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 flex items-center justify-center gap-8 md:gap-16">
            {[
              { num: "AI", label: "智能驱动" },
              { num: "4", label: "角色协同" },
              { num: "∞", label: "题库拓展" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-black text-[#2E3338]">{s.num}</div>
                <div className="text-xs md:text-sm text-[#B4BCC8] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl" />
      </section>

      {/* Audiences */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center text-[#2E3338] mb-4">
            为每个人而设计
          </h2>
          <p className="text-center text-[#6B7280] mb-14 text-lg">
            无论你是学生、家长还是机构，拾萤都为你准备好了
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {AUDIENCES.map((a, i) => (
              <div
                key={i}
                className={`${a.bgLight} rounded-3xl p-8 border-2 border-transparent hover:border-amber-200 hover:-translate-y-2 transition-all duration-300 group`}
              >
                <div className="text-5xl mb-4">{a.emoji}</div>
                <h3 className="text-xl font-bold text-[#2E3338] mb-1">{a.label}</h3>
                <p className={`text-sm font-semibold bg-gradient-to-r ${a.gradient} bg-clip-text text-transparent mb-4`}>
                  {a.tagline}
                </p>
                <ul className="space-y-2">
                  {a.points.map((p, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-[#4D5766]">
                      <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-xs shadow-sm">
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

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center text-[#2E3338] mb-4">
            强大功能，简单体验
          </h2>
          <p className="text-center text-[#6B7280] mb-14 text-lg">
            AI + 教育，释放每个孩子的潜力
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group rounded-3xl bg-[#FFFDF7] p-6 border border-gray-100 hover:shadow-xl hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`${f.color} w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                  {f.emoji}
                </div>
                <h3 className="text-lg font-bold text-[#2E3338] mb-2">{f.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story / Brand section */}
      <section className="py-20 px-6 bg-gradient-to-b from-amber-50/50 to-[#FFFDF7]">
        <div className="max-w-3xl mx-auto text-center">
          <Image src="/logo.png" alt="拾萤" width={80} height={80} className="mx-auto mb-6 object-contain" />
          <h2 className="text-3xl md:text-4xl font-black text-[#2E3338] mb-6">
            「囊萤映雪」
          </h2>
          <p className="text-lg text-[#6B7280] leading-relaxed mb-8">
            晋代车胤家贫，夏日捕捉萤火虫照明读书。
            <br />
            千年后的今天，我们用AI重新「拾」起那些萤火 ——
            <br />
            <span className="font-semibold text-amber-600">
              让科技成为照亮学习之路的微光，
              <br />
              帮助每个孩子在求知路上，不再独行。
            </span>
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-md text-sm text-[#4D5766]">
            <Image src="/logo.png" alt="拾萤" width={24} height={24} className="object-contain" />
            <span className="font-bold text-[#2E3338]">拾萤</span> —— 拾起萤火，点亮未来
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-[2rem] p-12 md:p-16 text-white relative overflow-hidden">
            {/* Floating dots */}
            <div className="absolute top-4 left-8 w-4 h-4 bg-white/20 rounded-full animate-float" />
            <div className="absolute top-12 right-12 w-6 h-6 bg-white/15 rounded-full animate-float-delayed" />
            <div className="absolute bottom-8 left-16 w-3 h-3 bg-white/25 rounded-full animate-bounce-slow" />

            <h2 className="text-3xl md:text-4xl font-black mb-4 relative z-10">
              准备好开始了吗？
            </h2>
            <p className="text-lg md:text-xl opacity-90 mb-8 relative z-10">
              免费注册，让AI帮助孩子更聪明地学习
            </p>
            <Link
              href="/login"
              className="inline-block px-10 py-4 text-lg font-bold text-amber-500 bg-white rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative z-10"
            >
              立即体验 →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-amber-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <Image src="/logo.png" alt="拾萤" width={28} height={28} className="object-contain" />
            <span className="text-lg font-bold text-[#2E3338]">拾萤</span>
            <span className="text-sm text-[#B4BCC8] ml-2">AI智能学习平台</span>
          </div>
          <p className="text-sm text-[#B4BCC8]">
            © {new Date().getFullYear()} 拾萤 ShiYing. All rights reserved.
          </p>
        </div>
      </footer>

      <style jsx>{`
        @keyframes firefly {
          0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
          50% { opacity: 0.8; transform: translateY(-20px) scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        .animate-firefly {
          animation: firefly 4s ease-in-out infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 4s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
