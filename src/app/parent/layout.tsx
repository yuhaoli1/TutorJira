import { requireRole } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/shared/sidebar";
import { ROLES } from "@/lib/constants";

const navItems = [
  { label: "首页", href: "/parent/dashboard" },
  { label: "今日打卡", href: "/parent/checkin" },
  { label: "任务", href: "/parent/tasks" },
  { label: "孩子", href: "/parent/children" },
];

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["parent"]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar
        title="优培科技辅导学习平台"
        navItems={navItems}
        userName={user.name}
        role={ROLES[user.role]}
      />
      <main className="pt-14 pb-16 md:pt-0 md:pb-0 md:pl-60">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
