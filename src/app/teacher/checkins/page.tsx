import { requireRole } from "@/lib/auth/get-user";

export default async function CheckinsPage() {
  await requireRole(["admin", "teacher"]);

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">打卡管理</h2>
      <p className="mt-2 text-sm text-[#B4BCC8]">查看学生每日打卡情况</p>
      <div className="mt-8 rounded-2xl border border-[#E8EAED] bg-white p-10 text-center text-[#B4BCC8]">
        暂无打卡记录
      </div>
    </div>
  );
}
