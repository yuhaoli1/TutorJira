import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { fetchBoardData } from "@/lib/fetch-board-data";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default async function StudentTasksPage() {
  const user = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const allowedStudentIds = student ? [student.id] : [];

  // Server-side prefetch
  const { cards, students } = await fetchBoardData(supabase, { allowedStudentIds });

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">My tasks</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">View and submit your tasks</p>
      <KanbanBoard
        isTeacher={false}
        allowedStudentIds={allowedStudentIds}
        hideStudentFilter
        basePath="/student/tasks"
        initialCards={cards}
        initialStudents={students}
      />
    </div>
  );
}
