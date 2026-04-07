import { requireRole } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/shared/sidebar";
import { ROLES } from "@/lib/constants";

const navItems = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Tasks", href: "/teacher/tasks" },
  { label: "Students", href: "/admin/students" },
  { label: "Parent view", href: "/parent/dashboard" },
  { label: "Settings", href: "/admin/settings" },
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
        title="Firefly"
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
