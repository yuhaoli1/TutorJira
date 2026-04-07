import { requireRole } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { WrongBookList } from "@/components/practice/wrong-book-list";

export default async function WrongBookPage() {
  const user = await requireRole(["student"]);
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-[#2E3338] tracking-tight">Wrong answers</h2>
      <p className="mt-1 mb-6 text-sm text-[#B4BCC8]">Review and retry questions you missed</p>
      <WrongBookList studentId={student?.id || ""} />
    </div>
  );
}
