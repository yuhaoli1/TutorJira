import { requireRole } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/shared/sidebar";
import { ROLES } from "@/lib/constants";

const navItems = [
  { label: "My tasks", href: "/student/tasks" },
  { label: "Practice", href: "/student/practice" },
  { label: "Mistakes", href: "/student/wrong-book" },
  { label: "My grades", href: "/student/grades" },
];

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["student"]);

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
