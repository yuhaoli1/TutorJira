import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { TASK_TYPES, TASK_STATUS } from "@/lib/constants";
import Link from "next/link";
import type { TaskType, TaskAssignmentStatus } from "@/lib/supabase/types";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "teacher"]);
  const { id } = await params;
  const supabase = await createClient();

  // student + assignments are independent — fetch in parallel
  const [{ data: student }, { data: assignments }] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, grade")
      .eq("id", id)
      .single(),
    supabase
      .from("task_assignments")
      .select(
        "id, status, note, created_at, submitted_at, confirmed_at, task:tasks(title, type, due_date)"
      )
      .eq("student_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!student) {
    return (
      <div className="text-center py-12 text-[#B4BCC8]">Student not found</div>
    );
  }

  // Fetch test results
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: testResults } = await supabase
    .from("test_results")
    .select("*")
    .in(
      "task_assignment_id",
      assignmentIds.length > 0 ? assignmentIds : ["__none__"]
    );

  // Build results map
  const resultsMap = new Map<
    string,
    { subject: string; total_questions: number; wrong_count: number }[]
  >();
  (testResults ?? []).forEach((r) => {
    const existing = resultsMap.get(r.task_assignment_id) ?? [];
    existing.push(r);
    resultsMap.set(r.task_assignment_id, existing);
  });

  // Stats
  const total = (assignments ?? []).length;
  const confirmed = (assignments ?? []).filter(
    (a) => a.status === "confirmed"
  ).length;
  const completionRate =
    total > 0 ? Math.round((confirmed / total) * 100) : null;

  // Per-subject aggregation for all time
  const subjectStats = new Map<
    string,
    { totalQ: number; totalWrong: number; count: number }
  >();
  (testResults ?? []).forEach((r) => {
    const existing = subjectStats.get(r.subject) ?? {
      totalQ: 0,
      totalWrong: 0,
      count: 0,
    };
    existing.totalQ += r.total_questions;
    existing.totalWrong += r.wrong_count;
    existing.count += 1;
    subjectStats.set(r.subject, existing);
  });

  const subjectSummary = Array.from(subjectStats.entries())
    .map(([subject, stats]) => ({
      subject,
      totalQuestions: stats.totalQ,
      totalWrong: stats.totalWrong,
      correctRate: Math.round(
        ((stats.totalQ - stats.totalWrong) / stats.totalQ) * 100
      ),
      testCount: stats.count,
    }))
    .sort((a, b) => a.correctRate - b.correctRate);

  const overallCorrectRate =
    (testResults ?? []).length > 0
      ? Math.round(
          (((testResults ?? []).reduce(
            (s, r) => s + r.total_questions,
            0
          ) -
            (testResults ?? []).reduce((s, r) => s + r.wrong_count, 0)) /
            (testResults ?? []).reduce(
              (s, r) => s + r.total_questions,
              0
            )) *
            100
        )
      : null;

  return (
    <div>
      <Link
        href="/teacher/dashboard"
        className="text-sm text-[#163300] hover:text-[#163300]/70 font-medium"
      >
        &larr; Back to dashboard
      </Link>

      <div className="mt-5 flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">{student.name}</h2>
          <p className="text-sm text-[#B4BCC8]">{student.grade}</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">Total tasks</p>
          <p className="mt-1 text-3xl font-bold text-[#2E3338]">{total}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">Completion rate</p>
          <p
            className={`mt-1 text-3xl font-bold ${
              completionRate !== null && completionRate >= 80
                ? "text-green-600"
                : completionRate !== null && completionRate >= 50
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {completionRate !== null ? `${completionRate}%` : "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">Avg accuracy</p>
          <p
            className={`mt-1 text-3xl font-bold ${
              overallCorrectRate !== null && overallCorrectRate >= 80
                ? "text-green-600"
                : overallCorrectRate !== null && overallCorrectRate >= 60
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {overallCorrectRate !== null ? `${overallCorrectRate}%` : "-"}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">Tests taken</p>
          <p className="mt-1 text-3xl font-bold text-[#2E3338]">
            {(testResults ?? []).length}
          </p>
        </div>
      </div>

      {/* Subject breakdown */}
      {subjectSummary.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-bold text-[#2E3338]">Accuracy by subject</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjectSummary.map((s) => (
              <div
                key={s.subject}
                className="rounded-2xl border border-[#E8EAED] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#2E3338]">
                    {s.subject}
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      s.correctRate >= 80
                        ? "text-green-600"
                        : s.correctRate >= 60
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {s.correctRate}%
                  </span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-[#F4F5F6]">
                  <div
                    className={`h-1.5 rounded-full ${
                      s.correctRate >= 80
                        ? "bg-green-500"
                        : s.correctRate >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${s.correctRate}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#B4BCC8]">
                  {s.testCount} tests · {s.totalQuestions} questions ·{" "}
                  {s.totalWrong} wrong
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task history */}
      <div className="mt-10">
        <h3 className="text-lg font-bold text-[#2E3338]">Task history</h3>
        <div className="mt-4 space-y-3">
          {(assignments ?? []).map((a) => {
            const task = a.task as unknown as {
              title: string;
              type: TaskType;
              due_date: string;
            };
            const results = resultsMap.get(a.id) ?? [];
            const status = a.status as TaskAssignmentStatus;

            return (
              <div
                key={a.id}
                className="rounded-2xl border border-[#E8EAED] bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#F4F5F6] px-2.5 py-0.5 text-xs font-medium text-[#4D5766]">
                      {TASK_TYPES[task.type]}
                    </span>
                    <span className="font-medium text-[#2E3338]">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        status === "confirmed"
                          ? "bg-green-50 text-green-600"
                          : status === "rejected"
                            ? "bg-red-50 text-red-600"
                            : status === "submitted"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-[#F4F5F6] text-[#4D5766]"
                      }`}
                    >
                      {TASK_STATUS[status]}
                    </span>
                    <span className="text-xs text-[#B4BCC8]">
                      {new Date(task.due_date).toLocaleDateString("en-US")}
                    </span>
                  </div>
                </div>

                {results.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {results.map((r, i) => {
                      const rate = Math.round(
                        ((r.total_questions - r.wrong_count) /
                          r.total_questions) *
                          100
                      );
                      return (
                        <span
                          key={i}
                          className="rounded-full bg-[#F4F5F6] px-2.5 py-1 text-xs text-[#4D5766]"
                        >
                          {r.subject} {r.total_questions} Q · {r.wrong_count} wrong{" "}
                          <span
                            className={
                              rate >= 80
                                ? "text-green-600"
                                : rate >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }
                          >
                            ({rate}%)
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {a.note && (
                  <p className="mt-2 text-xs text-[#B4BCC8]">Note: {a.note}</p>
                )}
              </div>
            );
          })}

          {(assignments ?? []).length === 0 && (
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-10 text-center text-[#B4BCC8]">
              No tasks yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
