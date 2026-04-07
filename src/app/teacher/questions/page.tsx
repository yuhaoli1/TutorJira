import { requireRole } from "@/lib/auth/get-user";
import { QuestionsHub } from "@/components/questions/questions-hub";

export default async function QuestionsPage() {
  await requireRole(["admin", "teacher"]);

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">Question library</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">
        Manage questions, upload worksheets, and organize topics
      </p>
      <QuestionsHub />
    </div>
  );
}
