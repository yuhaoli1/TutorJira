import { requireRole } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/shared/sidebar";
import { ROLES } from "@/lib/constants";

const navItems = [
  { label: "工作台", href: "/teacher/dashboard" },
  { label: "打卡管理", href: "/teacher/checkins" },
  { label: "任务管理", href: "/teacher/tasks" },
  { label: "题库", href: "/teacher/questions" },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "teacher"]);

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
