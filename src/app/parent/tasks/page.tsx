import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { fetchBoardData } from "@/lib/fetch-board-data";
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

  // Server-side prefetch
  const { cards, students } = await fetchBoardData(supabase, { allowedStudentIds });

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">Tasks</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">View your children's tasks and grades</p>
      <KanbanBoard
        isTeacher={false}
        allowedStudentIds={allowedStudentIds}
        basePath="/parent/tasks"
        initialCards={cards}
        initialStudents={students}
      />
    </div>
  );
}
