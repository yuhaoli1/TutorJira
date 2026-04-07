import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function StudentDashboard() {
  const user = await requireRole(["student"]);
  const supabase = await createClient();

  // Find the linked student record
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
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">My learning</h2>
      <p className="mt-1 text-sm text-[#B4BCC8]">
        Hi {user.name} — keep it up!
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/student/tasks"
          className="rounded-2xl bg-white p-8 border border-[#E8EAED] hover:border-[#B4BCC8] transition-all duration-150"
        >
          <p className="text-sm text-[#B4BCC8]">Pending tasks</p>
          <p className="mt-2 text-3xl font-bold text-[#2E3338]">
            {pendingTaskCount}
          </p>
        </Link>
        <Link
          href="/student/practice"
          className="rounded-2xl bg-white p-8 border border-[#E8EAED] hover:border-[#B4BCC8] transition-all duration-150"
        >
          <p className="text-sm text-[#B4BCC8]">Practice</p>
          <p className="mt-2 text-3xl font-bold text-[#2E3338]">Start →</p>
        </Link>
        <Link
          href="/student/wrong-book"
          className="rounded-2xl bg-white p-8 border border-[#E8EAED] hover:border-[#B4BCC8] transition-all duration-150"
        >
          <p className="text-sm text-[#B4BCC8]">Wrong answers</p>
          <p className="mt-2 text-3xl font-bold text-[#2E3338]">
            {wrongCount}
          </p>
        </Link>
      </div>
    </div>
  );
}
