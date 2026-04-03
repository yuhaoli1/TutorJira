import { requireRole } from "@/lib/auth/get-user";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export default async function TasksPage() {
  await requireRole(["admin", "teacher"]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">任务管理</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">
        管理学生任务和录入抽测成绩
      </p>
      <KanbanBoard isTeacher={true} basePath="/teacher/tasks" />
    </div>
  );
}
