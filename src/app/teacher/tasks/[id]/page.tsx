import { requireRole } from "@/lib/auth/get-user";
import { TaskDetailPage } from "@/components/tasks/task-detail-page";

export default async function TeacherTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin", "teacher"]);
  const { id } = await params;

  return <TaskDetailPage assignmentId={id} isTeacher={true} backPath="/teacher/tasks" />;
}
