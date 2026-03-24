import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default async function ParentTasksPage() {
  const user = await requireRole(["parent"]);
  const supabase = await createClient();
  const isAdmin = user.role === "admin";

  let allowedStudentIds: string[] | undefined;

  if (!isAdmin) {
    const { data: relations } = await supabase
      .from("parent_student")
      .select("student_id")
      .eq("parent_id", user.id);
    allowedStudentIds =
      (relations as { student_id: string }[] | null)?.map((r) => r.student_id) ?? [];
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">任务</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">查看孩子的任务和成绩</p>
      <KanbanBoard isTeacher={false} allowedStudentIds={allowedStudentIds} />
    </div>
  );
}
