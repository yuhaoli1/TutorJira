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

interface SidebarProps {
  title: string;
  navItems: NavItem[];
  userName: string;
  role: string;
}

export function Sidebar({ title, navItems, userName, role }: SidebarProps) {
  const pathname = usePathname();
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
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <span className="text-lg font-bold">{title}</span>
        <span className="text-sm text-zinc-500">{userName}</span>
      </nav>

      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r bg-white">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6">
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {userName} · {role}
            </p>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-3 border-t">
            <button
              onClick={handleLogout}
              className="flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </aside>

      {/* 移动端底部导航 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-white py-2 md:hidden">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
              pathname === item.href
                ? "text-blue-600 font-medium"
                : "text-zinc-500"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
