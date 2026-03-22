"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ROLES } from "@/lib/constants";
import type { UserRole } from "@/lib/supabase/types";

const allowedRoles: { value: UserRole; label: string }[] = [
  { value: "parent", label: ROLES.parent },
  { value: "teacher", label: ROLES.teacher },
];

export default function SetupPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("parent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase.from("users").insert({
        id: user.id,
        phone: user.phone ?? user.email ?? "",
        name,
        role,
      });

      if (error) throw error;

      router.push(`/${role}/dashboard`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">完善信息</h1>
          <p className="mt-2 text-sm text-zinc-500">
            首次登录，请填写基本信息
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              姓名
            </label>
            <input
              type="text"
              placeholder="请输入姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700">
              我的身份
            </label>
            <div className="grid grid-cols-2 gap-3">
              {allowedRoles.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`rounded-lg border-2 px-4 py-3 text-base font-medium transition-colors ${
                    role === r.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="w-full py-3 text-base"
          >
            {loading ? "保存中..." : "开始使用"}
          </Button>
        </div>
      </div>
    </div>
  );
}
