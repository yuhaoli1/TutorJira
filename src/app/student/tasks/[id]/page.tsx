import { requireRole } from "@/lib/auth/get-user";
import { TaskDetailPage } from "@/components/tasks/task-detail-page";

export default async function StudentTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["student"]);
  const { id } = await params;

  return <TaskDetailPage assignmentId={id} isTeacher={false} backPath="/student/tasks" />;
}
