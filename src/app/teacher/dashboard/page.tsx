import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TASK_STATUS } from "@/lib/constants";

export default async function TeacherDashboard() {
  const user = await requireRole(["admin", "teacher"]);
  const supabase = await createClient();

  // students + assignments are independent — fetch in parallel
  const [{ data: students }, { data: assignments }] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, grade")
      .order("name"),
    supabase
      .from("task_assignments")
      .select("id, student_id, status, task:tasks(title, type, due_date)"),
  ]);

  // test_results depends on assignment ids
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
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">Dashboard</h2>
      <p className="mt-1 text-sm text-[#B4BCC8]">Welcome back, {user.name}</p>

      {/* Summary cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Link
          href="/teacher/tasks"
          className="rounded-2xl bg-white p-6 border border-[#E8EAED] hover:border-[#B4BCC8] transition-all duration-150"
        >
          <p className="text-sm text-[#B4BCC8]">Pending tasks</p>
          <p className="mt-1 text-3xl font-bold text-[#2E3338]">
            {totalPending}
          </p>
        </Link>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">Approved tasks</p>
          <p className="mt-1 text-3xl font-bold text-green-600">
            {totalConfirmed}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">Total tasks</p>
          <p className="mt-1 text-3xl font-bold text-[#2E3338]">{totalTasks}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-[#E8EAED]">
          <p className="text-sm text-[#B4BCC8]">Total students</p>
          <p className="mt-1 text-3xl font-bold text-[#2E3338]">
            {totalStudents}
          </p>
        </div>
      </div>

      {/* Student stats table */}
      <div className="mt-10">
        <h3 className="text-lg font-bold text-[#2E3338]">Students overview</h3>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E8EAED] bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8EAED] bg-[#F4F5F6] text-left text-[#B4BCC8]">
                <th className="px-5 py-3.5 font-medium">Student</th>
                <th className="px-5 py-3.5 font-medium">Grade</th>
                <th className="px-5 py-3.5 font-medium text-center">Pending</th>
                <th className="px-5 py-3.5 font-medium text-center">Approved</th>
                <th className="px-5 py-3.5 font-medium text-center">Rejected</th>
                <th className="px-5 py-3.5 font-medium text-center">Completion</th>
                <th className="px-5 py-3.5 font-medium text-center">
                  Avg accuracy
                </th>
              </tr>
            </thead>
            <tbody>
              {studentStats.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[#E8EAED] last:border-b-0 hover:bg-[#F4F5F6]/50 transition-colors duration-150"
                >
                  <td className="px-5 py-3.5 font-medium">
                    <Link
                      href={`/teacher/students/${s.id}`}
                      className="text-[#163300] hover:text-[#163300]/70 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[#B4BCC8]">{s.grade}</td>
                  <td className="px-5 py-3.5 text-center">
                    {s.pending > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600">
                        {s.pending}
                      </span>
                    ) : (
                      <span className="text-[#E8EAED]">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {s.confirmed > 0 ? (
                      <span className="text-green-600 font-medium">
                        {s.confirmed}
                      </span>
                    ) : (
                      <span className="text-[#E8EAED]">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {s.rejected > 0 ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        {s.rejected}
                      </span>
                    ) : (
                      <span className="text-[#E8EAED]">0</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
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
                      <span className="text-[#E8EAED]">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
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
                      <span className="text-[#E8EAED]">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {studentStats.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-[#B4BCC8]"
                  >
                    No students yet
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
