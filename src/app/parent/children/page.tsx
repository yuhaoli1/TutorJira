import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ParentChildrenPage() {
  const user = await requireRole(["parent"]);
  const supabase = await createClient();

  // 获取绑定的学生
  const { data: relations } = await supabase
    .from("parent_student")
    .select("student_id")
    .eq("parent_id", user.id);

  const studentIds =
    (relations as { student_id: string }[] | null)?.map((r) => r.student_id) ??
    [];

  // 获取学生信息
  const { data: students } = await supabase
    .from("students")
    .select("id, name, grade")
    .in("id", studentIds.length > 0 ? studentIds : ["__none__"]);

  // 获取所有任务
  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("id, student_id, status")
    .in("student_id", studentIds.length > 0 ? studentIds : ["__none__"]);

  // 获取测试结果
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: testResults } = await supabase
    .from("test_results")
    .select("task_assignment_id, subject, total_questions, wrong_count")
    .in(
      "task_assignment_id",
      assignmentIds.length > 0 ? assignmentIds : ["__none__"]
    );

  // 每个孩子的统计
  const childStats = (students ?? []).map((student) => {
    const studentAssignments = (assignments ?? []).filter(
      (a) => a.student_id === student.id
    );
    const total = studentAssignments.length;
    const confirmed = studentAssignments.filter(
      (a) => a.status === "confirmed"
    ).length;
    const pending = studentAssignments.filter(
      (a) => a.status === "pending"
    ).length;

    const studentAssignmentIds = new Set(studentAssignments.map((a) => a.id));
    const studentResults = (testResults ?? []).filter((r) =>
      studentAssignmentIds.has(r.task_assignment_id)
    );

    let avgCorrectRate = null;
    if (studentResults.length > 0) {
      const totalQ = studentResults.reduce(
        (sum, r) => sum + r.total_questions,
        0
      );
      const totalWrong = studentResults.reduce(
        (sum, r) => sum + r.wrong_count,
        0
      );
      avgCorrectRate =
        totalQ > 0 ? Math.round(((totalQ - totalWrong) / totalQ) * 100) : null;
    }

    // Per-subject stats
    const subjectStats = new Map<
      string,
      { totalQ: number; totalWrong: number; count: number }
    >();
    studentResults.forEach((r) => {
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

    const subjects = Array.from(subjectStats.entries())
      .map(([subject, stats]) => ({
        subject,
        correctRate: Math.round(
          ((stats.totalQ - stats.totalWrong) / stats.totalQ) * 100
        ),
        testCount: stats.count,
      }))
      .sort((a, b) => a.correctRate - b.correctRate);

    return {
      ...student,
      total,
      confirmed,
      pending,
      avgCorrectRate,
      testCount: studentResults.length,
      completionRate: total > 0 ? Math.round((confirmed / total) * 100) : null,
      subjects,
    };
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900">孩子成绩</h2>
      <p className="mt-1 text-sm text-zinc-500">查看每个孩子的学习情况</p>

      {childStats.length === 0 && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-zinc-200 p-8 text-center">
          <p className="text-zinc-500">还没有绑定孩子信息</p>
          <p className="mt-1 text-xs text-zinc-400">
            请联系老师帮您绑定孩子账号
          </p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {childStats.map((child) => (
          <div
            key={child.id}
            className="rounded-xl border bg-white shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b bg-zinc-50 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  {child.name}
                </h3>
                <p className="text-sm text-zinc-500">{child.grade}</p>
              </div>
              <Link
                href={`/parent/children/${child.id}`}
                className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 transition-colors"
              >
                查看详情 →
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
              <div className="text-center">
                <p className="text-xs text-zinc-400">任务总数</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">
                  {child.total}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-400">待完成</p>
                <p
                  className={`mt-1 text-2xl font-bold ${child.pending > 0 ? "text-amber-600" : "text-zinc-300"}`}
                >
                  {child.pending}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-400">完成率</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    child.completionRate === null
                      ? "text-zinc-300"
                      : child.completionRate >= 80
                        ? "text-green-600"
                        : child.completionRate >= 50
                          ? "text-amber-600"
                          : "text-red-600"
                  }`}
                >
                  {child.completionRate !== null
                    ? `${child.completionRate}%`
                    : "-"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-zinc-400">平均正确率</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    child.avgCorrectRate === null
                      ? "text-zinc-300"
                      : child.avgCorrectRate >= 80
                        ? "text-green-600"
                        : child.avgCorrectRate >= 60
                          ? "text-amber-600"
                          : "text-red-600"
                  }`}
                >
                  {child.avgCorrectRate !== null
                    ? `${child.avgCorrectRate}%`
                    : "-"}
                </p>
              </div>
            </div>

            {/* Subject breakdown */}
            {child.subjects.length > 0 && (
              <div className="border-t px-5 py-4">
                <p className="text-sm font-medium text-zinc-500 mb-3">
                  各科正确率
                </p>
                <div className="flex flex-wrap gap-2">
                  {child.subjects.map((s) => (
                    <div
                      key={s.subject}
                      className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2"
                    >
                      <span className="text-sm text-zinc-700">
                        {s.subject}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          s.correctRate >= 80
                            ? "text-green-600"
                            : s.correctRate >= 60
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {s.correctRate}%
                      </span>
                      <span className="text-xs text-zinc-400">
                        ({s.testCount}次)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
