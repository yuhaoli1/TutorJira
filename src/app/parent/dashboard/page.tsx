import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TASK_STATUS, TASK_TYPES } from "@/lib/constants";
import type { TaskType, TaskAssignmentStatus } from "@/lib/supabase/types";

export default async function ParentDashboard() {
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
    .select(
      "id, student_id, status, created_at, task:tasks(title, type, due_date)"
    )
    .in("student_id", studentIds.length > 0 ? studentIds : ["__none__"])
    .order("created_at", { ascending: false });

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
    const rejected = studentAssignments.filter(
      (a) => a.status === "rejected"
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

    return {
      ...student,
      total,
      confirmed,
      pending,
      rejected,
      avgCorrectRate,
      testCount: studentResults.length,
      completionRate: total > 0 ? Math.round((confirmed / total) * 100) : null,
    };
  });

  // 总数
  const totalPending = childStats.reduce((s, c) => s + c.pending, 0);
  const totalConfirmed = childStats.reduce((s, c) => s + c.confirmed, 0);
  const totalTasks = childStats.reduce((s, c) => s + c.total, 0);

  // 最近5条测试结果
  const recentAssignmentsWithResults = (assignments ?? [])
    .filter((a) => {
      const aResults = (testResults ?? []).filter(
        (r) => r.task_assignment_id === a.id
      );
      return aResults.length > 0;
    })
    .slice(0, 5);

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900">今日概览</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {user.name}，今天也要加油哦
      </p>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Link
          href="/parent/tasks"
          className="rounded-xl bg-white p-5 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">待完成任务</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">
            {totalPending}
          </p>
        </Link>
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-zinc-500">已确认任务</p>
          <p className="mt-1 text-3xl font-bold text-green-600">
            {totalConfirmed}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-zinc-500">任务总数</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">{totalTasks}</p>
        </div>
        <Link
          href="/parent/children"
          className="rounded-xl bg-white p-5 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">已绑定孩子</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">
            {studentIds.length}
          </p>
        </Link>
      </div>

      {studentIds.length === 0 && (
        <div className="mt-8 rounded-xl border-2 border-dashed border-zinc-200 p-8 text-center">
          <p className="text-zinc-500">还没有绑定孩子信息</p>
          <p className="mt-1 text-xs text-zinc-400">
            请联系老师帮您绑定孩子账号
          </p>
        </div>
      )}

      {/* Per-child stats */}
      {childStats.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-zinc-900">孩子概览</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {childStats.map((child) => (
              <Link
                key={child.id}
                href={`/parent/children/${child.id}`}
                className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-zinc-900">{child.name}</p>
                    <p className="text-xs text-zinc-400">{child.grade}</p>
                  </div>
                  <span className="text-xs text-blue-500">查看详情 →</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-zinc-400">待完成</p>
                    <p
                      className={`text-lg font-bold ${child.pending > 0 ? "text-amber-600" : "text-zinc-300"}`}
                    >
                      {child.pending}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">完成率</p>
                    <p
                      className={`text-lg font-bold ${
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
                  <div>
                    <p className="text-xs text-zinc-400">正确率</p>
                    <p
                      className={`text-lg font-bold ${
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
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent test results */}
      {recentAssignmentsWithResults.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-zinc-900">最近测试成绩</h3>
          <div className="mt-3 space-y-3">
            {recentAssignmentsWithResults.map((a) => {
              const task = a.task as unknown as {
                title: string;
                type: TaskType;
                due_date: string;
              };
              const student = (students ?? []).find(
                (s) => s.id === a.student_id
              );
              const results = (testResults ?? []).filter(
                (r) => r.task_assignment_id === a.id
              );

              return (
                <div
                  key={a.id}
                  className="rounded-xl border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                        {student?.name}
                      </span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        {TASK_TYPES[task.type]}
                      </span>
                      <span className="font-medium text-zinc-900">
                        {task.title}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : a.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : a.status === "submitted"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {TASK_STATUS[a.status as TaskAssignmentStatus]}
                    </span>
                  </div>
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
