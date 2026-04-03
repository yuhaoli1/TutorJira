import { requireRole } from "@/lib/auth/get-user";
import { TaskDetailPage } from "@/components/tasks/task-detail-page";

export default async function ParentTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["parent"]);
  const { id } = await params;

  return <TaskDetailPage assignmentId={id} isTeacher={false} backPath="/parent/tasks" />;
}
