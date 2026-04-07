import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const user = await requireRole(["admin"]);
  const supabase = await createClient();

  const [
    { count: studentCount },
    { count: teacherCount },
    { count: taskCount },
  ] = await Promise.all([
    supabase.from("students").select("*", { count: "exact", head: true }),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("tasks").select("*", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Total students", value: studentCount ?? 0 },
    { label: "Total teachers", value: teacherCount ?? 0 },
    { label: "Total tasks", value: taskCount ?? 0 },
  ];

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">Overview</h2>
      <p className="mt-1 text-sm text-[#B4BCC8]">Welcome back, {user.name}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white p-8 border border-[#E8EAED]"
          >
            <p className="text-sm text-[#B4BCC8]">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-[#2E3338]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
