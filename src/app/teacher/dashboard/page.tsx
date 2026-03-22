import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TASK_STATUS } from "@/lib/constants";

export default async function TeacherDashboard() {
  const user = await requireRole(["admin", "teacher"]);
  const supabase = await createClient();

  // Fetch all students
  const { data: students } = await supabase
    .from("students")
    .select("id, name, grade")
    .order("name");

  // Fetch all task assignments with test results
  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("id, student_id, status, task:tasks(title, type, due_date)");

  // Fetch all test results
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: testResults } = await supabase
    .from("test_results")
    .select("task_assignment_id, subject, total_questions, wrong_count")
    .in(
      "task_assignment_id",
      assignmentIds.length > 0 ? assignmentIds : ["__none__"]
    );

  // Build per-student stats
  const studentStats = (students ?? []).map((student) => {
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

    // Test results for this student
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
      avgCorrectRate = totalQ > 0 ? Math.round(((totalQ - totalWrong) / totalQ) * 100) : null;
    }

    return {
      ...student,
      total,
      confirmed,
      pending,
      rejected,
      avgCorrectRate,
      completionRate: total > 0 ? Math.round((confirmed / total) * 100) : null,
    };
  });

  // Summary stats
  const totalPending = studentStats.reduce((s, st) => s + st.pending, 0);
  const totalStudents = studentStats.length;
  const totalConfirmed = studentStats.reduce((s, st) => s + st.confirmed, 0);
  const totalTasks = studentStats.reduce((s, st) => s + st.total, 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900">工作台</h2>
      <p className="mt-1 text-sm text-zinc-500">欢迎回来，{user.name}</p>

      {/* Summary cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Link
          href="/teacher/tasks"
          className="rounded-xl bg-white p-5 shadow-sm border hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-zinc-500">待完成任务</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">
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
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-zinc-500">学生总数</p>
          <p className="mt-1 text-3xl font-bold text-zinc-900">
            {totalStudents}
          </p>
        </div>
      </div>

      {/* Student stats table */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-zinc-900">学生概览</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50 text-left text-zinc-500">
                <th className="px-4 py-3 font-medium">学生</th>
                <th className="px-4 py-3 font-medium">年级</th>
                <th className="px-4 py-3 font-medium text-center">待完成</th>
                <th className="px-4 py-3 font-medium text-center">已确认</th>
                <th className="px-4 py-3 font-medium text-center">已打回</th>
                <th className="px-4 py-3 font-medium text-center">完成率</th>
                <th className="px-4 py-3 font-medium text-center">
                  平均正确率
                </th>
              </tr>
            </thead>
            <tbody>
              {studentStats.map((s) => (
                <tr
                  key={s.id}
                  className="border-b last:border-b-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/teacher/students/${s.id}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{s.grade}</td>
                  <td className="px-4 py-3 text-center">
                    {s.pending > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {s.pending}
                      </span>
                    ) : (
                      <span className="text-zinc-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.confirmed > 0 ? (
                      <span className="text-green-600 font-medium">
                        {s.confirmed}
                      </span>
                    ) : (
                      <span className="text-zinc-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.rejected > 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        {s.rejected}
                      </span>
                    ) : (
                      <span className="text-zinc-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.completionRate !== null ? (
                      <span
                        className={
                          s.completionRate >= 80
                            ? "text-green-600 font-medium"
                            : s.completionRate >= 50
                              ? "text-amber-600 font-medium"
                              : "text-red-600 font-medium"
                        }
                      >
                        {s.completionRate}%
                      </span>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.avgCorrectRate !== null ? (
                      <span
                        className={
                          s.avgCorrectRate >= 80
                            ? "text-green-600 font-medium"
                            : s.avgCorrectRate >= 60
                              ? "text-amber-600 font-medium"
                              : "text-red-600 font-medium"
                        }
                      >
                        {s.avgCorrectRate}%
                      </span>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {studentStats.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-zinc-400"
                  >
                    暂无学生
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
