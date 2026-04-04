import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskPriority } from "@/lib/supabase/types";
import type { TaskCardData } from "@/components/tasks/task-card";
import type { Label } from "@/components/tasks/label-picker";

/**
 * 看板数据获取 — 服务端和客户端共用
 * 返回 cards 和 students 列表
 */
export async function fetchBoardData(
  supabase: SupabaseClient,
  options?: { allowedStudentIds?: string[] }
): Promise<{
  cards: TaskCardData[];
  students: { id: string; name: string }[];
}> {
  const allowedStudentIds = options?.allowedStudentIds;

  if (allowedStudentIds && allowedStudentIds.length === 0) {
    return { cards: [], students: [] };
  }

  // 主查询
  let query = supabase
    .from("task_assignments")
    .select(
      `
      id, status, note, ticket_number, created_at,
      task:tasks(id, title, description, type, due_date, priority, show_answers_after_submit),
      student:students(id, name)
    `
    )
    .in("status", ["pending", "submitted", "confirmed", "rejected"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (allowedStudentIds && allowedStudentIds.length > 0) {
    query = query.in("student_id", allowedStudentIds);
  }

  const { data: assignments, error } = await query;

  if (error) {
    console.error("[fetchBoardData] query error:", error.message);
  }

  if (!assignments) return { cards: [], students: [] };

  // 收集 IDs
  const assignmentIds = assignments.map((a) => a.id);
  const safeIds = assignmentIds.length > 0 ? assignmentIds : ["__none__"];

  const taskIds = [
    ...new Set(
      assignments
        .filter((a) => a.task)
        .map((a) => (a.task as unknown as { id: string }).id)
    ),
  ];
  const safeTaskIds = taskIds.length > 0 ? taskIds : ["__none__"];

  // 一次 Promise.all 获取所有辅助数据
  const [testResultsRes, commentsRes, attachmentsRes, labelsRes, questionsCountRes] =
    await Promise.all([
      supabase.from("test_results").select("*").in("task_assignment_id", safeIds),
      supabase.from("task_comments").select("id, task_assignment_id").in("task_assignment_id", safeIds),
      supabase.from("task_attachments").select("id, task_assignment_id").in("task_assignment_id", safeIds),
      supabase
        .from("task_label_map")
        .select("task_id, label:task_labels(id, name, color)")
        .in("task_id", safeTaskIds),
      supabase.from("task_questions").select("task_id").in("task_id", safeTaskIds),
    ]);

  // Build maps
  const resultsMap = new Map<string, NonNullable<typeof testResultsRes.data>>();
  testResultsRes.data?.forEach((r) => {
    const existing = resultsMap.get(r.task_assignment_id) ?? [];
    existing.push(r);
    resultsMap.set(r.task_assignment_id, existing);
  });

  const commentCountMap = new Map<string, number>();
  commentsRes.data?.forEach((c) => {
    commentCountMap.set(
      c.task_assignment_id,
      (commentCountMap.get(c.task_assignment_id) ?? 0) + 1
    );
  });

  const attachCountMap = new Map<string, number>();
  attachmentsRes.data?.forEach((a) => {
    attachCountMap.set(
      a.task_assignment_id,
      (attachCountMap.get(a.task_assignment_id) ?? 0) + 1
    );
  });

  const labelMap = new Map<string, Label[]>();
  labelsRes.data?.forEach((row) => {
    const r = row as unknown as { task_id: string; label: Label };
    if (r.label) {
      const existing = labelMap.get(r.task_id) ?? [];
      existing.push(r.label);
      labelMap.set(r.task_id, existing);
    }
  });

  const qCountMap = new Map<string, number>();
  questionsCountRes.data?.forEach((q) => {
    qCountMap.set(q.task_id, (qCountMap.get(q.task_id) ?? 0) + 1);
  });

  // Build cards
  const cards: TaskCardData[] = assignments
    .filter((a) => a.task && a.student)
    .map((a) => {
      const task = a.task as unknown as {
        id: string;
        title: string;
        description: string | null;
        type: string;
        due_date: string;
        priority: TaskPriority;
        show_answers_after_submit: boolean;
      };
      const student = a.student as unknown as { id: string; name: string };
      const results = resultsMap.get(a.id) ?? [];
      return {
        id: a.id,
        taskId: task.id,
        ticketNumber: (a as unknown as { ticket_number: number }).ticket_number || 0,
        status: a.status,
        taskTitle: task.title,
        taskDescription: task.description,
        taskType: task.type as TaskCardData["taskType"],
        priority: task.priority || "medium",
        studentName: student.name,
        dueDate: new Date(task.due_date).toLocaleDateString("zh-CN", {
          month: "numeric",
          day: "numeric",
        }),
        dueDateRaw: task.due_date,
        note: a.note,
        labels: labelMap.get(task.id) ?? [],
        questionCount: qCountMap.get(task.id) ?? 0,
        attachmentCount: attachCountMap.get(a.id) ?? 0,
        commentCount: commentCountMap.get(a.id) ?? 0,
        showAnswersAfterSubmit: task.show_answers_after_submit ?? true,
        testResults: results.map((r) => ({
          subject: r.subject,
          total_questions: r.total_questions,
          wrong_count: r.wrong_count,
        })),
      };
    });

  // Extract unique students
  const uniqueStudents = new Map<string, string>();
  assignments.forEach((a) => {
    const student = a.student as unknown as { id: string; name: string };
    if (student) uniqueStudents.set(student.id, student.name);
  });
  const students = Array.from(uniqueStudents.entries()).map(([id, name]) => ({
    id,
    name,
  }));

  return { cards, students };
}
