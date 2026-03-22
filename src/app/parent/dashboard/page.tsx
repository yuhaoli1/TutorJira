import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ParentDashboard() {
  const user = await requireRole(["parent"]);
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];

  // 获取绑定的学生
  const { data: relations } = await supabase
    .from("parent_student")
    .select("student_id")
    .eq("parent_id", user.id);

  const studentIds =
    (relations as { student_id: string }[] | null)?.map((r) => r.student_id) ?? [];

  let pendingTaskCount = 0;
  let todayCheckinCount = 0;
  let totalCheckinItems = 0;

  if (studentIds.length > 0) {
    const [tasks, checkins, items] = await Promise.all([
      supabase
        .from("task_assignments")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("status", "pending"),
      supabase
        .from("checkin_records")
        .select("*", { count: "exact", head: true })
        .in("student_id", studentIds)
        .eq("date", today),
      supabase
        .from("checkin_items")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
    ]);
    pendingTaskCount = tasks.count ?? 0;
    todayCheckinCount = checkins.count ?? 0;
    totalCheckinItems = items.count ?? 0;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900">今日概览</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {user.name}，今天也要加油哦
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/parent/checkin"
          className="rounded-xl bg-white p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">今日打卡</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {todayCheckinCount}/{totalCheckinItems}
          </p>
        </Link>
        <Link
          href="/parent/tasks"
          className="rounded-xl bg-white p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">待完成任务</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {pendingTaskCount}
          </p>
        </Link>
        <Link
          href="/parent/children"
          className="rounded-xl bg-white p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">已绑定孩子</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {studentIds.length}
          </p>
        </Link>
      </div>

      {studentIds.length === 0 && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-zinc-200 p-8 text-center">
          <p className="text-zinc-500">还没有绑定孩子信息</p>
          <Link
            href="/parent/children"
            className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            去绑定 →
          </Link>
        </div>
      )}
    </div>
  );
}
