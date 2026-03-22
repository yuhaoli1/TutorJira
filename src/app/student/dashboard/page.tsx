import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function StudentDashboard() {
  const user = await requireRole(["student"]);
  const supabase = await createClient();

  // 查找学生关联的 student 记录
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let pendingTaskCount = 0;
  let wrongCount = 0;

  if (student) {
    const [tasks, wrongs] = await Promise.all([
      supabase
        .from("task_assignments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", student.id)
        .eq("status", "pending"),
      supabase
        .from("question_attempts")
        .select("*", { count: "exact", head: true })
        .eq("student_id", student.id)
        .eq("is_correct", false),
    ]);
    pendingTaskCount = tasks.count ?? 0;
    wrongCount = wrongs.count ?? 0;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900">我的学习</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {user.name}，继续加油！
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/student/tasks"
          className="rounded-xl bg-white p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">待完成任务</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {pendingTaskCount}
          </p>
        </Link>
        <Link
          href="/student/practice"
          className="rounded-xl bg-white p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">做题练习</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">开始 →</p>
        </Link>
        <Link
          href="/student/wrong-book"
          className="rounded-xl bg-white p-6 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">错题集</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {wrongCount}
          </p>
        </Link>
      </div>
    </div>
  );
}
