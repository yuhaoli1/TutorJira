import { requireRole } from "@/lib/auth/get-user";

export default async function QuestionsPage() {
  await requireRole(["admin", "teacher"]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900">题库</h2>
      <p className="mt-2 text-sm text-zinc-500">管理题目和知识点</p>
      <div className="mt-6 rounded-xl border bg-white p-8 text-center text-zinc-400">
        暂无题目
      </div>
    </div>
  );
}
