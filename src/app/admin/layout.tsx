import { requireRole } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/shared/sidebar";
import { ROLES } from "@/lib/constants";

const navItems = [
  { label: "总览", href: "/admin/dashboard" },
  { label: "任务管理", href: "/teacher/tasks" },
  { label: "学生管理", href: "/admin/students" },
  { label: "家长视角", href: "/parent/dashboard" },
  { label: "设置", href: "/admin/settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin"]);

  return (
    <div className="min-h-screen bg-white">
      <Sidebar
        title="优培科技辅导学习平台"
        navItems={navItems}
        userName={user.name}
        role={ROLES[user.role]}
        userRole={user.role}
      />
      <main className="pt-14 pb-16 md:pt-0 md:pb-0 md:pl-56">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
