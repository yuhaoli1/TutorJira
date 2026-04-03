import { requireRole } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/shared/sidebar";
import { ROLES } from "@/lib/constants";

const navItems = [
  { label: "我的任务", href: "/student/tasks" },
  { label: "做题练习", href: "/student/practice" },
  { label: "错题集", href: "/student/wrong-book" },
  { label: "我的成绩", href: "/student/grades" },
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
        title="拾萤"
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
