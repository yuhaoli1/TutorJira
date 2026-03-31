"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
}

const EMOJI_MAP: Record<string, string> = {
  "总览": "📊",
  "任务管理": "📋",
  "题库管理": "📚",
  "学生管理": "👨‍🎓",
  "家长视角": "👪",
  "设置": "⚙️",
  "我的任务": "📋",
  "我的成绩": "📈",
  "孩子成绩": "📈",
};

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "总览", href: "/admin/dashboard" },
  { label: "任务管理", href: "/teacher/tasks" },
  { label: "题库管理", href: "/teacher/questions" },
  { label: "学生管理", href: "/admin/students" },
  { label: "家长视角", href: "/parent/dashboard" },
  { label: "设置", href: "/admin/settings" },
];

interface SidebarProps {
  title: string;
  navItems: NavItem[];
  userName: string;
  role: string;
  userRole?: string;
}

export function Sidebar({ title, navItems, userName, role, userRole }: SidebarProps) {
  const pathname = usePathname();
  const displayNavItems = userRole === "admin" ? ADMIN_NAV_ITEMS : navItems;
  const displayRole = userRole === "admin" ? "管理员" : role;
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* 移动端顶部导航 */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[#E8EAED] bg-white px-4 py-3 md:hidden">
        <span className="text-sm font-semibold text-[#2E3338]">{title}</span>
        <span className="text-xs text-[#B4BCC8]">{userName}</span>
      </nav>

      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-[#E8EAED] bg-white">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-5 pt-6 pb-4">
            <h1 className="text-sm font-bold text-[#2E3338] leading-snug tracking-tight">{title}</h1>
            <p className="mt-1 text-xs text-[#B4BCC8]">
              {userName} · {displayRole}
            </p>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {displayNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const emoji = EMOJI_MAP[item.label] || "";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-150",
                    isActive
                      ? "bg-[#163300] text-white"
                      : "text-[#4D5766] hover:bg-[#F4F5F6] hover:text-[#2E3338]"
                  )}
                >
                  {emoji && <span className="text-sm leading-none">{emoji}</span>}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 py-3 border-t border-[#E8EAED]">
            <button
              onClick={handleLogout}
              className="flex w-full items-center rounded-full px-3.5 py-2 text-[13px] font-medium text-[#B4BCC8] hover:bg-[#F4F5F6] hover:text-[#4D5766] transition-colors duration-150"
            >
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#E8EAED] bg-white py-2 md:hidden">
        {displayNavItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const emoji = EMOJI_MAP[item.label] || "";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors duration-150",
                isActive
                  ? "text-[#163300] font-medium"
                  : "text-[#B4BCC8]"
              )}
            >
              {emoji && <span className="text-sm">{emoji}</span>}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
