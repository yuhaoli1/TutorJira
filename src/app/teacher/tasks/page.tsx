import { requireRole } from "@/lib/auth/get-user";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default async function TasksPage() {
  await requireRole(["admin", "teacher"]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-bold text-zinc-900">任务管理</h2>
      <p className="mt-1 mb-4 text-sm text-zinc-500">
        管理学生任务和录入抽测成绩
      </p>
      <KanbanBoard isTeacher={true} />
    </div>
  );
}
