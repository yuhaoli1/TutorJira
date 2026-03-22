import { requireRole } from "@/lib/auth/get-user";

export default async function CheckinsPage() {
  await requireRole(["admin", "teacher"]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-zinc-900">打卡管理</h2>
      <p className="mt-2 text-sm text-zinc-500">查看学生每日打卡情况</p>
      <div className="mt-6 rounded-xl border bg-white p-8 text-center text-zinc-400">
        暂无打卡记录
      </div>
    </div>
  );
}
