import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { maybeSeedSampleData } from "@/lib/seed";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Seed new users with realistic sample data so the dashboard feels complete on first visit.
  await maybeSeedSampleData();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName: string =
    (profile?.display_name as string | null) ??
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "you";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <Sidebar email={user.email ?? "you"} displayName={displayName} />
      <div className="flex-1 min-w-0">{children}</div>
      <KeyboardShortcuts />
    </div>
  );
}
