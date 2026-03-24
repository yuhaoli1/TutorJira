import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { TASK_TYPES, TASK_STATUS } from "@/lib/constants";
import type { TaskType, TaskAssignmentStatus } from "@/lib/supabase/types";

export default async function StudentGradesPage() {
  const user = await requireRole(["student"]);
  const supabase = await createClient();

  // Find student record
  const { data: student } = await supabase
    .from("students")
    .select("id, name, grade")
    .eq("user_id", user.id)
    .single();

  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-[#B4BCC8]">还没有关联学生信息</p>
        <p className="mt-1 text-xs text-[#B4BCC8]">请联系老师帮你绑定账号</p>
      </div>
    );
  }

  // Fetch assignments
  const { data: assignments } = await supabase
    .from("task_assignments")
    .select(
      "id, status, note, created_at, task:tasks(title, type, due_date)"
    )
    .eq("student_id", student.id)
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

  // Stats
  const total = (assignments ?? []).length;
  const confirmed = (assignments ?? []).filter(
    (a) => a.status === "confirmed"
  ).length;
  const completionRate =
    total > 0 ? Math.round((confirmed / total) * 100) : null;

  // Overall correct rate
  let overallCorrectRate: number | null = null;
  if ((testResults ?? []).length > 0) {
    const totalQ = (testResults ?? []).reduce(
      (s, r) => s + r.total_questions,
      0
    );
    const totalWrong = (testResults ?? []).reduce(
      (s, r) => s + r.wrong_count,
      0
    );
    overallCorrectRate =
      totalQ > 0 ? Math.round(((totalQ - totalWrong) / totalQ) * 100) : null;
  }

  // Per-subject stats
  const subjectMap = new Map<
    string,
    { totalQ: number; totalWrong: number; count: number }
  >();
  (testResults ?? []).forEach((r) => {
    const existing = subjectMap.get(r.subject) ?? {
      totalQ: 0,
      totalWrong: 0,
      count: 0,
    };
    existing.totalQ += r.total_questions;
    existing.totalWrong += r.wrong_count;
    existing.count += 1;
    subjectMap.set(r.subject, existing);
  });

  const subjects = Array.from(subjectMap.entries())
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

  // Results map for task history
  const resultsMap = new Map<
    string,
    { subject: string; total_questions: number; wrong_count: number }[]
  >();
  (testResults ?? []).forEach((r) => {
    const existing = resultsMap.get(r.task_assignment_id) ?? [];
    existing.push(r);
    resultsMap.set(r.task_assignment_id, existing);
  });

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">我的成绩</h2>
      <p className="mt-1 text-sm text-[#B4BCC8]">
        {student.name} · {student.grade}
      </p>

      {/* Stats cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">任务总数</p>
          <p className="mt-1 text-3xl font-bold text-[#2E3338]">{total}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">完成率</p>
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
          <p className="text-sm text-[#B4BCC8]">平均正确率</p>
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
          <p className="text-sm text-[#B4BCC8]">测试次数</p>
          <p className="mt-1 text-3xl font-bold text-[#2E3338]">
            {(testResults ?? []).length}
          </p>
        </div>
      </div>

      {/* Subject breakdown */}
      {subjects.length > 0 && (
        <div className="mt-10">
          <h3 className="text-lg font-bold text-[#2E3338]">各科正确率</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
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
                  共{s.testCount}次测试 · 总{s.totalQuestions}题 错
                  {s.totalWrong}题
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task history */}
      <div className="mt-10">
        <h3 className="text-lg font-bold text-[#2E3338]">任务历史</h3>
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
                      {new Date(task.due_date).toLocaleDateString("zh-CN")}
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
                          {r.subject} {r.total_questions}题 错{r.wrong_count}{" "}
                          <span
                            className={
                              rate >= 80
                                ? "text-green-600 font-medium"
                                : rate >= 60
                                  ? "text-amber-600 font-medium"
                                  : "text-red-600 font-medium"
                            }
                          >
                            ({rate}%)
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {(assignments ?? []).length === 0 && (
            <div className="rounded-2xl border border-[#E8EAED] bg-white p-10 text-center text-[#B4BCC8]">
              暂无任务记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
