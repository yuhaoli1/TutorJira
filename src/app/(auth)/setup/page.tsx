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
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F6] px-4">
      <div className="w-full max-w-sm space-y-8 rounded-2xl bg-white p-8 border border-[#E8EAED]">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">Finish setting up</h1>
          <p className="mt-2 text-sm text-[#B4BCC8]">
            Tell us a bit about yourself to get started.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#4D5766]">
              Full name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-[#B4BCC8] px-4 py-3 text-base text-[#2E3338] outline-none focus:border-[#163300] focus:ring-2 focus:ring-[#163300]/15 transition-colors duration-150"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#4D5766]">
              I am a
            </label>
            <div className="grid grid-cols-2 gap-3">
              {allowedRoles.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`rounded-2xl border-2 px-4 py-3 text-base font-medium transition-colors duration-150 ${
                    role === r.value
                      ? "border-[#163300] bg-[#163300]/5 text-[#163300]"
                      : "border-[#E8EAED] text-[#4D5766] hover:border-[#B4BCC8]"
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
            {loading ? "Saving..." : "Get started"}
          </Button>
        </div>
      </div>
    </div>
  );
}
