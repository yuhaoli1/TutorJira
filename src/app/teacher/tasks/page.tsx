import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { fetchBoardData } from "@/lib/fetch-board-data";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default async function TasksPage() {
  await requireRole(["admin", "teacher"]);
  const supabase = await createClient();

  // Server-side prefetch board data so first paint has it
  const { cards, students } = await fetchBoardData(supabase);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">Tasks</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">
        Manage student tasks and record quiz results
      </p>
      <KanbanBoard
        isTeacher={true}
        basePath="/teacher/tasks"
        initialCards={cards}
        initialStudents={students}
      />
    </div>
  );
}
