import { requireRole } from "@/lib/auth/get-user";

export default async function QuestionsPage() {
  await requireRole(["admin", "teacher"]);

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">题库</h2>
      <p className="mt-2 text-sm text-[#B4BCC8]">管理题目和知识点</p>
      <div className="mt-8 rounded-2xl border border-[#E8EAED] bg-white p-10 text-center text-[#B4BCC8]">
        暂无题目
      </div>
    </div>
  );
}
