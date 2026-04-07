import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Exchange succeeded — check whether the user has a profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id, role")
          .eq("id", user.id)
          .single();

        if (!profile) {
          return NextResponse.redirect(`${origin}/setup`);
        }
        const defaultPage =
          profile.role === "parent" || profile.role === "student"
            ? `/${profile.role}/tasks`
            : `/${profile.role}/dashboard`;
        return NextResponse.redirect(`${origin}${defaultPage}`);
      }
    }
  }

  // Fall back to the login page on error
  return NextResponse.redirect(`${origin}/login`);
}
