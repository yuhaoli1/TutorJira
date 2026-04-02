import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default async function StudentTasksPage() {
  const user = await requireRole(["student"]);
  const supabase = await createClient();

  // Find the student record linked to this user
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const allowedStudentIds = student ? [student.id] : [];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">我的任务</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">查看和提交我的任务</p>
      <KanbanBoard isTeacher={false} allowedStudentIds={allowedStudentIds} hideStudentFilter />
    </div>
  );
}
