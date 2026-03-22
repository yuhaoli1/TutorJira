import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { TASK_TYPES, TASK_STATUS } from "@/lib/constants";
import Link from "next/link";
import type { TaskType, TaskAssignmentStatus } from "@/lib/supabase/types";

export default async function ParentChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["parent"]);
  const { id } = await params;
  const supabase = await createClient();

  // 验证家长与学生的绑定关系
  const { data: relation } = await supabase
    .from("parent_student")
    .select("student_id")
    .eq("parent_id", user.id)
    .eq("student_id", id)
    .single();

  if (!relation) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">您没有查看此学生的权限</p>
        <Link
          href="/parent/children"
          className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          ← 返回孩子列表
        </Link>
      </div>
    );
  }

  // Fetch student
  const { data: student } = await supabase
    .from("students")
    .select("id, name, grade")
    .eq("id", id)
    .single();

  if (!student) {
    return (
      <div className="text-center py-12 text-zinc-500">学生不存在</div>
    );
  }

  // Fetch all assignments for this student
  const { data: assignments } = await supabase
    .from("task_assignments")
    .select(
      "id, status, note, created_at, submitted_at, confirmed_at, task:tasks(title, type, due_date)"
    )
    .eq("student_id", id)
    .order("created_at", { ascending: false });

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

  // Per-subject aggregation
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
        href="/parent/children"
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        &larr; 返回孩子列表
      </Link>

      <div className="mt-4 flex items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{student.name}</h2>
          <p className="text-sm text-zinc-500">{student.grade}</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-zinc-500">任务总数</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{total}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-zinc-500">完成率</p>
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
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-zinc-500">平均正确率</p>
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
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-zinc-500">测试次数</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">
            {(testResults ?? []).length}
          </p>
        </div>
      </div>

      {/* Subject breakdown */}
      {subjectSummary.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-zinc-900">各科正确率</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjectSummary.map((s) => (
              <div
                key={s.subject}
                className="rounded-xl border bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900">
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
                <div className="mt-2 h-2 rounded-full bg-zinc-100">
                  <div
                    className={`h-2 rounded-full ${
                      s.correctRate >= 80
                        ? "bg-green-500"
                        : s.correctRate >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${s.correctRate}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  共{s.testCount}次测试 · 总{s.totalQuestions}题 错
                  {s.totalWrong}题
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task history */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-zinc-900">任务历史</h3>
        <div className="mt-3 space-y-3">
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
                className="rounded-xl border bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {TASK_TYPES[task.type]}
                    </span>
                    <span className="font-medium text-zinc-900">
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : status === "submitted"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {TASK_STATUS[status]}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {new Date(task.due_date).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </div>

                {results.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {results.map((r, i) => {
                      const rate = Math.round(
                        ((r.total_questions - r.wrong_count) /
                          r.total_questions) *
                          100
                      );
                      return (
                        <span
                          key={i}
                          className="rounded bg-zinc-50 px-2 py-1 text-xs"
                        >
                          {r.subject} {r.total_questions}题 错{r.wrong_count}{" "}
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
                  <p className="mt-2 text-xs text-zinc-500">
                    老师备注：{a.note}
                  </p>
                )}
              </div>
            );
          })}

          {(assignments ?? []).length === 0 && (
            <div className="rounded-xl border bg-white p-8 text-center text-zinc-400">
              暂无任务记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
