import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { TASK_STATUS, TASK_TYPES } from "@/lib/constants";
import type { TaskType, TaskAssignmentStatus } from "@/lib/supabase/types";
import { ParentDashboardClient } from "./client";

export default async function ParentDashboard() {
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
      (relations as { student_id: string }[] | null)?.map(
        (r) => r.student_id
      ) ?? [];
  }

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
        totalQ > 0
          ? Math.round(((totalQ - totalWrong) / totalQ) * 100)
          : null;
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

  // 最近测试结果 (带学生和任务信息)
  const recentResults = (assignments ?? [])
    .filter((a) =>
      (testResults ?? []).some((r) => r.task_assignment_id === a.id)
    )
    .slice(0, 8)
    .map((a) => {
      const task = a.task as unknown as {
        title: string;
        type: TaskType;
        due_date: string;
      };
      const student = (students ?? []).find((s) => s.id === a.student_id);
      const results = (testResults ?? []).filter(
        (r) => r.task_assignment_id === a.id
      );
      return {
        id: a.id,
        studentId: a.student_id,
        studentName: student?.name ?? "",
        taskTitle: task.title,
        taskType: TASK_TYPES[task.type] ?? task.type,
        status: a.status as TaskAssignmentStatus,
        statusLabel: TASK_STATUS[a.status as TaskAssignmentStatus],
        results: results.map((r) => ({
          subject: r.subject,
          total_questions: r.total_questions,
          wrong_count: r.wrong_count,
          rate: Math.round(
            ((r.total_questions - r.wrong_count) / r.total_questions) * 100
          ),
        })),
      };
    });

  return (
    <ParentDashboardClient
      userName={user.name}
      isAdmin={isAdmin}
      childStats={childStats}
      recentResults={recentResults}
    />
  );
}
