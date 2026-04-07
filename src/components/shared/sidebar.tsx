"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
}

// Icons keyed by route href so they survive translations.
const EMOJI_BY_HREF: Record<string, string> = {
  "/admin/dashboard": "📊",
  "/teacher/dashboard": "📊",
  "/teacher/tasks": "📋",
  "/teacher/questions": "📚",
  "/teacher/students": "👨‍🎓",
  "/admin/students": "👨‍🎓",
  "/parent/dashboard": "👪",
  "/admin/settings": "⚙️",
  "/student/tasks": "📋",
  "/student/practice": "✏️",
  "/student/wrong-book": "📕",
  "/student/grades": "📈",
  "/parent/tasks": "📋",
  "/parent/children": "📈",
};

// When an admin browses any sub-app the sidebar always shows the admin nav.
const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Tasks", href: "/teacher/tasks" },
  { label: "Question bank", href: "/teacher/questions" },
  { label: "Students", href: "/teacher/students" },
  { label: "Parent view", href: "/parent/dashboard" },
  { label: "Settings", href: "/admin/settings" },
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
  const t = useTranslations("Common");
  const displayNavItems = userRole === "admin" ? ADMIN_NAV_ITEMS : navItems;
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-[#E8EAED] bg-white px-4 py-3 md:hidden">
        <span className="text-sm font-semibold text-[#2E3338]">{title}</span>
        <span className="text-xs text-[#B4BCC8]">{userName}</span>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-[#E8EAED] bg-white">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="px-5 pt-6 pb-4">
            <h1 className="text-sm font-bold text-[#2E3338] leading-snug tracking-tight flex items-center gap-1.5">
              <img src="/logo.png" alt="Firefly" className="w-6 h-6 object-contain flex-shrink-0" />
              {title}
            </h1>
            <p className="mt-1 text-xs text-[#B4BCC8]">
              {userName} · {role}
            </p>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {displayNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const emoji = EMOJI_BY_HREF[item.href] || "";
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
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[#E8EAED] bg-white py-2 md:hidden">
        {displayNavItems.slice(0, 5).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const emoji = EMOJI_BY_HREF[item.href] || "";
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
