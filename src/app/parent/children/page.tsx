import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ParentChildrenPage() {
  const user = await requireRole(["parent"]);
  const supabase = await createClient();
  const isAdmin = user.role === "admin";

  let studentIds: string[] = [];

  if (isAdmin) {
    const { data: allStudents } = await supabase
      .from("students")
      .select("id");
    studentIds = (allStudents ?? []).map((s) => s.id);
  } else {
    const { data: relations } = await supabase
      .from("parent_student")
      .select("student_id")
      .eq("parent_id", user.id);
    studentIds =
      (relations as { student_id: string }[] | null)?.map((r) => r.student_id) ??
      [];
  }

  // Fetch student info
  const { data: students } = await supabase
    .from("students")
    .select("id, name, grade")
    .in("id", studentIds.length > 0 ? studentIds : ["__none__"]);

  // Fetch all assignments
  const { data: assignments } = await supabase
    .from("task_assignments")
    .select("id, student_id, status")
    .in("student_id", studentIds.length > 0 ? studentIds : ["__none__"]);

  // Fetch test results
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: testResults } = await supabase
    .from("test_results")
    .select("task_assignment_id, subject, total_questions, wrong_count")
    .in(
      "task_assignment_id",
      assignmentIds.length > 0 ? assignmentIds : ["__none__"]
    );

  // Per-child stats
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
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">My children</h2>
      <p className="mt-1 text-sm text-[#B4BCC8]">See how each child is doing</p>

      {childStats.length === 0 && (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-[#E8EAED] p-10 text-center">
          <p className="text-[#B4BCC8]">No children linked yet</p>
          <p className="mt-1 text-xs text-[#B4BCC8]">
            Ask your teacher to link a student account
          </p>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {childStats.map((child) => (
          <div
            key={child.id}
            className="rounded-2xl border border-[#E8EAED] bg-white overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E8EAED] bg-[#F4F5F6] px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-[#2E3338]">
                  {child.name}
                </h3>
                <p className="text-sm text-[#B4BCC8]">{child.grade}</p>
              </div>
              <Link
                href={`/parent/children/${child.id}`}
                className="rounded-full bg-[#163300] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#163300]/90 transition-colors duration-150"
              >
                View details →
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6">
              <div className="text-center">
                <p className="text-xs text-[#B4BCC8]">Total tasks</p>
                <p className="mt-1 text-2xl font-bold text-[#2E3338]">
                  {child.total}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#B4BCC8]">Pending</p>
                <p
                  className={`mt-1 text-2xl font-bold ${child.pending > 0 ? "text-amber-600" : "text-[#E8EAED]"}`}
                >
                  {child.pending}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-[#B4BCC8]">Completion rate</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    child.completionRate === null
                      ? "text-[#E8EAED]"
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
                <p className="text-xs text-[#B4BCC8]">Avg accuracy</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    child.avgCorrectRate === null
                      ? "text-[#E8EAED]"
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
              <div className="border-t border-[#E8EAED] px-6 py-5">
                <p className="text-sm font-medium text-[#B4BCC8] mb-3">
                  Accuracy by subject
                </p>
                <div className="flex flex-wrap gap-2">
                  {child.subjects.map((s) => (
                    <div
                      key={s.subject}
                      className="flex items-center gap-2 rounded-full bg-[#F4F5F6] px-3 py-2"
                    >
                      <span className="text-sm text-[#4D5766]">
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
                      <span className="text-xs text-[#B4BCC8]">
                        ({s.testCount} tests)
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
