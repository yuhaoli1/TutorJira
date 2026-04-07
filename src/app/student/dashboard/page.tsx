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
      <div className="flex items-baseline justify-between">
        <div>
          <h2
            className="text-[28px] leading-none font-[510] text-[#2E3338] tracking-display-lg"
          >
            My learning
          </h2>
          <p className="mt-2 text-[13px] text-[#8a8f98]">
            Hi {user.name} — keep it up!
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <DashboardCard
          href="/student/tasks"
          label="Pending tasks"
          value={pendingTaskCount.toString()}
        />
        <DashboardCard
          href="/student/practice"
          label="Practice"
          value="Start"
          accent
        />
        <DashboardCard
          href="/student/wrong-book"
          label="Wrong answers"
          value={wrongCount.toString()}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  label,
  value,
  accent = false,
}: {
  href: string;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative rounded-lg border border-[#E8EAED] bg-white px-5 py-4 transition-colors hover:border-[#163300]/40"
    >
      <p className="text-[12px] font-[510] uppercase tracking-[0.04em] text-[#8a8f98]">
        {label}
      </p>
      <p
        className={`mt-3 text-2xl font-[590] tracking-display ${
          accent ? "text-[#163300]" : "text-[#2E3338]"
        }`}
      >
        {value}
        {accent && (
          <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
            →
          </span>
        )}
      </p>
    </Link>
  );
}
