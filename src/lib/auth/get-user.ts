import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/lib/supabase/types";

export interface UserProfile {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUser(): Promise<UserProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return profile as UserProfile;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  const user = await getUser();

  if (!allowedRoles.includes(user.role)) {
    redirect(`/${user.role}/dashboard`);
  }

  return user;
}
