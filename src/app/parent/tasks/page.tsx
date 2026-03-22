import { requireRole } from "@/lib/auth/get-user";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default async function ParentTasksPage() {
  await requireRole(["parent"]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-bold text-zinc-900">任务</h2>
      <p className="mt-1 mb-4 text-sm text-zinc-500">查看孩子的任务和成绩</p>
      <KanbanBoard isTeacher={false} />
    </div>
  );
}
