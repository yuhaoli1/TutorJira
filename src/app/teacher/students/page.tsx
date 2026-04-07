import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { TASK_TYPES, TASK_STATUS } from "@/lib/constants";
import type { TaskType, TaskAssignmentStatus } from "@/lib/supabase/types";
import { StudentManagerClient } from "./client";

export default async function AdminStudentsPage() {
  const user = await requireRole(["admin", "teacher"]);
  const supabase = await createClient();
  const isAdmin = user.role === "admin";

  // Fetch students based on role
  let studentIds: string[] | null = null; // null = all

  if (!isAdmin) {
    // Teacher sees all students, parent sees bound children
    if (user.role === "parent") {
      const { data: relations } = await supabase
        .from("parent_student")
        .select("student_id")
        .eq("parent_id", user.id);
      studentIds =
        (relations as { student_id: string }[] | null)?.map(
          (r) => r.student_id
        ) ?? [];
    }
  }

  let studentsQuery = supabase.from("students").select("id, name, grade");
  if (studentIds !== null) {
    studentsQuery = studentsQuery.in(
      "id",
      studentIds.length > 0 ? studentIds : ["__none__"]
    );
  }

  let assignmentsQuery = supabase
    .from("task_assignments")
    .select(
      "id, student_id, status, note, created_at, submitted_at, confirmed_at, task:tasks(title, type, due_date)"
    )
    .order("created_at", { ascending: false });

  if (studentIds !== null) {
    assignmentsQuery = assignmentsQuery.in(
      "student_id",
      studentIds.length > 0 ? studentIds : ["__none__"]
    );
  }

  // students + assignments are independent — fetch in parallel
  const [{ data: students }, { data: assignments }] = await Promise.all([
    studentsQuery.order("name"),
    assignmentsQuery,
  ]);

  // Fetch test results
  const assignmentIds = (assignments ?? []).map((a) => a.id);
  const { data: testResults } = await supabase
    .from("test_results")
    .select("*")
    .in(
      "task_assignment_id",
      assignmentIds.length > 0 ? assignmentIds : ["__none__"]
    );

  // Build per-student data
  const studentData = (students ?? []).map((student) => {
    const studentAssignments = (assignments ?? []).filter(
      (a) => a.student_id === student.id
    );
    const total = studentAssignments.length;
    const confirmed = studentAssignments.filter(
      (a) => a.status === "confirmed"
    ).length;
    const completionRate =
      total > 0 ? Math.round((confirmed / total) * 100) : null;

    const studentAssignmentIds = new Set(studentAssignments.map((a) => a.id));
    const studentResults = (testResults ?? []).filter((r) =>
      studentAssignmentIds.has(r.task_assignment_id)
    );

    // Overall correct rate
    let overallCorrectRate: number | null = null;
    if (studentResults.length > 0) {
      const totalQ = studentResults.reduce(
        (s, r) => s + r.total_questions,
        0
      );
      const totalWrong = studentResults.reduce(
        (s, r) => s + r.wrong_count,
        0
      );
      overallCorrectRate =
        totalQ > 0
          ? Math.round(((totalQ - totalWrong) / totalQ) * 100)
          : null;
    }

    // Per-subject stats
    const subjectMap = new Map<
      string,
      { totalQ: number; totalWrong: number; count: number }
    >();
    studentResults.forEach((r) => {
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

    // Task history
    const taskHistory = studentAssignments.map((a) => {
      const task = a.task as unknown as {
        title: string;
        type: TaskType;
        due_date: string;
      };
      const results = (testResults ?? [])
        .filter((r) => r.task_assignment_id === a.id)
        .map((r) => ({
          subject: r.subject,
          total_questions: r.total_questions,
          wrong_count: r.wrong_count,
          rate: Math.round(
            ((r.total_questions - r.wrong_count) / r.total_questions) * 100
          ),
        }));

      return {
        id: a.id,
        title: task.title,
        type: TASK_TYPES[task.type] ?? task.type,
        dueDate: task.due_date,
        status: a.status as TaskAssignmentStatus,
        statusLabel: TASK_STATUS[a.status as TaskAssignmentStatus],
        note: a.note as string | null,
        results,
      };
    });

    return {
      id: student.id,
      name: student.name,
      grade: student.grade,
      total,
      confirmed,
      completionRate,
      overallCorrectRate,
      testCount: studentResults.length,
      subjects,
      taskHistory,
    };
  });

  return <StudentManagerClient students={studentData} />;
}
