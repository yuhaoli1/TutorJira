import { requireRole } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/shared/sidebar";
import { ROLES } from "@/lib/constants";

const navItems = [
  { label: "Overview", href: "/teacher/dashboard" },
  { label: "Tasks", href: "/teacher/tasks" },
  { label: "Question bank", href: "/teacher/questions" },
  { label: "Students", href: "/teacher/students" },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "teacher"]);

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
