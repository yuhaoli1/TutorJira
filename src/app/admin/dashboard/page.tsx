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
    { label: "学生总数", value: studentCount ?? 0 },
    { label: "老师人数", value: teacherCount ?? 0 },
    { label: "任务总数", value: taskCount ?? 0 },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900">总览</h2>
      <p className="mt-1 text-sm text-zinc-500">欢迎回来，{user.name}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white p-6 shadow-sm border"
          >
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-zinc-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
